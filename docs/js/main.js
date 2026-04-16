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

    // PLUGIN 1: Línea de proyecciones
    const pluginProyeccion = {
        id: 'lineaProyeccion',
        beforeDraw: (chart) => {
            if (index2024 === -1) return;
            const { ctx, chartArea: { top, bottom, right }, scales: { x } } = chart;
            const xPos = x.getPixelForValue(index2024);
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.fillRect(xPos, top, right - xPos, bottom - top);
            ctx.beginPath();
            ctx.moveTo(xPos, top);
            ctx.lineTo(xPos, bottom);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '12px Arial';
            ctx.fillText('  Proyecciones ➔', xPos + 5, top + 15);
            ctx.restore();
        }
    };

    // PLUGIN 2: Anotaciones de texto al final de cada línea
    const pluginEtiquetasFinales = {
        id: 'etiquetasFinales',
        afterDraw: (chart) => {
            const { ctx } = chart;
            ctx.save();
            
            chart.data.datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                const ultimoPunto = meta.data[meta.data.length - 1]; // Coordenadas del último dato
                
                if (ultimoPunto && !ultimoPunto.skip) {
                    ctx.fillStyle = dataset.borderColor; // Color igual a la línea
                    ctx.font = 'bold 14px sans-serif';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    
                    // Dibujamos el label 10px a la derecha del punto final
                    ctx.fillText(dataset.label, ultimoPunto.x + 10, ultimoPunto.y);
                }
            });
            ctx.restore();
        }
    };

    const ctx = document.getElementById('miGrafico').getContext('2d');
    
    Chart.defaults.color = '#cbd5e1'; 
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)'; 

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: años,
            datasets: [
                {
                    label: '0-17 años', // Label simplificado para la anotación
                    data: datosJovenes,
                    borderColor: '#36A2EB',
                    backgroundColor: 'rgba(54, 162, 235, 0.4)',
                    fill: false,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHitRadius: 10,
                    tension: 0.4
                },
                {
                    label: '60+ años',
                    data: datosMayores,
                    borderColor: '#FF9800',
                    backgroundColor: 'rgba(255, 152, 0, 0.4)',
                    fill: false,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHitRadius: 10,
                    tension: 0.4
                }
            ]
        },
        // Cargamos ambos plugins
        plugins: [pluginProyeccion, pluginEtiquetasFinales], 
        options: {
            responsive: true,
            layout: {
                // Añadimos padding a la derecha para que las etiquetas no se corten
                padding: {
                    right: 80 
                }
            },
            plugins: {
                legend: {
                    display: false // ELIMINAMOS la leyenda tradicional
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`
                    }
                }
            },
            scales: {
                y: { title: { display: true, text: 'Porcentaje de la Población Total(%)' } },
                x: { title: { display: true, text: 'Año' } }
            }
        }
    });
}