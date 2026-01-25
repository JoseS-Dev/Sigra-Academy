const API_BASE = 'http://localhost:5200/api';

// Estado de la aplicación
const state = {
    grades: [],
    sections: [],
    assignments: [],
    schedules: [],
    currentGrade: null,
    currentSection: null,
    editingSchedule: null
};

// Elementos del DOM
const elements = {
    selectGrado: document.getElementById('selectGrado'),
    selectSeccion: document.getElementById('selectSeccion'),
    tablaHorarios: document.getElementById('tablaHorarios'),
    btnNuevoHorario: document.getElementById('btnNuevoHorario'),
    modalHorario: document.getElementById('modalHorario'),
    modalTitulo: document.getElementById('modalTitulo'),
    modalAsignacion: document.getElementById('modalAsignacion'),
    modalDia: document.getElementById('modalDia'),
    modalHoraInicio: document.getElementById('modalHoraInicio'),
    modalHoraFin: document.getElementById('modalHoraFin'),
    modalAula: document.getElementById('modalAula'),
    btnCerrarModal: document.getElementById('btnCerrarModal'),
    btnCancelarModal: document.getElementById('btnCancelarModal'),
    btnGuardarHorario: document.getElementById('btnGuardarHorario')
};

// ==================== FUNCIONES DE API ====================

async function cargarGrados() {
    try {
        const response = await fetch(`${API_BASE}/grades/all`);
        if (!response.ok) throw new Error('Error al cargar grados');
        const data = await response.json();
        state.grades = data.grades || [];
        renderizarGrados();
    } catch (error) {
        console.error('Error:', error);
        mostrarError('No se pudieron cargar los grados');
    }
}

async function cargarSecciones(gradeId) {
    try {
        const response = await fetch(`${API_BASE}/sections/grade/${gradeId}`);
        if (!response.ok) throw new Error('Error al cargar secciones');
        const data = await response.json();
        state.sections = data.sections || [];
        renderizarSecciones();
    } catch (error) {
        console.error('Error:', error);
        mostrarError('No se pudieron cargar las secciones');
    }
}

async function cargarAsignaciones(sectionId) {
    try {
        const response = await fetch(`${API_BASE}/academic-assignments/assigned-teachers/${sectionId}`);
        if (!response.ok) throw new Error('Error al cargar asignaciones');
        const data = await response.json();
        state.assignments = Array.isArray(data) ? data : (data.assignments || data.teachers || []);
        renderizarAsignaciones();
    } catch (error) {
        console.error('Error:', error);
        state.assignments = [];
        renderizarAsignaciones();
    }
}

async function cargarHorarios(sectionId) {
    try {
        const response = await fetch(`${API_BASE}/schedules/section/${sectionId}`);

        // Si es 404, probablemente no hay horarios aún
        if (response.status === 404) {
            state.schedules = [];
            renderizarHorarios();
            return;
        }

        if (!response.ok) throw new Error('Error al cargar horarios');
        const data = await response.json();
        state.schedules = Array.isArray(data) ? data : (data.schedules || data.data || []);
        renderizarHorarios();
    } catch (error) {
        console.error('Error:', error);
        state.schedules = [];
        renderizarHorarios();
    }
}

async function crearHorario(horarioData) {
    try {
        const response = await fetch(`${API_BASE}/schedules/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(horarioData)
        });

        if (!response.ok) throw new Error('Error al crear horario');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function actualizarHorario(scheduleId, horarioData) {
    try {
        const response = await fetch(`${API_BASE}/schedules/update/${scheduleId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(horarioData)
        });

        if (!response.ok) throw new Error('Error al actualizar horario');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function eliminarHorario(scheduleId) {
    try {
        const response = await fetch(`${API_BASE}/schedules/delete/${scheduleId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Error al eliminar horario');
        return true;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// ==================== FUNCIONES DE RENDERIZADO ====================

function renderizarGrados() {
    elements.selectGrado.innerHTML = '<option value="">-- Seleccione un año académico --</option>';

    state.grades.forEach(grade => {
        const option = document.createElement('option');
        option.value = grade.grade_id;
        option.textContent = grade.grade_name;
        elements.selectGrado.appendChild(option);
    });
}

function renderizarSecciones() {
    elements.selectSeccion.innerHTML = '<option value="">-- Seleccione una sección --</option>';

    state.sections.forEach(section => {
        const option = document.createElement('option');
        option.value = section.section_id;
        option.textContent = `Sección ${section.section_name}`;
        elements.selectSeccion.appendChild(option);
    });
}

function renderizarAsignaciones() {
    elements.modalAsignacion.innerHTML = '<option value="">-- Seleccione una asignación --</option>';

    state.assignments.forEach(assignment => {
        const option = document.createElement('option');
        option.value = assignment.assignment_id;
        option.textContent = `${assignment.subject_name} - ${assignment.name}`;
        elements.modalAsignacion.appendChild(option);
    });
}

function renderizarHorarios() {
    if (state.schedules.length === 0) {
        elements.tablaHorarios.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #6b7280;">
                    No hay horarios configurados para esta sección
                </td>
            </tr>
        `;
        return;
    }

    elements.tablaHorarios.innerHTML = state.schedules
        .sort((a, b) => {
            const diasOrden = { 'Lunes': 1, 'Martes': 2, 'Miercoles': 3, 'Jueves': 4, 'Viernes': 5 };
            return diasOrden[a.day_of_week] - diasOrden[b.day_of_week] ||
                a.start_time.localeCompare(b.start_time);
        })
        .map(horario => {
            const badgeClass = `badge-${horario.day_of_week.toLowerCase()}`;
            return `
                <tr>
                    <td><strong>${horario.subject_name}</strong></td>
                    <td>${horario.teacher_name}</td>
                    <td><span class="badge-dia ${badgeClass}">${horario.day_of_week}</span></td>
                    <td>${formatearHora(horario.start_time)}</td>
                    <td>${formatearHora(horario.end_time)}</td>
                    <td>${horario.classroom || '-'}</td>
                    <td>
                        <div class="acciones-cell">
                            <button 
                                class="btn btn--accion" 
                                onclick="editarHorario(${horario.schedule_id})"
                                title="Editar horario"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" 
                                          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" 
                                          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                            <button 
                                class="btn btn--accion" 
                                onclick="confirmarEliminar(${horario.schedule_id})"
                                title="Eliminar horario"
                                style="color: #dc2626;"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" 
                                          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        })
        .join('');
}

// ==================== FUNCIONES DE UTILIDAD ====================

function formatearHora(tiempo) {
    if (!tiempo) return '-';
    // Formato HH:MM:SS a HH:MM AM/PM
    const [horas, minutos] = tiempo.split(':');
    const h = parseInt(horas);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutos} ${ampm}`;
}

function formatearHoraParaAPI(tiempo) {
    // El backend espera formato HH:MM, no HH:MM:00
    return tiempo || null;
}

function mostrarError(mensaje) {
    alert(`Error: ${mensaje}`);
}

function mostrarExito(mensaje) {
    alert(mensaje);
}

// ==================== MODAL ====================

function abrirModal(modo = 'crear', scheduleId = null) {
    if (modo === 'crear') {
        elements.modalTitulo.textContent = 'Nuevo Horario';
        limpiarFormulario();
        state.editingSchedule = null;
    } else {
        elements.modalTitulo.textContent = 'Editar Horario';
        cargarDatosHorario(scheduleId);
        state.editingSchedule = scheduleId;
    }

    elements.modalHorario.style.display = 'flex';
}

function cerrarModal() {
    elements.modalHorario.style.display = 'none';
    limpiarFormulario();
    state.editingSchedule = null;
}

function limpiarFormulario() {
    elements.modalAsignacion.value = '';
    elements.modalDia.value = '';
    elements.modalHoraInicio.value = '';
    elements.modalHoraFin.value = '';
    elements.modalAula.value = '';
}

function cargarDatosHorario(scheduleId) {
    const horario = state.schedules.find(h => h.schedule_id === scheduleId);
    if (!horario) return;

    elements.modalAsignacion.value = horario.assignment_id;
    elements.modalDia.value = horario.day_of_week;
    elements.modalHoraInicio.value = horario.start_time.substring(0, 5);
    elements.modalHoraFin.value = horario.end_time.substring(0, 5);
    elements.modalAula.value = horario.classroom || '';
}

// ==================== ACCIONES ====================

async function guardarHorario() {
    // Validar campos
    if (!elements.modalAsignacion.value) {
        mostrarError('Debe seleccionar una asignación');
        return;
    }

    if (!elements.modalDia.value) {
        mostrarError('Debe seleccionar un día');
        return;
    }

    if (!elements.modalHoraInicio.value || !elements.modalHoraFin.value) {
        mostrarError('Debe especificar hora de inicio y fin');
        return;
    }

    // Validar que hora fin sea mayor que hora inicio
    if (elements.modalHoraInicio.value >= elements.modalHoraFin.value) {
        mostrarError('La hora de fin debe ser mayor que la hora de inicio');
        return;
    }

    const horarioData = {
        assignment_id: parseInt(elements.modalAsignacion.value),
        day_of_week: elements.modalDia.value,
        start_time: formatearHoraParaAPI(elements.modalHoraInicio.value),
        end_time: formatearHoraParaAPI(elements.modalHoraFin.value),
        classroom: elements.modalAula.value || null
    };

    try {
        elements.btnGuardarHorario.disabled = true;
        elements.btnGuardarHorario.textContent = 'Guardando...';

        if (state.editingSchedule) {
            await actualizarHorario(state.editingSchedule, horarioData);
            mostrarExito('Horario actualizado correctamente');
        } else {
            await crearHorario(horarioData);
            mostrarExito('Horario creado correctamente');
        }

        cerrarModal();
        await cargarHorarios(state.currentSection);
    } catch (error) {
        mostrarError('No se pudo guardar el horario');
    } finally {
        elements.btnGuardarHorario.disabled = false;
        elements.btnGuardarHorario.textContent = 'Guardar Horario';
    }
}

window.editarHorario = function (scheduleId) {
    abrirModal('editar', scheduleId);
};

window.confirmarEliminar = async function (scheduleId) {
    if (!confirm('¿Está seguro de que desea eliminar este horario?')) {
        return;
    }

    try {
        await eliminarHorario(scheduleId);
        mostrarExito('Horario eliminado correctamente');
        await cargarHorarios(state.currentSection);
    } catch (error) {
        mostrarError('No se pudo eliminar el horario');
    }
};

// ==================== EVENT LISTENERS ====================

elements.selectGrado.addEventListener('change', async (e) => {
    state.currentGrade = e.target.value;
    state.currentSection = null;
    state.schedules = [];

    elements.selectSeccion.innerHTML = '<option value="">-- Seleccione una sección --</option>';
    elements.tablaHorarios.innerHTML = `
        <tr>
            <td colspan="7" style="text-align: center; padding: 40px;">
                Seleccione una sección para ver los horarios
            </td>
        </tr>
    `;

    if (state.currentGrade) {
        await cargarSecciones(state.currentGrade);
    }
});

elements.selectSeccion.addEventListener('change', async (e) => {
    state.currentSection = e.target.value;

    if (state.currentSection) {
        await cargarAsignaciones(state.currentSection);
        await cargarHorarios(state.currentSection);
    } else {
        state.schedules = [];
        renderizarHorarios();
    }
});

elements.btnNuevoHorario.addEventListener('click', () => {
    if (!state.currentSection) {
        mostrarError('Debe seleccionar un año y una sección primero');
        return;
    }
    abrirModal('crear');
});

elements.btnCerrarModal.addEventListener('click', cerrarModal);
elements.btnCancelarModal.addEventListener('click', cerrarModal);
elements.btnGuardarHorario.addEventListener('click', guardarHorario);

// Cerrar modal al hacer clic fuera
elements.modalHorario.addEventListener('click', (e) => {
    if (e.target === elements.modalHorario) {
        cerrarModal();
    }
});

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', () => {
    cargarGrados();
});
