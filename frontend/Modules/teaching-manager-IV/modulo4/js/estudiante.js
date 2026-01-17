
function showSection(sectionId) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
        if(link.getAttribute('onclick').includes(sectionId)) link.classList.add('active');
    });
    // If navigating to asistencia, refresh the attendance panel
    try{ if(sectionId === 'asistencia' && typeof renderAsistencia === 'function') renderAsistencia(); }catch(e){ /* ignore */ }
}

    // Normalize server date strings like 'YYYY-MM-DD HH:mm:ss' to a reliably parseable Date
    function parseServerDate(s){
        if(!s) return null;
        if(typeof s === 'string'){
            if(s.includes(' ') && !s.includes('T')) s = s.replace(' ', 'T');
            return new Date(s);
        }
        return new Date(s);
    }

// Exponer funciones usadas por atributos onclick (si el script se carga como module los onclick pierden scope)
Object.assign(window, {
    showSection,
    subirTarea,
    eliminarMiEntrega,
    markPresentStudent,
    renderTareasPendientes,
    renderAsistencia,
    renderReportes,
    renderCalendarioVisual,
    renderRecentActivities,
    startPollingStudentUpdates,
    hideDeliveredTask,
    openActivityFromCalendar,
    openAttendanceFromCalendar,
    openCoursePanel
});

document.addEventListener('DOMContentLoaded', async () => {
    // Mostrar nombre del usuario desde `currentUserEstudiante` en la cabecera
    try{ const label = document.getElementById('user-name-label'); if(label) label.textContent = currentUserEstudiante.name || 'Estudiante'; }catch(e){/* ignore */}

    // Pre-check backend health to avoid multiple fetch errors when server is down
    const healthy = await window.checkBackendHealth(2000);
    if(!healthy){
        window._backend_offline = true;
        window._backend_offline_notified = true; // mark notified, but no UI is shown
        console.warn('Backend health check failed: server unreachable; suppressing visible error messages. Check console for details.');
        return;
    }

    // Backend healthy: proceed with usual rendering
    renderCalendarioVisual();
    renderCursos();
    renderTareasPendientes();
    renderAsistencia();
    renderReportes();
    startPollingStudentUpdates();
    initNotificationsStream();
});

// Polling ligero para mantener sincronía con cambios del profesor (cada 30s)
function startPollingStudentUpdates(){
    const interval = 30 * 1000; // 30s
    setInterval(async () => {
        if(document.hidden) return; // no hacer cuando pestaña no visible
        try{
            await renderTareasPendientes();
            await renderCalendarioVisual();
            await renderAsistencia();
            await renderRecentActivities();
            await renderReportes();
        }catch(e){ /* ignore polling errors */ }
    }, interval);
}

// Notifications: SSE client to receive server pushes for assignments/attendance
function initNotificationsStream(){
    // Avoid attempting SSE if environment doesn't support EventSource (e.g., headless test env)
    if(typeof EventSource === 'undefined'){
        console.warn('EventSource not available; SSE disabled in this environment');
        return;
    }

    // health-check helper (uses base API root)
    const healthUrl = API_BASE.replace(/\/api$/, '') + '/_health';
    const wait = (ms) => new Promise(r => setTimeout(r, ms));

    const connectWithBackoff = async () => {
        let attempts = 0;
        const delays = [2000, 5000, 10000, 20000];
        while(true){
            try{
                // quick health check before opening SSE
                let ok = false;
                try{
                    const h = await fetch(healthUrl, { method: 'GET' });
                    ok = h && h.ok;
                }catch(e){ ok = false; }
                if(!ok){
                    // Do not show UI; log only and retry with backoff
                    console.warn('Backend offline: health check failed; will retry with backoff.');
                    const d = delays[Math.min(attempts, delays.length-1)];
                    console.warn(`Backend health check failed, reintentar en ${d}ms (intento ${attempts+1}).`);
                    await wait(d);
                    attempts++;
                    continue;
                }

                const url = `${API_BASE}/notifications/stream?user_id=${currentUserEstudiante.id}`;
                const es = new EventSource(url);
                console.log('EventSource: conexión establecida a', url);
                window._sse = es;

                const safeParse = (s) => { try{ return JSON.parse(s); }catch(e){ return null; } };

                es.addEventListener('assignment_created', async (ev) => {
                    const data = safeParse(ev.data);
                    try{ await showMessageModal('Nueva asignación','Se creó una nueva asignación.'); }catch(e){}
                    renderTareasPendientes(); renderCalendarioVisual();
                });
                es.addEventListener('activity_created', async (ev) => {
                    const data = safeParse(ev.data);
                    try{ await showMessageModal('Nueva actividad','Se agregó una nueva actividad a una asignación.'); }catch(e){}
                    renderTareasPendientes(); renderRecentActivities(); renderCalendarioVisual();
                });
                es.addEventListener('attendance_created', async (ev) => {
                    const data = safeParse(ev.data);
                    try{ await showMessageModal('Asistencia','Se creó una nueva sesión de asistencia.'); }catch(e){}
                    renderCalendarioVisual(); renderAsistencia();
                });

                es.onerror = (err) => {
                    console.warn('EventSource error, cerrando conexión y reintentar en 5s', err);
                    try{ es.close(); }catch(e){}
                    console.warn('EventSource: treating backend as offline (UI suppressed).');
                    setTimeout(connectWithBackoff, 5000);
                };

                // connected successfully, break out of loop
                break;
            }catch(e){
                const d = delays[Math.min(attempts, delays.length-1)];
                console.warn(`Error conectando SSE, reintentar en ${d}ms:`, e);
                await wait(d);
                attempts++;
            }
        }
    };

    // Start connect loop
    connectWithBackoff();
    // allow manual re-init from console for debugging
    window.initNotificationsStream = initNotificationsStream;
}

// 1. Calendario Visual (Mes Actual)
async function renderCalendarioVisual() {
    const calendarGrid = document.getElementById('calendario-grid-visual');
    const monthTitle = document.getElementById('calendario-mes-titulo');

    // Mostrar mes actual (dinámico)
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    monthTitle.textContent = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    let html = '';

    // Espacios vacíos antes del día 1
    for(let i=0; i<firstDayIndex; i++) {
        html += `<div class="calendar-day" style="background:#f9f9f9;"></div>`;
    }

    // Obtener actividades y sesiones relevantes para el estudiante
    let activities = [];
    let attendanceRecords = [];
    try{
        const asgData = await apiFetch(`/assignments/student/${currentUserEstudiante.id}/assignments`);
        const assignments = asgData.assignments || [];
        for(const a of assignments){
            // traer actividades por asignación
            try{
                const actData = await apiFetch(`/assignments/assignment/${a.assignment_id}/activities`);
                const acts = actData.activities || [];
                acts.forEach(act => activities.push({ ...act, subject_name: a.subject_name, assignment_id: a.assignment_id }));
            }catch(e){ /* ignore per-assignment errors */ }
        }
        // sesiones/registro de asistencia del estudiante
        const att = await apiFetch(`/attendance/students/${currentUserEstudiante.id}/report`);
        attendanceRecords = att.records || [];
    }catch(err){
        console.warn('Error cargando datos para el calendario:', err);
        activities = activities || [];
        attendanceRecords = attendanceRecords || [];
    }

    for(let day=1; day<=daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const dayStr = `${year}-${(month+1).toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`;
        let eventsHtml = '';

        // Actividades (vence ese día)
        const tareasDia = activities.filter(a => a.due_date && a.due_date.startsWith(dayStr));
        tareasDia.forEach(t => {
            const submitted = false; // determinate in recent list; keep simple here
            eventsHtml += `<div class="day-has-task" title="${t.title}" onclick="openActivityFromCalendar(${t.activity_id})">📌 ${t.subject_name || ''}: ${t.title}</div>`;
        });

        // Sesiones de asistencia que ocurren o abren ese día
        const sesionesDia = attendanceRecords.filter(s => {
            // si open_date está presente, checar rango (incluir días entre open y close)
            if(s.open_date && s.close_date){
                const open = parseServerDate(s.open_date);
                const close = parseServerDate(s.close_date);
                return dateObj >= new Date(open.getFullYear(), open.getMonth(), open.getDate()) && dateObj <= new Date(close.getFullYear(), close.getMonth(), close.getDate());
            }
            // fallback: si no hay open/close intentar comparar con marked_at (no ideal)
            return false;
        });

        sesionesDia.forEach(s => {
            const open = s.open_date ? parseServerDate(s.open_date) : null;
            const close = s.close_date ? parseServerDate(s.close_date) : null;
            const now = new Date();
            const isActive = open && close && now >= open && now <= close && s.status !== 'present';
            const label = `🎯 Asistencia Semana ${s.week_number || ''}`;
            eventsHtml += `<div class="day-has-session" title="${label}" onclick="openAttendanceFromCalendar(${s.session_id})">${label}`;
            if(isActive) eventsHtml += ` <button class="btn tiny" onclick="event.stopPropagation(); markPresentStudent(${s.session_id})">Marcar</button>`;
            eventsHtml += `</div>`;
        });

        html += `
            <div class="calendar-day">
                <span class="day-number">${day}</span>
                ${eventsHtml}
            </div>
        `;
    }

    calendarGrid.innerHTML = html;

    // También poblar las actividades recientes para el panel al lado
    renderRecentActivities();
}

/*
 *  Actividades Recientes
 *  Muestra hasta 5 actividades recientes (por fecha de vencimiento) y si el estudiante ya las entregó
 */
async function renderRecentActivities(){
    const container = document.getElementById('recent-activities-list');
    container.innerHTML = '';
    try{
        // actividades relacionadas al estudiante
        const asgData = await apiFetch(`/assignments/student/${currentUserEstudiante.id}/assignments`);
        const assignments = asgData.assignments || [];
        const activities = [];
        for(const a of assignments){
            try{
                const actData = await apiFetch(`/assignments/assignment/${a.assignment_id}/activities`);
                const acts = actData.activities || [];
                acts.forEach(act => activities.push({ ...act, subject_name: a.subject_name, assignment_id: a.assignment_id }));
            }catch(e){ /* ignore */ }
        }
        // obtener entregas del estudiante para marcar estado
        const subsData = await apiFetch(`/assignments/student/${currentUserEstudiante.id}/submissions`);
        const subs = subsData.submissions || [];
        const subsMap = subs.reduce((acc,s) => { acc[s.activity_id] = s; return acc; }, {});

        if(activities.length === 0){
            container.innerHTML = '<p>No hay actividades recientes.</p>';
            return;
        }

        // ordenar por due_date descendente (más recientes primero)
        const sorted = activities.sort((a,b) => (b.due_date || '').localeCompare(a.due_date || '')).slice(0,5);
        const html = sorted.map(a => {
            const sub = subsMap[a.activity_id];
            const status = sub ? `<span class="status-badge status-graded">Entregada</span>` : `<span class="status-badge status-pending">Pendiente</span>`;
            const due = a.due_date ? new Date(a.due_date).toLocaleString() : 'Sin fecha';
            let submittedLink = '';
            if(sub){
                const lateNote = sub.is_late ? '<span style="color:#C52B3D; font-weight:bold;">Tardía</span>' : 'A tiempo';
                submittedLink = '<div style="font-size:0.9rem; margin-top:6px;"><a href="' + (sub.file_path || '#') + '" target="_blank">Ver entrega</a> — ' + lateNote + '</div>';
            }
            return `<div style="padding:8px 0; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;"><div><strong>${a.title}</strong> <div style="font-size:0.9rem; color:#666;">${a.subject_name || ''} — Vence: ${due}</div>${status}${submittedLink}</div><div><button class="btn tiny" onclick="openActivityFromCalendar(${a.activity_id})">Ir a tarea</button></div></div>`;
        }).join('');
        container.innerHTML = html;
    }catch(e){
        console.error('Error cargando actividades recientes:', e);
        // UI suppressed for backend errors; check console for details
        container.innerHTML = '';
    }
}

// 2. Mis Cursos
async function renderCursos() {
    const container = document.getElementById('grid-cursos-estudiante');
    container.innerHTML = '';
    try{
        const data = await apiFetch(`/assignments/student/${currentUserEstudiante.id}/assignments`);
        const assignments = data.assignments || [];
        if(assignments.length === 0){
            container.innerHTML = '<div class="card"><p>No estás inscrito en asignaciones.</p></div>';
            return;
        }
        container.innerHTML = assignments.map(c => `
            <div class="card" onclick="openCoursePanel(${c.assignment_id})" style="cursor:pointer">
                <div style="height:100px; background-color:#eee; display:flex; align-items:center; justify-content:center; border-radius:8px; margin-bottom:10px;">
                    <i class="fas fa-book fa-3x" style="color:var(--color-identity-blue)"></i>
                </div>
                <h3>${c.subject_name}</h3>
                <p>Sección: ${c.section_name}</p>
            </div>
        `).join('');
    }catch(err){
        console.error('Error al cargar cursos del estudiante:', err);
        // UI suppressed to avoid exposing DB status; keep container empty
        container.innerHTML = '';
    }
}

// 3. Tareas Pendientes y Subida (desde backend)
async function renderTareasPendientes() {
    const containerPending = document.getElementById('lista-tareas-pendientes');
    const containerDelivered = document.getElementById('lista-tareas-entregadas');

    containerPending.innerHTML = '';
    containerDelivered.innerHTML = '';
    try{
        // Obtener asignaciones y actividades
        const asgData = await apiFetch(`/assignments/student/${currentUserEstudiante.id}/assignments`);
        const assignments = asgData.assignments || [];
        if(assignments.length === 0){ containerPending.innerHTML = '<div class="card"><p>Sin Tareas</p></div>'; return; }

        const activities = [];
        // Entregas existentes del estudiante
        const mySubsData = await apiFetch(`/assignments/student/${currentUserEstudiante.id}/submissions`);
        const mySubs = (mySubsData.submissions || []).reduce((acc, s) => { acc[s.activity_id] = s; return acc; }, {});

        for(const a of assignments){
            const actData = await apiFetch(`/assignments/assignment/${a.assignment_id}/activities`);
            const acts = actData.activities || [];
            acts.forEach(act => activities.push({ ...act, subject_name: a.subject_name, assignment_id: a.assignment_id }));
        }

        if(activities.length === 0){ containerPending.innerHTML = '<div class="card"><p>Sin Tareas</p></div>'; return; }

        // Split pending vs delivered
        const pending = activities.filter(a => !mySubs[a.activity_id]);
        const delivered = activities.filter(a => mySubs[a.activity_id]);

        // Render pending (same layout as before)
        if(pending.length === 0){
            containerPending.innerHTML = '<div class="card"><p>Sin Tareas Pendientes</p></div>';
        }else{
            containerPending.innerHTML = pending.map(a => {
                const existing = mySubs[a.activity_id];
                let submittedInfo = '';
                if(existing){
                    const lateNote = existing.is_late ? '<span style="color:#C52B3D; font-weight:bold;">Tardía</span>' : 'A tiempo';
                    submittedInfo = '<div style="margin-top:8px; font-size:0.9rem; color:green;">Entrega previa: <a href="' + (existing.file_path || '') + '" target="_blank">Ver Archivo</a> — ' + lateNote + '</div>';
                }
                const btnLabel = existing ? 'Actualizar Entrega' : 'Enviar Entrega';
                return `
                <div class="card" style="margin-bottom:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <span class="status-badge status-pending">Pendiente</span>
                            <h3 style="margin-top:10px;">${a.title}</h3>
                            <p style="color:gray;">${a.subject_name || ''} | Vence: ${a.due_date ? new Date(a.due_date).toLocaleDateString() : '-'}</p>
                            <p style="margin: 10px 0;">${a.description || ''}</p>
                            <ul style="font-size:0.9rem; color:#555; margin-left:20px;">
                                <li>Formatos: PDF, Word, PPT, IMG, TXT</li>
                                <li>Max: 10 MB</li>
                            </ul>
                            ${submittedInfo}
                        </div>
                    </div>
                    <hr style="margin:15px 0; border:0; border-top:1px solid #eee;">
                    <div class="upload-area">
                        <label>Archivo a entregar:</label>
                        <div style="display:flex; gap:10px; margin-top:5px;">
                            ${ (a.due_date && (new Date(a.due_date) < new Date())) ? `
                                <div style="color:#C52B3D; font-weight:bold;">La fecha límite ya pasó. No se permiten envíos ni modificaciones.</div>
                            ` : `
                                <input type="file" id="file-${a.activity_id}" class="form-control" ${existing ? `data-submission-id="${existing.submission_id}"` : ''}>
                                <div style="display:flex; gap:8px; align-items:center;">
                                    <button id="btn-submit-${a.activity_id}" onclick="subirTarea(${a.activity_id})" class="btn btn-primary"><i class="fas fa-upload"></i> ${btnLabel}</button>
                                    ${existing ? `<button class="btn btn-danger" onclick="eliminarMiEntrega(${existing.submission_id}, ${a.activity_id})">Eliminar Entrega</button>` : ''}
                                </div>
                            `}
                        </div>
                        <p id="msg-${a.activity_id}" class="validation-msg"></p>
                    </div>
                </div>
                `;
            }).join('');
        }

        // Render delivered list (compact) with hide button
        if(delivered.length === 0){
            containerDelivered.innerHTML = '<div class="card"><p>No has entregado tareas aún.</p></div>';
        }else{
            containerDelivered.innerHTML = delivered.map(a => {
                const s = mySubs[a.activity_id];
                const lateNote = (s && s.is_late) ? '<span style="color:#C52B3D; font-weight:bold; margin-left:8px;">(Tardía)</span>' : '';
                const submittedUrl = s ? (s.file_path || '#') : '#';
                const submittedAt = s && s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '—';
                return `
                <div id="delivered-${a.activity_id}" class="card" style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="flex:1;">
                        <strong>${a.title}</strong>
                        <div style="font-size:0.9rem; color:#666;">${a.subject_name || ''} — Entregado: ${submittedAt}</div>
                        <div style="font-size:0.9rem; margin-top:6px;"><a href="${submittedUrl}" target="_blank">Ver entrega</a> ${lateNote}</div>
                    </div>
                    <div style="margin-left:12px;">
                        <button class="btn" onclick="hideDeliveredTask(${a.activity_id})">Ocultar</button>
                    </div>
                </div>
                `;
            }).join('');
        }

    }catch(err){
        console.error('Error al cargar tareas:', err);
        containerPending.innerHTML = '';
        containerDelivered.innerHTML = '';
    }

}

async function openCoursePanel(assignmentId){
    try{
        const [asgRes, resRes] = await Promise.all([
            apiFetch(`/assignments/${assignmentId}`),
            apiFetch(`/course-resources/resources/assignment/${assignmentId}`)
        ]);
        const assignment = asgRes.assignment || {};
        const resources = (resRes.resources || []).filter(r => r.is_visible);

        const overlay = document.createElement('div'); overlay.style.position='fixed'; overlay.style.inset='0'; overlay.style.zIndex=10000; overlay.style.background='rgba(0,0,0,0.35)'; overlay.style.display='flex'; overlay.style.alignItems='center'; overlay.style.justifyContent='center';
        const box = document.createElement('div'); box.style.background='white'; box.style.padding='18px'; box.style.borderRadius='10px'; box.style.width='720px'; box.style.maxWidth='95%'; box.style.maxHeight='80vh'; box.style.overflowY='auto';
        box.innerHTML = `<h2>${assignment.subject_name || ''} — Sección ${assignment.section_name || assignment.section_id || ''}</h2><p style='color:#666;'>Recursos compartidos por el profesor. Haz clic para abrir.</p>`;

        const list = document.createElement('div'); list.style.marginTop='12px';
        if(resources.length === 0){ list.innerHTML = '<p>No hay recursos disponibles.</p>'; }
        resources.forEach(r => {
            const item = document.createElement('div'); item.style.padding='10px 0'; item.style.borderBottom='1px solid #eee';
            const title = document.createElement('div'); title.innerHTML = `<strong>${r.title || 'Sin título'}</strong>`;
            const meta = document.createElement('div'); meta.style.fontSize='0.9rem'; meta.style.color='#666';
            const url = r.file_path_or_url || '';
            let linkHtml = '';
            if(url){
                linkHtml = ` — <a href="${url}" target="_blank" rel="noopener">Ver</a>`;
            }
            meta.innerHTML = `${r.resource_type || ''} ${url ? linkHtml : ''} <span style="margin-left:10px; color:#999; font-size:0.8rem;">${r.uploaded_at ? new Date(r.uploaded_at).toLocaleString() : ''}</span>`;
            item.appendChild(title); item.appendChild(meta);
            list.appendChild(item);
        });
        box.appendChild(list);

        const close = document.createElement('button'); close.className='btn'; close.style.marginTop='12px'; close.textContent='Cerrar'; close.onclick = () => document.body.removeChild(overlay);
        box.appendChild(close);
        overlay.appendChild(box); document.body.appendChild(overlay);
    }catch(e){ console.error('Error abriendo panel del curso', e); showMessageModal && showMessageModal('Error','No fue posible cargar recursos del curso.'); }
}
async function subirTarea(activityId) {
    const fileInput = document.getElementById(`file-${activityId}`);
    const msg = document.getElementById(`msg-${activityId}`);
    
    if(fileInput.files.length === 0) {
        msg.textContent = "Por favor seleccione un archivo.";
        msg.style.display = "block";
        return;
    }

    const file = fileInput.files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    // EXTENSIONES PERMITIDAS ACTUALIZADAS
    const allowedExtensions = ['pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'zip'];
    const fileExt = file.name.split('.').pop().toLowerCase();

    if(file.size > maxSize) {
        msg.textContent = "Error: El archivo supera los 10MB.";
        msg.style.display = "block";
        return;
    }

    if(!allowedExtensions.includes(fileExt)) {
        msg.textContent = "Formato No Permitido. (Use PDF, Word, PowerPoint, Imagen, ZIP o TXT)";
        msg.style.display = "block";
        return;
    }

    // Envío al backend
    const form = new FormData();
    form.append('file', file);
    form.append('activity_id', activityId);
    form.append('student_user_id', currentUserEstudiante.id);

    try{
        const existingSubmissionId = fileInput.dataset.submissionId;
        let data;
        if(existingSubmissionId){
            // Actualizar la entrega existente
            data = await apiFetch(`/assignments/submissions/${existingSubmissionId}`, { method: 'PUT', body: form });
        }else{
            data = await apiFetch(`/assignments/submissions`, { method: 'POST', body: form });
        }
        msg.style.color = 'green';
        msg.textContent = 'Entrega enviada correctamente.';
        msg.style.display = 'block';
        // Guardar el id de la entrega para permitir actualizaciones posteriores
        if(data.submission && data.submission.submission_id){
            fileInput.dataset.submissionId = String(data.submission.submission_id);
            const btn = fileInput.parentElement.querySelector('button');
            if(btn) btn.textContent = 'Actualizar Entrega';
        }
        await showMessageModal('Listo','Entrega enviada correctamente.');
        // Actualizar reportes
        renderReportes();
    }catch(err){
        console.error('Error al subir entrega:', err);
        // Try to extract server-provided JSON error message
        let msgText = (err && err.message) ? err.message : 'Error al subir la entrega.';
        try{ const idx = msgText.indexOf('{'); if(idx !== -1){ const o = JSON.parse(msgText.slice(idx)); msgText = o.error || o.message || JSON.stringify(o); } }catch(e){}
        msg.style.color = 'red';
        msg.textContent = msgText;
        msg.style.display = 'block';
        await showMessageModal('Error', msgText);
    }
}

// 4. Asistencia
async function renderAsistencia() {
    const container = document.getElementById('panel-asistencia');
    container.innerHTML = '';
    try{
        const res = await apiFetch(`/attendance/students/${currentUserEstudiante.id}/report`);
        const records = res.records || [];
        // Mostrar solo sesiones activas que aún no han sido marcadas como 'present'
        const now = new Date();
        // Use global parseServerDate helper for server date strings

        // Consider sessions pending if they are not already marked 'present' and their close_date is in the future (or absent).
        // This ensures newly created sessions (or sessions that open soon) are visible to the student instead of hiding them.
        const pending = records.filter(r => {
            const open = r.open_date ? parseServerDate(r.open_date) : null;
            const close = r.close_date ? parseServerDate(r.close_date) : null;
            const notExpired = !close || now <= close;
            const notPresent = r.status !== 'present';
            return notExpired && notPresent;
        });
        if(pending.length === 0){
            container.innerHTML = `
                <div class="card">
                    <h3>Asistencia</h3>
                    <p>No tienes asistencias sin marcar.</p>
                </div>
            `;
            return;
        }
        // Mostramos solo las sesiones pendientes para marcar
        const items = pending.map(r => {
            const open = r.open_date ? parseServerDate(r.open_date) : null;
            const close = r.close_date ? parseServerDate(r.close_date) : null;
            const isOpen = !open || now >= open;
            const isWithin = (!open || now >= open) && (!close || now <= close);
            // (no debug logs)
            const label = `${open ? (open.toLocaleString() + ' → ' + (close ? close.toLocaleString() : '-')) : (close ? ('hasta ' + close.toLocaleString()) : '-')}`;
            const statusText = r.status === 'present' ? 'Presente' : 'No registrado';
            const statusColor = r.status === 'present' ? 'green' : 'red';
            // Always render an active Mark button (data-session-id + onclick) so students can mark regardless of open/close window
            const btn = `<button class="btn btn-primary" data-session-id="${r.session_id}" onclick="markPresentStudent(${r.session_id})">Marcar Presente</button>`;
            return `
                <div id="card-asis-${r.session_id}" class="card" style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                    <div>
                        <strong>${r.frequency === 'daily' ? 'Diaria' : 'Semana ' + (r.week_number || '-')}</strong>
                        <div style="font-size:0.9rem; color:#666;">${label}</div>
                        <div style="margin-top:6px;">Estado: <strong style="color:${statusColor}">${statusText}</strong></div>
                    </div>
                    <div>
                        ${btn}
                    </div>
                </div>
            `;
        }).join('');
        container.innerHTML = items;
        // Attach a delegated click handler once to the attendance container so buttons reliably trigger
        try{
                if(!container._hasAttendanceHandler){
                    container.addEventListener('click', (ev) => {
                        // Prefer explicit data attribute on the button, but fallback to parsing the card id `card-asis-<id>`
                        const clickedBtn = ev.target && ev.target.closest ? ev.target.closest('button') : null;
                        if(!clickedBtn) return;
                        let sid = clickedBtn.getAttribute && clickedBtn.getAttribute('data-session-id');
                        if(!sid){
                            const card = ev.target && ev.target.closest ? ev.target.closest('[id^="card-asis-"]') : null;
                            if(card && card.id){
                                const m = card.id.match(/card-asis-(\d+)/);
                                if(m) sid = m[1];
                            }
                        }
                        if(!sid) return;
                        ev.preventDefault();
                        try{ markPresentStudent(Number(sid)); }catch(e){ /* ignore */ }
                    });
                    container._hasAttendanceHandler = true;
                }
        }catch(e){ console.warn('Could not attach delegated handler for attendance buttons', e); }

        // Global fallback: capturing listener to detect clicks that should mark attendance
        if(!window._attendance_global_marker){
            document.addEventListener('click', function(ev){
                try{
                    const t = ev.target;
                    const txt = (t && t.textContent) ? t.textContent.trim() : '';
                    if(!txt.includes('Marcar Presente')) return; // ignore unrelated clicks
                    const card = t.closest ? t.closest('[id^="card-asis-"]') : null;
                    if(card && card.id){
                        const m = card.id.match(/card-asis-(\d+)/);
                        if(m){
                            const sid = Number(m[1]);
                            ev.preventDefault();
                            try{ markPresentStudent(sid); }catch(e){ /* ignore */ }
                        }
                    }
                }catch(e){ /* ignore */ }
            }, true); // use capture phase to catch early
            window._attendance_global_marker = true;
        }
    }catch(err){
        console.error('Error al obtener asistencia del estudiante:', err);
        container.innerHTML = '';
    }
}

function marcarPresente(sesionId) {
    const card = document.getElementById(`card-asis-${sesionId}`);
    card.innerHTML = `
        <h3>Asistencia Registrada</h3>
        <p>Has marcado presente exitosamente.</p>
        <button class="btn btn-success" disabled>PRESENTE <i class="fas fa-check"></i></button>
    `;
    card.style.borderLeftColor = "green";
}

// Marca presente (usado desde el HTML) — separando la lógica del render para evitar IIFE en atributos onclick
async function markPresentStudent(sessionId){
    const cardBtn = document.querySelector(`#card-asis-${sessionId} button`);
    const originalText = cardBtn ? cardBtn.textContent : null;
    if(cardBtn){ cardBtn.disabled = true; }

    // Optimistic UI: immediately show marked state to the student
    try{ marcarPresente(sessionId); }catch(e){ console.warn('Could not apply optimistic UI', e); }

    const url = `${API_BASE}/attendance/sessions/${sessionId}/mark`;
    try{
        const payload = { student_user_id: Number(currentUserEstudiante.id) };
        const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const text = await resp.text();
        let parsed = null;
        try{ parsed = text ? JSON.parse(text) : null; }catch(pe){ /* ignore parse */ }
        if(!resp.ok){
            // server rejected: refresh the list to show correct state and inform the user
            const serverMsg = (parsed && (parsed.error || parsed.message)) ? (parsed.error || parsed.message) : (`HTTP ${resp.status} - ${text}`);
            await showMessageModal('Error', serverMsg || 'No se pudo registrar la asistencia.');
            try{ await renderAsistencia(); }catch(e){}
            return;
        }
        // success: ensure professor gets notified via SSE (backend emits notification)
        try{ await showMessageModal('Listo','Asistencia registrada.'); }catch(e){}
        // keep optimistic UI; also refresh minimal data in background
        try{ renderAsistencia(); }catch(e){}
        return;
    }catch(err){
        console.error('Network error marking attendance:', err);
        await showMessageModal('Error','No se pudo conectar al servidor. Intente nuevamente.');
        try{ await renderAsistencia(); }catch(e){}
    }
}

// Helpers para abrir elementos desde el calendario
async function openActivityFromCalendar(activityId){
    try{
        showSection('tareas-pendientes');
        await renderTareasPendientes();
        const el = document.getElementById(`file-${activityId}`);
        if(el){ if(typeof el.scrollIntoView === 'function') el.scrollIntoView({behavior:'smooth', block:'center'}); el.parentElement.style.boxShadow = '0 4px 14px rgba(11,87,164,0.12)'; setTimeout(()=>{ el.parentElement.style.boxShadow = ''; }, 2200); }
    }catch(e){ console.warn('No fue posible abrir la actividad desde el calendario', e); }
}

async function openAttendanceFromCalendar(sessionId){
    try{
        showSection('asistencia');
        await renderAsistencia();
        const card = document.getElementById(`card-asis-${sessionId}`);
        if(card){ if(typeof card.scrollIntoView === 'function') card.scrollIntoView({behavior:'smooth', block:'center'}); card.style.boxShadow = '0 4px 14px rgba(11,87,164,0.12)'; setTimeout(()=>{ card.style.boxShadow = ''; }, 2200); }
    }catch(e){ console.warn('No fue posible abrir la sesión desde el calendario', e); }
}

// Permitir al estudiante eliminar su entrega (antes de la fecha límite)
async function eliminarMiEntrega(submissionId, activityId){
    const conf = await showInputModal('Confirmar eliminación', 'Escriba ELIMINAR para eliminar su entrega:', '', (v) => v === 'ELIMINAR' ? true : 'Escriba ELIMINAR para confirmar');
    if(conf !== 'ELIMINAR') return;
    try{
        const res = await apiFetch(`/assignments/submissions/${submissionId}`, { method: 'DELETE' });
        await showMessageModal('Listo','Entrega eliminada.');
        // limpiar input dataset y actualizar UI
        const el = document.getElementById(`file-${activityId}`);
        if(el){ delete el.dataset.submissionId; const btn = el.parentElement.querySelector('button'); if(btn) btn.textContent = 'Enviar Entrega'; }
        renderTareasPendientes();
        renderReportes();
    }catch(err){
        console.error('Error eliminando entrega:', err);
        let msg = (err && err.message) ? err.message : 'Error eliminando entrega.';
        try{ const i = msg.indexOf('{'); if(i !== -1){ const o = JSON.parse(msg.slice(i)); msg = o.error || o.message || JSON.stringify(o); } }catch(pe){}
        await showMessageModal('Error', msg);
    }
}

// Ocultar tarjeta de tarea entregada en el panel "Tareas Entregadas"
function hideDeliveredTask(activityId){
    try{
        const el = document.getElementById(`delivered-${activityId}`);
        if(el) el.style.display = 'none';
    }catch(e){ /* noop */ }
}

// Exponer funciones usadas por atributos onclick (si el script se carga como module los onclick pierden scope)
// (se asignan al final del archivo para evitar problemas con plantillas multilínea)

// 5. Reportes (Obtener entregas del estudiante desde backend)
async function renderReportes() {
    const tbody = document.getElementById('tabla-notas-estudiante');
    tbody.innerHTML = '';
    try{
        const data = await apiFetch(`/assignments/student/${currentUserEstudiante.id}/submissions`);
        const subs = data.submissions || [];
        if(subs.length === 0){
            tbody.innerHTML = '<tr><td colspan="5">No hay entregas registradas.</td></tr>';
            return;
        }
        tbody.innerHTML = subs.map(s => `
            <tr>
                <td>${s.subject_name || ''}</td>
                <td>${s.activity_title || ''}</td>
                <td>-</td>
                <td>-</td>
                <td><span class="status-badge ${s.is_late ? 'status-pending' : 'status-graded'}">${s.is_late ? 'Tardía' : 'Entregada'}</span></td>
            </tr>
        `).join('');
    }catch(err){
        console.error('Error al cargar reportes:', err);
        tbody.innerHTML = '';
    }
}
