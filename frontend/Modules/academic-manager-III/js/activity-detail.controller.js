const API_URL = 'http://localhost:5200/api/manager';
const SUBMISSIONS_API = 'http://localhost:5200/api/submissions';
const storedUser = JSON.parse(localStorage.getItem('sigra_user') || 'null');
const STUDENT_ID = storedUser?.id || storedUser?.user_id;

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const activityId = params.get('activityId');
    const assignmentId = params.get('assignmentId');

    if (!activityId || !assignmentId) {
        window.location.href = 'manager.view.html';
        return;
    }

    const backBtn = document.getElementById('back-to-course');
    backBtn.href = `course-detail.html?assignmentId=${assignmentId}`;

    loadActivityData(activityId, assignmentId);
    checkSubmissionStatus(activityId);
    setupUploadLogic(activityId);
});

async function checkSubmissionStatus(activityId) {
    try {
        const response = await fetch(`${SUBMISSIONS_API}/students/${STUDENT_ID}/submissions`);
        const data = await response.json();
        
        if (data.submissions && Array.isArray(data.submissions)) {
            const mySubmission = data.submissions.find(s => s.activity_id == activityId);
            
            if (mySubmission) {
                updateUIAsSubmitted(mySubmission);
            }
        }
    } catch (error) {
        console.error("Error comprobando entrega:", error);
    }
}

function updateUIAsSubmitted(submission) {
    const statusBadge = document.getElementById('submission-status');
    const dropZone = document.getElementById('drop-zone');
    const btnSubmit = document.getElementById('btn-submit');
    const fileList = document.getElementById('file-list');
    
    // Elementos de calificación
    const gradeContainer = document.getElementById('grade-display-container');
    const gradeScore = document.getElementById('grade-score');
    const gradeStatusText = document.getElementById('grade-status-text');
    const feedbackContainer = document.getElementById('feedback-container');
    const gradeFeedback = document.getElementById('grade-feedback');

    // 1. Cambiar texto y color del Badge de la cabecera
    statusBadge.textContent = "Entregado";
    statusBadge.className = "status-badge submitted";

    // 2. Lógica de Calificación
    const score = submission.score; 

    gradeContainer.style.display = "block";
    if (score !== null && score !== undefined) {
        gradeScore.textContent = score;
        gradeStatusText.textContent = "Evaluado por el docente";
        gradeStatusText.className = "grade-status-tag evaluated";
        
        // Mostrar feedback si existe
        if (submission.feedback) {
            feedbackContainer.style.display = "block";
            gradeFeedback.textContent = `"${submission.feedback}"`;
        }
    } else {
        gradeScore.textContent = "--";
        gradeStatusText.textContent = "Pendiente de evaluación";
        gradeStatusText.className = "grade-status-tag pending";
        feedbackContainer.style.display = "none";
    }

    // 3. Normalizar la ruta del archivo para visualización
    let cleanPath = submission.file_path.replace(/\\/g, '/');
    if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;
    const fileURL = `http://localhost:5200${cleanPath}`;
    const fileName = cleanPath.split('/').pop();

    // 4. Ocultar zona de carga y mostrar tarjeta de archivo
    dropZone.style.display = "none";
    
    fileList.innerHTML = `
        <div class="submitted-file-card">
            <div class="file-info">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                    <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
                <div style="overflow: hidden;">
                    <p class="file-name" title="${fileName}">${fileName}</p>
                    <p class="file-date">Entregado: ${new Date(submission.submission_date).toLocaleString()}</p>
                </div>
            </div>
            <a href="${fileURL}" target="_blank" class="view-file-btn">Ver archivo entregado</a>
        </div>
    `;

    // 5. Bloquear botón de entrega
    btnSubmit.textContent = "Tarea ya entregada";
    btnSubmit.disabled = true;
    btnSubmit.style.background = "#f1f5f9";
    btnSubmit.style.color = "#94a3b8";
    btnSubmit.style.boxShadow = "none";
}

async function loadActivityData(activityId, assignmentId) {
    try {
        const response = await fetch(`${API_URL}/courses/${assignmentId}/activities`);
        const { data, success } = await response.json();
        const activity = data.find(a => a.activity_id == activityId);

        if (activity) {
            document.getElementById('activity-title').textContent = activity.title;
            document.getElementById('activity-description').textContent = activity.description || 'Sin instrucciones.';
            document.getElementById('activity-weight').innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Ponderación: <strong>${activity.weight_percentage}%</strong>`;
            document.getElementById('activity-date').innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> Vence: ${new Date(activity.due_date).toLocaleDateString()}`;
            document.getElementById('course-name-top').textContent = "Actividad Evaluada";
        }
    } catch (error) { console.error("Error cargando actividad:", error); }
}

function setupUploadLogic(activityId) {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const btnSubmit = document.getElementById('btn-submit');
    const fileList = document.getElementById('file-list');

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); }, false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); }, false);
    });
    dropZone.addEventListener('drop', (e) => { handleFiles(e.dataTransfer.files); });
    dropZone.onclick = () => fileInput.click();
    fileInput.onchange = (e) => handleFiles(e.target.files);

    function handleFiles(files) {
        const file = files[0];
        if (file) {
            fileList.innerHTML = `<div class="file-preview-item"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg><span style="font-weight: 600;">${file.name}</span></div>`;
            btnSubmit.disabled = false;
        }
    }

    btnSubmit.onclick = async () => {
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('studentId', STUDENT_ID);
        try {
            btnSubmit.textContent = "Subiendo...";
            btnSubmit.disabled = true;
            const response = await fetch(`${API_URL}/activities/${activityId}/upload`, { method: 'POST', body: formData });
            const result = await response.json();
            if (response.ok && result.success) { alert("¡Tarea entregada con éxito!"); window.location.reload(); }
            else { throw new Error(result.message || "Error desconocido"); }
        } catch (error) {
            alert("Error al subir el archivo: " + error.message);
            btnSubmit.textContent = "Entregar tarea"; btnSubmit.disabled = false;
        }
    };
}