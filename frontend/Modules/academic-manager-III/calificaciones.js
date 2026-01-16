document.addEventListener('DOMContentLoaded', () => {

   
    // Simulacion de datos
    const calificaciones = [
        { actividad: "Informe: Derivadas", ponderacion: 15, notaObtenida: 18, notaMax: 20, feedback: "Excelente análisis." },
        { actividad: "Taller: Vectores R3", ponderacion: 20, notaObtenida: 14, notaMax: 20, feedback: "Faltó profundidad en el ejercicio 3." },
        { actividad: "Parcial I: Geometría", ponderacion: 25, notaObtenida: 0, notaMax: 20, feedback: "Pendiente por presentar" },
    
        { actividad: "Proyecto Final", ponderacion: 40, notaObtenida: null, notaMax: 20, feedback: "-" }
    ];

    const tablaBody = document.getElementById('tabla-calificaciones-body');
    const promedioDisplay = document.getElementById('promedio-general');
    const badgeEstado = document.getElementById('badge-estado');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const totalPonderacionEl = document.getElementById('total-ponderacion');
    const totalNotaEl = document.getElementById('total-nota');

    function renderCalificaciones() {
        let sumaNotasPonderadas = 0;
        let sumaPonderacionEvaluada = 0;
        let sumaPonderacionTotal = 0;

        tablaBody.innerHTML = ''; 

        calificaciones.forEach(item => {
            sumaPonderacionTotal += item.ponderacion;


            let notaVisual = "-";
            let claseNota = "";
            
            if (item.notaObtenida !== null) {
                
                const porcentajeObtenido = (item.notaObtenida / item.notaMax);
                sumaNotasPonderadas += (porcentajeObtenido * item.ponderacion);
                sumaPonderacionEvaluada += item.ponderacion;

                notaVisual = `${item.notaObtenida} / ${item.notaMax}`;
                
                if(item.notaObtenida >= 19) claseNota = "nota-alta"; // Verde
                else if(item.notaObtenida < 10) claseNota = "nota-baja"; // Rojo
                else claseNota = "nota-media";
            }

            const row = `
                <tr>
                    <td>${item.actividad}</td>
                    <td>${item.ponderacion}%</td>
                    <td><span class="${claseNota}">${notaVisual}</span></td>
                    <td><div class="feedback-text" title="${item.feedback}">${item.feedback}</div></td>
                </tr>
            `;
            tablaBody.innerHTML += row;
        });

        // Calculos
        const promedioCalculado = (sumaNotasPonderadas * 20) / 100;

        promedioDisplay.textContent = promedioCalculado.toFixed(2);
        
        if (promedioCalculado >= 10) {
            badgeEstado.textContent = "Aprobado";
            badgeEstado.className = "status-badge aprobado";
        } else {
            badgeEstado.textContent = "Reprobado / En riesgo";
            badgeEstado.className = "status-badge reprobado";
        }

        const porcentajeCompletado = sumaPonderacionEvaluada; 
        

        setTimeout(() => {
            progressFill.style.width = `${porcentajeCompletado}%`;
            progressText.textContent = `${porcentajeCompletado}%`;
        }, 100);


        totalPonderacionEl.textContent = `${sumaPonderacionTotal}%`;
        totalNotaEl.innerHTML = `<strong>${promedioCalculado.toFixed(2)} / 20</strong>`;
    }

    renderCalificaciones();
}); 