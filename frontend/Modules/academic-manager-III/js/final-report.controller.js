const API_BASE = 'http://localhost:3000/api';

const storedUser = JSON.parse(localStorage.getItem('sigra_user') || 'null');
const STUDENT_ID = storedUser?.id || storedUser?.user_id || null;
const TOKEN = localStorage.getItem('sigra_token');

document.addEventListener('DOMContentLoaded', () => {
  if (storedUser) {
    document.getElementById('studentName').textContent = `${storedUser.first_name || storedUser.name || ''} ${storedUser.last_name || ''}`.trim();
    document.getElementById('studentId').textContent = STUDENT_ID ? `ID: ${STUDENT_ID}` : '';
  }

  if (!STUDENT_ID) {
    showError('No se encontró información del estudiante en el almacenamiento local.');
    return;
  }

  loadFinalGrades();
});

async function fetchWithAuth(url) {
  const opts = { headers: {} };
  if (TOKEN) opts.headers['Authorization'] = `Bearer ${TOKEN}`;
  const res = await fetch(url, opts);
  return res;
}

async function loadFinalGrades() {
  // Solo usamos el endpoint oficial de logs por usuario
  let data = null;
  try {
    const resUser = await fetchWithAuth(`${API_BASE}/grades-log/user/${STUDENT_ID}`);
    if (resUser.ok) {
      const json = await resUser.json();
      if (json && Array.isArray(json.grades)) data = json.grades;
    }
  } catch (err) {
    // silencioso
  }

  if (!data) {
    showError('No se pudieron recuperar las notas. Verifique el endpoint del backend.');
    return;
  }

  // Ahora, con los registros de user obtenidos (contienen activity_id), buscamos por activity
  // Extraer activity ids únicos
  const activityIds = Array.from(new Set(data.map(d => d.activity_id).filter(Boolean)));

  if (activityIds.length === 0) {
    // Si no hay activity ids, volver a la agrupación simple por lo que venga
    const grouped = {};
    data.forEach(item => {
      const subject = item.subject_name || item.title || 'Sin nombre';
      if (!grouped[subject]) grouped[subject] = { subject_name: subject, teacher_name: item.teacher_name || '', scores: [] };
      const score = Number(item.score ?? item.grade ?? item.final_grade ?? 0);
      if (!Number.isNaN(score)) grouped[subject].scores.push(score);
    });
    const subjectsArray = Object.values(grouped).map(g => {
      const sum = g.scores.reduce((a,b) => a + b, 0);
      const avg = g.scores.length ? (sum / g.scores.length) : 0;
      return { subject_name: g.subject_name, teacher_name: g.teacher_name, average: avg };
    });
    renderReport(subjectsArray);
    return;
  }

  // Consultar detalles por cada activityId en paralelo
  const activityPromises = activityIds.map(id => fetchWithAuth(`${API_BASE}/grades-log/activity/${id}`).then(r => r.ok ? r.json() : null).catch(() => null));
  const activityResults = await Promise.all(activityPromises);

  // También pedimos detalles de la actividad (para obtener weight_percentage) desde /activities/activity/{id}
  const activityDetailPromises = activityIds.map(id => fetchWithAuth(`${API_BASE}/activities/activity/${id}`).then(r => r.ok ? r.json() : null).catch(() => null));
  const activityDetails = await Promise.all(activityDetailPromises);


  // activityResults es array de respuestas { grades: [...] } o null
  // Recolectar para cada activity la entrada que corresponde al estudiante
  const subjectMap = {}; // subject_name -> { teacher_name, activities: [{activity_id,title,score}] }

  for (let i = 0; i < activityResults.length; i++) {
    const resJson = activityResults[i];
    if (!resJson) continue;
    const gradesArr = Array.isArray(resJson.grades) ? resJson.grades : (Array.isArray(resJson) ? resJson : []);
    // Encontrar registro del estudiante
    const myRecord = gradesArr.find(g => Number(g.student_user_id) === Number(STUDENT_ID) || Number(g.user_id) === Number(STUDENT_ID));
    // Intentar extraer subject_name y teacher, y title
    const subjectName = myRecord?.subject_name || (gradesArr[0] && gradesArr[0].subject_name) || 'Sin nombre';
    const teacherName = myRecord?.teacher_name || (gradesArr[0] && gradesArr[0].teacher_name) || '';
    const title = myRecord?.title || (gradesArr[0] && gradesArr[0].title) || `Actividad ${activityIds[i]}`;
    const activityId = activityIds[i];
    const score = Number(myRecord?.score ?? myRecord?.grade ?? myRecord?.final_grade ?? NaN);
    if (!Number.isFinite(score)) continue;

    // Obtener detalle de la actividad para peso
    const detailJson = activityDetails[i];
    const detail = detailJson && (detailJson.activity || detailJson.activities && detailJson.activities[0]) ? (detailJson.activity || detailJson.activities[0]) : null;
    const weight = Number(detail?.weight_percentage ?? detail?.weight ?? 0);

    if (!subjectMap[subjectName]) subjectMap[subjectName] = { subject_name: subjectName, teacher_name: teacherName, activities: [], totalWeightEvaluated: 0, totalContribution: 0 };
    // contribution: score * (weight/100) -> same scale as score (e.g., out of 20)
    const contribution = Number.isFinite(score) ? (score * (weight / 100)) : 0;
    subjectMap[subjectName].activities.push({ activity_id: activityId, title, score, weight, contribution });
    subjectMap[subjectName].totalWeightEvaluated += weight;
    subjectMap[subjectName].totalContribution += contribution;
  }

  const subjectsArray = Object.values(subjectMap).map(g => {
    const avg = g.activities.length ? (g.totalContribution) : 0; // global note already weighted (same scale as raw scores)
    return { subject_name: g.subject_name, teacher_name: g.teacher_name, average: avg, activities: g.activities, evaluatedPercent: Math.min(100, g.totalWeightEvaluated), totalContribution: g.totalContribution };
  });

  if (subjectsArray.length === 0) {
    showError('No se hallaron notas del estudiante dentro de las actividades.');
    return;
  }

  renderReport(subjectsArray);
}

function showError(message) {
  const container = document.getElementById('subjectsList');
  container.innerHTML = `<p class="error-msg">${message}</p>`;
}

function renderReport(subjects) {
  // subjects: array de objetos por materia con { subject_name, teacher_name, average }
  const list = document.getElementById('subjectsList');
  list.innerHTML = '';

  if (!subjects || subjects.length === 0) {
    list.innerHTML = '<p class="empty">No hay calificaciones disponibles.</p>';
    return;
  }

  // Detectar escala usando valores promedio
  const maxFound = Math.max(...subjects.map(s => Number(s.average ?? 0)));
  const scale = maxFound > 20 ? 100 : 20;

  let sumPercent = 0;

  subjects.forEach(sub => {
    const grade = Number(sub.average ?? 0);
    const percent = scale === 0 ? 0 : Math.round((grade / scale) * 100);
    sumPercent += percent;

    const article = document.createElement('article');
    article.className = 'subject-card';

    // Build activities list HTML (show weight and contribution)
    let activitiesHtml = '';
    if (Array.isArray(sub.activities) && sub.activities.length) {
      activitiesHtml = '<ul class="activities-list">' + sub.activities.map(a => `
        <li class="activity-item"><div><span class="act-title">${a.title}</span><div class="act-meta">Peso: ${a.weight}%</div></div> <div><span class="act-score">${Number.isInteger(a.score) ? a.score : a.score.toFixed(2)}</span><div class="act-contrib">+${Number.isFinite(a.contribution) ? (Number.isInteger(a.contribution) ? a.contribution : a.contribution.toFixed(2)) : '0'}</div></div></li>
      `).join('') + '</ul>';
    }

    article.innerHTML = `
      <div class="subject-left">
        <h3 class="subject-name">${sub.subject_name || 'Sin nombre'}</h3>
        <div class="subject-meta">${sub.teacher_name ? `Docente: ${sub.teacher_name}` : ''}</div>
        ${activitiesHtml}
      </div>
      <div class="subject-right">
        <div class="grade-number">${Number.isInteger(grade) ? grade : grade.toFixed(2)}</div>
        <div class="grade-percent">${percent}%</div>
        <div class="grade-meta">Evaluado: ${sub.evaluatedPercent}%</div>
        <div class="grade-status ${percent >= 60 ? 'approved' : 'failed'}">${percent >= 60 ? 'Aprobado' : 'Reprobado'}</div>
      </div>
    `;

    list.appendChild(article);
  });

  const average = Math.round(sumPercent / subjects.length);
  const finalAvgEl = document.getElementById('finalAverage');
  const finalStatusEl = document.getElementById('finalStatus');
  if (finalAvgEl) finalAvgEl.textContent = `${average}%`;
  if (finalStatusEl) finalStatusEl.textContent = average >= 60 ? 'Aprobado' : 'Reprobado';
}

window.addEventListener('pageshow', (event) => {
  if (event.persisted) loadFinalGrades();
});
