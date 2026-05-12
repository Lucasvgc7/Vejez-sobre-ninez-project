// Variable global para almacenar la instancia del gráfico de pastel y no superponerlos
let chartPastel = null;

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

    // Variable para controlar la posición de la música y la línea de tiempo
    let indiceReproduccion = -1;

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

    // PLUGIN 3: Cursor de reproducción (se mueve con el audio)
    const pluginCursorSonoro = {
        id: "cursorSonoro",
        afterDraw: (chart) => {
            if (indiceReproduccion === -1) return;
            const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
            const xPos = x.getPixelForValue(indiceReproduccion);

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(xPos, top);
            ctx.lineTo(xPos, bottom);
            ctx.lineWidth = 3;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
            ctx.stroke();

            // Dibujar el año actual flotando
            ctx.fillStyle = "white";
            ctx.font = "bold 14px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(años[indiceReproduccion], xPos, top - 10);
            ctx.restore();
        },
    };

    const ctx = document.getElementById('miGrafico').getContext('2d');
    
    Chart.defaults.color = '#cbd5e1'; 
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)'; 

    const miGrafico = new Chart(ctx, {
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
        // Cargamos todos los plugins (los externos y el inline)
        plugins: [pluginProyeccion, pluginEtiquetasFinales, pluginCursorSonoro, 
            // NUEVO PLUGIN: Texto de Contexto Interior (Mantenido intacto)
            {
                id: 'contextoTexto',
                afterDraw: (chart) => {
                    const { ctx, chartArea: { top }, scales: { x } } = chart;
                    if (index2024 === -1) return;

                    // Punto de anclaje (Línea de 2024)
                    const xBase = x.getPixelForValue(index2024);
                    const yBase = top;

                    // CONFIGURACIÓN MANUAL DE POSICIÓN
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
                        
                        // Nota adicional
                        { text: '* Datos post-2024 son estimaciones', x: 200, y: 350, font: 'italic 11px sans-serif', color: '#64748b' }
                    ];

                    ctx.save();
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';

                    bloquesTexto.forEach(block => {
                        ctx.font = block.font;
                        ctx.fillStyle = block.color;
                        ctx.fillText(block.text, xBase + block.x, yBase + block.y);
                    });

                    ctx.restore();
                }
            }
        ], 
        options: {
            // EVENTO ONCLICK: Captura la posición exacta del nodo para el gráfico de pastel
            onClick: (event, elements, chart) => {
                if (elements.length > 0) {
                    const datasetIndex = elements[0].datasetIndex;
                    const dataIndex = elements[0].index;

                    const año = chart.data.labels[dataIndex];
                    const porcentaje = chart.data.datasets[datasetIndex].data[dataIndex];
                    const etiqueta = chart.data.datasets[datasetIndex].label;
                    const colorLinea = chart.data.datasets[datasetIndex].borderColor;

                    // Coordenadas exactas relativas al canvas
                    const xCoord = elements[0].element.x;
                    const yCoord = elements[0].element.y;

                    generarGraficoPastel(año, etiqueta, porcentaje, colorLinea, xCoord, yCoord);
                }
            },
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
                    grid: { display: false } // Ocultamos las líneas de cuadrícula verticales
                }
            }
        }
    });

    // --- LÓGICA DE TONE.JS (Por Cantidad/Densidad Exponencial) ---
    const btnReproducir = document.getElementById("btnReproducir");

    btnReproducir.addEventListener("click", async () => {
        await Tone.start();

        btnReproducir.disabled = true;
        btnReproducir.innerText = "Reproduciendo...";
        indiceReproduccion = 0;

        Tone.Transport.cancel();
        Tone.Transport.stop();

        // Sintetizadores con volumen fijo
        const synthJovenes = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "triangle" }, 
            envelope: { attack: 0.01, decay: 0.05, sustain: 0, release: 0.1 }, 
        }).toDestination();
        synthJovenes.volume.value = -12;

        const synthMayores = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "triangle" }, 
            envelope: { attack: 0.025, decay: 0.05, sustain: 0, release: 0.1 },
        }).toDestination();
        synthMayores.volume.value = -6;

        const notasJovenes = ["C5", "E5", "G5", "B5", "D6", "F6"];
        const notasMayores = ["C2", "E2", "G2", "B2", "D3", "F3"];

        // Ciclo de reproducción
        const loop = new Tone.Loop((time) => {
            if (indiceReproduccion >= años.length) {
                Tone.Transport.stop();
                indiceReproduccion = -1;
                miGrafico.update("none");
                btnReproducir.disabled = false;
                btnReproducir.innerText = "▶ Escuchar Evolución Poblacional";
                return;
            }

            const pctJovenes = datosJovenes[indiceReproduccion];
            const pctMayores = datosMayores[indiceReproduccion];

            // Mapeo Exponencial de densidad
            const divisor = 8;
            const exponente = 1.5;

            const cantJovenes = Math.max(1, Math.floor(Math.pow(pctJovenes / divisor, exponente)));
            const cantMayores = Math.max(1, Math.floor(Math.pow(pctMayores / divisor, exponente)));

            const duracionPaso = Tone.Time("8n").toSeconds();

            // Disparar jóvenes
            for (let i = 0; i < cantJovenes; i++) {
                const desfase = Math.random() * duracionPaso * 0.8;
                const notaAleatoria = notasJovenes[Math.floor(Math.random() * notasJovenes.length)];
                synthJovenes.triggerAttackRelease(notaAleatoria, "32n", time + desfase);
            }

            // Disparar mayores
            for (let i = 0; i < cantMayores; i++) {
                const desfase = Math.random() * duracionPaso * 0.8;
                const notaAleatoria = notasMayores[Math.floor(Math.random() * notasMayores.length)];
                synthMayores.triggerAttackRelease(notaAleatoria, "16n", time + desfase);
            }

            miGrafico.update("none");
            indiceReproduccion++;
        }, "8n");

        Tone.Transport.bpm.value = 110; 
        loop.start(0);
        Tone.Transport.start();
    });
}

// ==========================================
// LÓGICA DEL GRÁFICO DE PASTEL FLOTANTE
// ==========================================
function generarGraficoPastel(año, etiqueta, porcentaje, colorPrincipal, x, y) {
    const contenedor = document.getElementById("contenedorPastel");
    const titulo = document.getElementById("tituloPastel");
    const ctxPastel = document.getElementById("miGraficoPastel").getContext("2d");

    // Posicionamiento dinámico basado en las coordenadas exactas del punto
    const canvasWidth = document.getElementById("miGrafico").clientWidth;
    const anchoContenedor = 220; 

    let posLeft = x + 15;
    let posTop = y + 15;

    // Evitar que se salga del canvas por la derecha
    if (posLeft + anchoContenedor > canvasWidth) {
        posLeft = x - anchoContenedor - 15;
    }

    contenedor.style.left = `${posLeft}px`;
    contenedor.style.top = `${posTop}px`;

    contenedor.style.display = "block";
    titulo.innerText = `Distribución en ${año}\n(${etiqueta})`;

    const restoPoblacion = 100 - porcentaje;

    if (chartPastel) {
        chartPastel.destroy();
    }

    chartPastel = new Chart(ctxPastel, {
        type: "pie",
        data: {
            labels: [etiqueta, "Resto de la población"],
            datasets: [{
                data: [porcentaje, restoPoblacion],
                backgroundColor: [colorPrincipal, "rgba(255, 255, 255, 0.1)"],
                borderColor: "rgba(255, 255, 255, 0.2)",
                borderWidth: 1,
            }],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { color: "#cbd5e1" },
                },
                tooltip: {
                    callbacks: {
                        label: (context) => ` ${context.label}: ${context.parsed.toFixed(2)}%`,
                    },
                },
            },
        },
    });
}