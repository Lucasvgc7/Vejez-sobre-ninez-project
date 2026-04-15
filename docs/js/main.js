// js/main.js

// 1. Leemos el archivo CSV. 
// OJO: La ruta sigue siendo relativa al index.html, no a este archivo JS.
Papa.parse('./data/Evolucion_Poblacional.csv', {
    download: true,
    header: true,
    dynamicTyping: true,
    complete: function(results) {
        const datos = results.data;
        crearGrafico(datos);
    }
});

// 2. Función para procesar los datos y crear el gráfico
function crearGrafico(datos) {
    const datosLimpios = datos.filter(fila => fila.AÑO != null);
    const años = [...new Set(datosLimpios.map(fila => fila.AÑO))];

    const datosJovenes = datosLimpios
        .filter(fila => fila.Grupo_Edad === '0-17')
        .map(fila => fila.PORCENTAJE);

    const datosMayores = datosLimpios
        .filter(fila => fila.Grupo_Edad === '60+')
        .map(fila => fila.PORCENTAJE);

    const ctx = document.getElementById('miGrafico').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: años,
            datasets: [
                {
                    label: 'Población 0-17 años (%)',
                    data: datosJovenes,
                    borderColor: '#36A2EB',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderWidth: 2,
                    pointRadius: 1,
                    tension: 0.4
                },
                {
                    label: 'Población 60+ años (%)',
                    data: datosMayores,
                    borderColor: '#FF6384',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderWidth: 2,
                    pointRadius: 1,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + '%';
                        }
                    }
                }
            },
            scales: {
                y: { title: { display: true, text: 'Porcentaje de la Población Total' } },
                x: { title: { display: true, text: 'Año' } }
            }
        }
    });
}