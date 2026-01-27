document.addEventListener('DOMContentLoaded', () => {
  const API_ORIGIN = (window.__SIGRA_API_BASE || 'http://localhost:5200/api')
  const GRADES_BASE = `${API_ORIGIN}/grades-log`
  const ACTIVITIES_BASE = `${API_ORIGIN}/activities`
  const ASSIGNMENTS_BASE = `${API_ORIGIN}/assignments`

  const btnLoad = document.getElementById('btn-load')
  const btnAll = document.getElementById('btn-all')
  const subjectSelect = document.getElementById('select-subject-id')
  const tbody = document.getElementById('grades-body')

  // Create form elements
  const createActivitySelect = document.getElementById('create-activity-select')
  const createStudent = document.getElementById('create-student-select')
  const createScore = document.getElementById('create-score')
  const createFeedback = document.getElementById('create-feedback')
  const btnCreate = document.getElementById('btn-create')

  // Modal
  const modal = document.getElementById('modal-edit')
  const overlay = document.getElementById('modal-overlay')
  const modalClose = document.getElementById('modal-close')
  const modalSave = document.getElementById('modal-save')
  const modalStudent = document.getElementById('modal-student')
  const modalScore = document.getElementById('modal-score')
  const modalFeedback = document.getElementById('modal-feedback')

  let currentGrades = []
  let currentEditId = null

  function getGradeId(g){
    return g && (g.grade_id ?? g.id ?? g._id ?? g.gradeId ?? g._id_str ?? null)
  }

  function normalizeGrade(g){
    if(!g) return g
    const id = getGradeId(g)
    // Ensure a canonical `grade_id` property for internal logic
    if(id && String(g.grade_id) !== String(id)) g.grade_id = id
    return g
  }

  function showLoading(message = 'Cargando...') {
    tbody.innerHTML = `<tr><td colspan="5">${message}</td></tr>`
  }

  function renderGrades(list = []) {
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="5">No se encontraron registros.</td></tr>'
      return
    }
    const rows = list.map(g => {
      g = normalizeGrade(g)
      const student = g.student_name || `${g.student_user_id || 'N/D'}`
      const score = g.score ?? '-'
      const feedback = g.feedback ?? '-'
      const activity = g.title || g.activity || g.activity_id || '-'
      const idAttr = getGradeId(g) || ''
      return `
        <tr data-id="${idAttr}">
          <td>${student}</td>
          <td>${score}</td>
          <td>${feedback}</td>
          <td>${activity}</td>
          <td class="actions-cell">
            <button data-action="edit" data-id="${idAttr}" class="icon-link">Editar</button>
            <button data-action="delete" data-id="${idAttr}" class="icon-link danger">Eliminar</button>
          </td>
        </tr>
      `
    })
    tbody.innerHTML = rows.join('')
  }

  async function loadByActivity(activityId) {
    if (!activityId) return showLoading('ID de actividad inválido.')
    showLoading('Cargando registros de actividad...')
    try {
      const res = await fetch(`${GRADES_BASE}/activity/${activityId}`, { headers: { ...getAuthHeaders() } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || 'Error al obtener registros')
      currentGrades = (data.grades || []).map(normalizeGrade)
      renderGrades(currentGrades)
    } catch (err) {
      showLoading(err.message)
      console.error(err)
    }
  }

  async function loadByActivityAndSubject(activityId, subjectId) {
    if (!activityId || !subjectId) return showLoading('IDs inválidos.')
    showLoading('Cargando registros por actividad y materia...')
    try {
      const res = await fetch(`${GRADES_BASE}/activity/${activityId}/subject/${subjectId}`, { headers: { ...getAuthHeaders() } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || 'Error')
      currentGrades = (data.grades || []).map(normalizeGrade)
      renderGrades(currentGrades)
    } catch (err) {
      showLoading(err.message)
      console.error(err)
    }
  }

  // Obtener actividades por assignment (materia del profesor) y luego cargar todas las calificaciones
  async function loadActivitiesByAssignment(assignmentId) {
    if (!assignmentId) return showLoading('Seleccione una asignación válida.')
    showLoading('Cargando actividades de la asignación...')
    try {
      const res = await fetch(`${ASSIGNMENTS_BASE}/assignment/${assignmentId}/activities`, { headers: { ...getAuthHeaders() } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || 'Error al obtener actividades')
      const activities = data.activities || []
      // poblar select de creación
      createActivitySelect.innerHTML = '<option value="">-- Seleccione actividad --</option>'
      activities.forEach(a => {
        const opt = document.createElement('option')
        opt.value = a.activity_id || a.id || ''
        opt.textContent = a.title || a.activity_id || 'Actividad'
        createActivitySelect.appendChild(opt)
      })
      // cargar la lista de estudiantes asociados a esta asignación (si está disponible)
      try{
        await loadStudentsByAssignment(assignmentId)
      }catch(e){
        console.warn('No se cargaron estudiantes para la asignación:', e)
      }
      // Para cada actividad obtener calificaciones y combinarlas
      let combined = []
      for (const a of activities) {
        try {
          const r = await fetch(`${GRADES_BASE}/activity/${a.activity_id}`, { headers: { ...getAuthHeaders() } })
          const jd = await r.json()
          if (r.ok && Array.isArray(jd.grades)) {
            const decorated = jd.grades.map(g => normalizeGrade({ ...g, title: a.title }))
            combined = combined.concat(decorated)
          }
        } catch (e) {
          console.warn('Error cargando calificaciones para actividad', a.activity_id, e)
        }
      }
      currentGrades = combined
      renderGrades(currentGrades)
    } catch (err) {
      showLoading(err.message)
      console.error(err)
    }
  }

  async function loadAll() {
    showLoading('Cargando todos los registros...')
    try {
      const res = await fetch(`${GRADES_BASE}/all`, { headers: { ...getAuthHeaders() } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || 'Error')
      currentGrades = (data.grades || []).map(normalizeGrade)
      // Intentar poblar select con TODAS las actividades del sistema
      let populated = false
      try{
        const ra = await fetch(`${ACTIVITIES_BASE}/all`, { headers: { ...getAuthHeaders() } })
        const dact = await ra.json()
          if(ra.ok && Array.isArray(dact.activities)){
          createActivitySelect.innerHTML = '<option value="">-- Seleccione actividad --</option>'
          dact.activities.forEach(a => {
            const opt = document.createElement('option')
            opt.value = a.activity_id ?? a.id ?? ''
            opt.textContent = a.title || a.activity_id || (a.activity || 'Actividad')
            createActivitySelect.appendChild(opt)
          })
          populated = true
        }
      }catch(e){
        console.warn('No se pudo obtener todas las actividades:', e)
      }

      // Si no se pobló desde el endpoint /activities/all, usar actividades encontradas en los registros
      if(!populated){
        const uniqueActivities = {}
        currentGrades.forEach(g => {
          const aid = g.activity_id ?? g.activityId ?? g.activity_id
          const title = g.title || g.activity || `Actividad ${aid}`
          if (aid) uniqueActivities[String(aid)] = title
        })
        createActivitySelect.innerHTML = '<option value="">-- Seleccione actividad --</option>'
        Object.keys(uniqueActivities).forEach(id => {
          const opt = document.createElement('option')
          opt.value = id
          opt.textContent = uniqueActivities[id]
          createActivitySelect.appendChild(opt)
        })
      }
      // Poblar select de estudiantes: si hay asignación seleccionada, se carga por asignación; si no, intentar cargar todos
      try{
        const assignmentId = (subjectSelect && subjectSelect.value) ? subjectSelect.value : (sessionStorage.getItem('active_assignment') || null)
        if(assignmentId) await loadStudentsByAssignment(assignmentId)
        else await loadAllStudents()
      }catch(e){
        console.warn('Error poblando estudiantes tras cargar todos:', e)
      }
      renderGrades(currentGrades)
    } catch (err) {
      showLoading(err.message)
      console.error(err)
    }
  }

  // Intentar cargar estudiantes asociados a una asignación
  async function loadStudentsByAssignment(assignmentId){
    createStudent.innerHTML = '<option value="">-- Cargando estudiantes --</option>'
    if(!assignmentId) return createStudent.innerHTML = '<option value="">-- Seleccione estudiante --</option>'
    const endpoints = [
      // Fallback to the access-control module that returns all students
      `${API_ORIGIN}/auth/students`
    ]
    for(const url of endpoints){
      try{
        const res = await fetch(url, { headers: { ...getAuthHeaders() } })
        if(!res.ok) continue
        const data = await res.json()
        let students = data.students || data.list || data || []
        // Si la respuesta contiene todos los estudiantes, intentar filtrar por asignación si hay pista
        if(assignmentId && students && students.length){
          // posibles campos que indiquen asignación/curso en el estudiante
          const hasAssignmentField = students.some(s => s.assignment_id || s.assignmentIds || s.courses || s.enrollments)
          if(hasAssignmentField){
            students = students.filter(s => String(s.assignment_id) === String(assignmentId) || (s.assignmentIds && s.assignmentIds.includes(assignmentId)) || (s.courses && s.courses.includes && s.courses.includes(assignmentId)) || (s.enrollments && s.enrollments.some(e => String(e.assignment_id) === String(assignmentId))))
          }
        }
        if(!students || !students.length) continue
        createStudent.innerHTML = '<option value="">-- Seleccione estudiante --</option>'
        students.forEach(s => {
          const opt = document.createElement('option')
          const idVal = s.user_id ?? s.student_user_id ?? s.id ?? ''
          const nameVal = (s.name || s.full_name || s.student_name || '').toString().trim()
          if(nameVal && idVal) opt.textContent = `${nameVal} (${idVal})`
          else if(nameVal) opt.textContent = nameVal
          else opt.textContent = idVal || '-- Estudiante --'
          opt.value = idVal
          createStudent.appendChild(opt)
        })
        return
      }catch(e){
        // seguir al siguiente endpoint
      }
    }
    // Si no hubo endpoints válidos, dejar select vacío con hint
    createStudent.innerHTML = '<option value="">-- No hay estudiantes disponibles --</option>'
  }

  // Cargar todos los estudiantes del sistema (fallback para 'Cargar Todos')
  async function loadAllStudents(){
    createStudent.innerHTML = '<option value="">-- Cargando estudiantes --</option>'
    try{
      const res = await fetch(`${API_ORIGIN}/auth/students`, { headers: { ...getAuthHeaders() } })
      if(!res.ok) throw new Error('No se pudo obtener la lista de estudiantes')
      const data = await res.json()
      const students = data.students || []
      if(!students.length) return createStudent.innerHTML = '<option value="">-- No hay estudiantes disponibles --</option>'
      createStudent.innerHTML = '<option value="">-- Seleccione estudiante --</option>'
      students.forEach(s => {
        const opt = document.createElement('option')
        const idVal = s.user_id ?? s.student_user_id ?? s.id ?? ''
        const nameVal = (s.name || s.full_name || s.student_name || '').toString().trim()
        if(nameVal && idVal) opt.textContent = `${nameVal} (${idVal})`
        else if(nameVal) opt.textContent = nameVal
        else opt.textContent = idVal || '-- Estudiante --'
        opt.value = idVal
        createStudent.appendChild(opt)
      })
    }catch(e){
      console.warn('loadAllStudents error:', e)
      createStudent.innerHTML = '<option value="">-- No hay estudiantes disponibles --</option>'
    }
  }

  // Delegación de eventos en la tabla (si el tbody existe en esta página)
  if (tbody) {
    tbody.addEventListener('click', (ev) => {
      const btn = ev.target.closest && ev.target.closest('button[data-action]')
      if (!btn) return
      const action = btn.dataset.action
      // Prefer button dataset, fallback to row data-id
      const id = btn.dataset.id || (btn.closest && btn.closest('tr') && btn.closest('tr').dataset && btn.closest('tr').dataset.id) || null
      if (action === 'edit') openEditModal(id)
      if (action === 'delete') confirmAndDelete(id)
    })
  }

  function openEditModal(id) {
    const record = currentGrades.find(r => String(r.grade_id) === String(id))
    if (!record) return alert('Registro no encontrado')
    currentEditId = id
    modalStudent.textContent = record.student_name || record.student_user_id
    const modalActivity = document.getElementById('modal-activity')
    if (modalActivity) modalActivity.textContent = record.title || record.activity || record.activity_id || '-'
    modalScore.value = record.score ?? ''
    modalFeedback.value = record.feedback ?? ''
    modal.classList.add('open')
    overlay.classList.add('open')
  }

  function closeModal() {
    modal.classList.remove('open')
    overlay.classList.remove('open')
    currentEditId = null
  }

  if (modalClose) modalClose.addEventListener('click', closeModal)
  if (overlay) overlay.addEventListener('click', closeModal)

  if (modalSave) modalSave.addEventListener('click', async () => {
    if (!currentEditId) return closeModal()
    const payload = {
      score: Number(modalScore.value),
      feedback: modalFeedback.value.trim()
    }
    try {
      const res = await fetch(`${GRADES_BASE}/update/${currentEditId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || 'No se pudo actualizar')
      const idx = currentGrades.findIndex(g => String(g.grade_id) === String(currentEditId))
      if (idx >= 0) currentGrades[idx] = normalizeGrade((Array.isArray(data.grade) ? data.grade[0] : data.grade) || currentGrades[idx])
      renderGrades(currentGrades)
      closeModal()
      try{ if(window.refreshSubmissions) window.refreshSubmissions() }catch(e){}
    } catch (err) {
      alert(err.message)
      console.error(err)
    }
  })

  async function confirmAndDelete(id) {
    if (!confirm('Eliminar registro de calificación?')) return
    try {
      const res = await fetch(`${GRADES_BASE}/delete/${id}`, { method: 'DELETE', headers: { ...getAuthHeaders() } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || 'No se pudo eliminar')
      currentGrades = currentGrades.filter(g => String(g.grade_id) !== String(id))
      renderGrades(currentGrades)
      try{ if(window.refreshSubmissions) window.refreshSubmissions() }catch(e){}
    } catch (err) {
      alert(err.message)
      console.error(err)
    }
  }

  function getAuthHeaders(){
    const token = localStorage.getItem('sigra_token') || ''
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Load only the assignments/subjects that belong to the logged-in teacher
  async function loadTeacherAssignments(){
    // Try multiple keys for backward compatibility: 'sigra_user' (used by other modules) or 'user'
    const stored = JSON.parse(localStorage.getItem('sigra_user') || localStorage.getItem('user') || 'null')
    const teacherId = stored ? stored.user_id || stored.id : null
    if(!teacherId){
      console.warn('No se encontró usuario en localStorage. Cargando materias globales como fallback.')
      return loadAllSubjectsFallback()
    }
    try{
      const res = await fetch(`${ASSIGNMENTS_BASE}/teacher/${teacherId}/courses`, { headers: {...getAuthHeaders()} })
      const data = await res.json()
      if(!res.ok) throw new Error(data.error || data.message || 'Error al cargar asignaciones del profesor')
      const courses = data.courses || []
      // Evitar duplicados por subject using assignment_id (si existe el select en esta página)
      if(subjectSelect){
        subjectSelect.innerHTML = '<option value="">-- Seleccione materia --</option>'
        courses.forEach(c => {
          const opt = document.createElement('option')
          opt.value = c.assignment_id || c.assignmentId || ''
          opt.textContent = c.subject_name || c.subject || `Materia ${opt.value}`
          subjectSelect.appendChild(opt)
        })
      }
    }catch(err){
      console.error('No se pudieron cargar las asignaciones del profesor:', err)
      return loadAllSubjectsFallback()
    }
  }

  // If an active assignment was set by the teacher module, preselect it and load its activities
  (function tryLoadActiveAssignment(){
    try{
      const active = sessionStorage.getItem('active_assignment') || null
      if(active){
        if(subjectSelect){
          // wait until subjectSelect is populated, attempt to set value later
          const waitForSelect = setInterval(() => {
            if(subjectSelect.options.length > 1){
              subjectSelect.value = active
              loadActivitiesByAssignment(active)
              clearInterval(waitForSelect)
            }
          }, 200)
          // after a timeout, still try to load by assignment id
          setTimeout(() => {
            if(subjectSelect.value !== active){
              loadActivitiesByAssignment(active)
            }
          }, 2000)
        } else {
          // No subject select on the page — load directly using active assignment
          loadActivitiesByAssignment(active)
        }
      }
    }catch(e){ console.warn('No fue posible cargar la asignación activa desde sessionStorage', e) }
  })()

  // Fallback: load all subjects if no teacher info
  async function loadAllSubjectsFallback(){
    try{
      const res = await fetch(`${API_ORIGIN}/subjects/all`)
      const data = await res.json()
      const subjects = data.subjects || data || []
      subjectSelect.innerHTML = '<option value="">-- Seleccione materia --</option>'
      subjects.forEach(s => {
        const opt = document.createElement('option')
        opt.value = s.subject_id ?? s.id ?? ''
        opt.textContent = s.subject_name || s.name || `Materia ${opt.value}`
        subjectSelect.appendChild(opt)
      })
    }catch(err){
      console.error('No se pudieron cargar las materias (fallback):', err)
    }
  }

  // Create grade
  async function createGrade() {
    const rawActivity = createActivitySelect.value
    const rawStudent = createStudent.value
    const rawScore = createScore.value
    const rawFeedback = (createFeedback.value || '').trim()

    console.debug('createGrade inputs', { rawActivity, rawStudent, rawScore, rawFeedback })

    if (!rawActivity || !rawStudent) {
      alert('Seleccione actividad y estudiante antes de crear.\nActividad: ' + (rawActivity || '(vacío)') + '\nEstudiante: ' + (rawStudent || '(vacío)'))
      return
    }

    const scoreNum = Number(rawScore)
    if (rawScore === '' || isNaN(scoreNum)) {
      return alert('Proporcione una nota válida.')
    }

    const activity_id = (/^\d+$/.test(String(rawActivity)) ? Number(rawActivity) : rawActivity)
    const student_user_id = (/^\d+$/.test(String(rawStudent)) ? Number(rawStudent) : rawStudent)

    const payload = {
      activity_id,
      student_user_id,
      score: scoreNum,
      feedback: rawFeedback
    }
    try {
      const res = await fetch(`${GRADES_BASE}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || 'No se pudo crear la calificación')
      alert(data.message || 'Calificación creada')
      // limpiar formulario parcialmente
      createActivitySelect.value = ''
      createStudent.value = ''
      createScore.value = ''
      createFeedback.value = ''
      refreshCurrentList()
      try{ if(window.refreshSubmissions) window.refreshSubmissions() }catch(e){}
    } catch (err) {
      alert(err.message)
      console.error(err)
    }
  }

  if(btnLoad){
    btnLoad.addEventListener('click', () => {
      const assignmentId = (subjectSelect && subjectSelect.value) ? subjectSelect.value : (sessionStorage.getItem('active_assignment') || null)
      if (!assignmentId) return alert('No hay asignación activa. Abra el módulo del profesor para seleccionar su curso.')
      loadActivitiesByAssignment(assignmentId)
    })
  }
  if(btnAll) btnAll.addEventListener('click', loadAll)
  if(btnCreate) btnCreate.addEventListener('click', createGrade)

  function refreshCurrentList() {
    const assignmentId = (subjectSelect && subjectSelect.value) ? subjectSelect.value : (sessionStorage.getItem('active_assignment') || null)
    if (assignmentId) return loadActivitiesByAssignment(assignmentId)
    return loadAll()
  }

  if(subjectSelect){
    subjectSelect.addEventListener('change', () => {
      const assignmentId = subjectSelect.value ? subjectSelect.value : null
      if (assignmentId) loadActivitiesByAssignment(assignmentId)
    })
  }

  // Initialize subjects (assignments for the logged-in teacher)
  loadTeacherAssignments()
  // Expose helper functions to other modules (e.g., teaching-manager)
  // Abre el formulario de creación con actividad y estudiante preseleccionados
  window.openGradeCreate = function(activityId, studentUserId){
    try{
      if(activityId) createActivitySelect.value = String(activityId)
      if(studentUserId) createStudent.value = String(studentUserId)
      // Scroll to create section if exists
      const cs = createActivitySelect.closest('.table-card') || createActivitySelect
      cs.scrollIntoView({behavior: 'smooth', block: 'center'})
    }catch(e){ console.warn('openGradeCreate error', e) }
  }

  // Permitir que otros módulos refresquen la lista mostrada
  window.refreshGradesList = refreshCurrentList

})
