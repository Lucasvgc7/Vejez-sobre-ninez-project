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
                    const { ctx, chartArea: { top, left, width }, scales: { x, y } } = chart;
                    
                    // Aseguramos que el índice 2024 existe para basar el cálculo
                    if (index2024 === -1) return;
                    
                    const x2024Pixel = x.getPixelForValue(index2024);
                    
                    // Punto de partida del texto: un poco a la derecha de la línea 2024,
                    // y un poco más abajo que la etiqueta "Proyecciones"
                    const xContexto = x2024Pixel + 10; // 15px de margen
                    let yContexto = top + 10; // Empieza 55px debajo del borde superior

                    const anchoMaxTexto = 250; // Un ancho fijo para el bloque
                    const linePadding = 18; // Espaciado entre líneas

                    ctx.save();
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';

                    // Definimos los bloques de texto con estilos (para color y negrita)
                    const bloquesTexto = [
                        { text: 'RESUMEN DEMOGRÁFICO:', font: 'bold 12px sans-serif', color: '#fff' },
                        { text: 'A partir de ', font: '13px sans-serif', color: '#cbd5e1' },
                        { text: '2024', font: 'bold 13px sans-serif', color: '#fff', sameLine: true },
                        { text: ' , las proyecciones', font: '13px sans-serif', color: '#cbd5e1', sameLine: true },
                        { text: 'muestran un cruce clave:', font: '13px sans-serif', color: '#cbd5e1' },
                        { text: '', font: '5px sans-serif', color: '#000' }, // Espacio vacío
                        { text: 'El grupo ', font: '13px sans-serif', color: '#cbd5e1' },
                        { text: '60+ años', font: 'bold 13px sans-serif', color: '#FF9800', sameLine: true },
                        { text: ' (población', font: '13px sans-serif', color: '#cbd5e1', sameLine: true },
                        { text: 'mayor) inicia un crecimiento acelerado.', font: '13px sans-serif', color: '#cbd5e1' },
                        { text: 'El grupo ', font: '13px sans-serif', color: '#cbd5e1' },
                        { text: '0-17 años', font: 'bold 13px sans-serif', color: '#36A2EB', sameLine: true },
                        { text: ' (población', font: '13px sans-serif', color: '#cbd5e1', sameLine: true },
                        { text: 'joven) continúa su descenso.', font: '13px sans-serif', color: '#cbd5e1' }
                    ];

                    // Función para dibujar el texto con soporte básico de "mismo renglón"
                    let offsetX = 0;
                    bloquesTexto.forEach(block => {
                        ctx.font = block.font;
                        ctx.fillStyle = block.color;
                        
                        if (block.sameLine) {
                            ctx.fillText(block.text, xContexto + offsetX, yContexto);
                            offsetX += ctx.measureText(block.text).width;
                        } else {
                            yContexto += linePadding; // Salto de línea
                            ctx.fillText(block.text, xContexto, yContexto);
                            offsetX = ctx.measureText(block.text).width;
                        }
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