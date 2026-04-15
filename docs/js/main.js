Papa.parse('./data/Evolucion_Poblacional.csv', {
    download: true,
    header: true,
    dynamicTyping: true,
    complete: function(results) {
        const datos = results.data;
        crearGrafico(datos);
    }
});

function crearGrafico(datos) {
    const datosLimpios = datos.filter(fila => fila.AÑO != null);
    const años = [...new Set(datosLimpios.map(fila => fila.AÑO))];

    const datosJovenes = datosLimpios
        .filter(fila => fila.Grupo_Edad === '0-17')
        .map(fila => fila.PORCENTAJE);

    const datosMayores = datosLimpios
        .filter(fila => fila.Grupo_Edad === '60+')
        .map(fila => fila.PORCENTAJE);

    // Buscamos en qué posición está el año 2024
    const index2024 = años.indexOf(2024);

    // PLUGIN: Este código dibuja la línea de proyecciones a partir de 2024
    const pluginProyeccion = {
        id: 'lineaProyeccion',
        beforeDraw: (chart) => {
            if (index2024 === -1) return; // Si no encuentra el 2024, no hace nada
            
            const { ctx, chartArea: { top, bottom, right }, scales: { x } } = chart;
            const xPos = x.getPixelForValue(index2024);

            ctx.save();
            // 1. Dibuja un fondo sutil para el área de proyecciones
            ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.fillRect(xPos, top, right - xPos, bottom - top);

            // 2. Dibuja la línea vertical punteada
            ctx.beginPath();
            ctx.moveTo(xPos, top);
            ctx.lineTo(xPos, bottom);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; // Línea blanca semitransparente
            ctx.setLineDash([5, 5]); // Hace que la línea sea punteada
            ctx.stroke();

            // 3. Escribe el texto indicativo
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '12px Arial';
            ctx.fillText('  Proyecciones ➔', xPos + 5, top + 15);
            ctx.restore();
        }
    };

    const ctx = document.getElementById('miGrafico').getContext('2d');
    
    // Configuramos Chart.js para MODO OSCURO (textos y líneas de la grilla claras)
    Chart.defaults.color = '#cbd5e1'; 
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)'; 

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: años,
            datasets: [
                {
                    label: 'Población 0-17 años (%)',
                    data: datosJovenes,
                    borderColor: '#36A2EB', // Azul
                    backgroundColor: 'rgba(54, 162, 235, 0.4)', // Área azul transparente
                    fill: true, // ESTO LO HACE GRÁFICO DE ÁREA
                    borderWidth: 2,
                    pointRadius: 0, // Oculta los puntos para que el área se vea limpia
                    pointHitRadius: 10, // Pero mantiene la interacción al pasar el mouse
                    tension: 0.4
                },
                {
                    label: 'Población 60+ años (%)',
                    data: datosMayores,
                    borderColor: '#FF9800', // NARANJO
                    backgroundColor: 'rgba(255, 152, 0, 0.4)', // Área naranja transparente
                    fill: true, // ESTO LO HACE GRÁFICO DE ÁREA
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHitRadius: 10,
                    tension: 0.4
                }
            ]
        },
        plugins: [pluginProyeccion], // Cargamos nuestro plugin del 2024 aquí
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