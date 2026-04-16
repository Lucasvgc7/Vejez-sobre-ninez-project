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
        plugins: [pluginProyeccion, pluginEtiquetasFinales, 
            // NUEVO PLUGIN: Texto de Contexto Interior
            {
    id: 'contextoTexto',
    afterDraw: (chart) => {
        const { ctx, chartArea: { top }, scales: { x } } = chart;
        if (index2024 === -1) return;

        // Punto de anclaje (Línea de 2024)
        const xBase = x.getPixelForValue(index2024);
        const yBase = top;

        // CONFIGURACIÓN MANUAL DE POSICIÓN
        // x: píxeles a la derecha de la línea 2024
        // y: píxeles hacia abajo desde el borde superior del gráfico
        const bloquesTexto = [
            { text: 'RESUMEN DEMOGRÁFICO: ', x: 15, y: 50, font: 'bold 13px sans-serif', color: '#cbd5e1' },
            { text: 'A partir de 2024, las proyecciones muestran', x: 15, y: 65, font: '12px sans-serif', color: '#cbd5e1' },
            { text: 'un cruce clave.', x: 15, y: 80, font: '12px sans-serif', color: '#cbd5e1' },
            
            // Bloque Jóvenes
            { text: 'Población 0-17 años:', x: 220, y: 285, font: 'bold 12px sans-serif', color: '#36A2EB' },
            { text: 'Tendencia al descenso continuo.', x: 220, y: 300, font: '12px sans-serif', color: '#cbd5e1' },

            // Bloque Mayores
            { text: 'Población 60+ años:', x: 220, y: 160, font: 'bold 12px sans-serif', color: '#FF9800' },
            { text: 'Crecimiento acelerado proyectado.', x: 220, y: 175, font: '12px sans-serif', color: '#cbd5e1' },
            
            // Nota adicional (puedes moverla a cualquier parte)
            { text: '* Datos post-2024 son estimaciones', x: 200, y: 350, font: 'italic 11px sans-serif', color: '#64748b' }
        ];

        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        bloquesTexto.forEach(block => {
            ctx.font = block.font;
            ctx.fillStyle = block.color;
            // Dibujamos usando la base + el desplazamiento elegido
            ctx.fillText(block.text, xBase + block.x, yBase + block.y);
        });

        ctx.restore();
    }
}
        ], 
        options: {
            responsive: true,
            layout: {
                // Mantenemos el padding a la derecha para que las etiquetas finales de línea no se corten
                padding: {
                    top: 10,
                    right: 80, 
                    bottom: 10
                }
            },
            plugins: {
                legend: {
                    display: false // Mantenemos la leyenda tradicional oculta
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`
                    }
                }
            },
            scales: {
                y: { 
                    title: { display: true, text: 'Porcentaje de la Población Total(%)' },
                    ticks: { color: '#cbd5e1' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: { 
                    title: { display: true, text: 'Año' },
                    ticks: { color: '#cbd5e1' },
                    grid: { display: false } // Ocultamos las líneas de cuadrícula verticales para limpiar el texto
                }
            }
        }
    });
}