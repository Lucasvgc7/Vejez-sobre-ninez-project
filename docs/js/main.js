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

    // PLUGIN 2: Anotaciones de texto finales
    const pluginEtiquetasFinales = {
        id: 'etiquetasFinales',
        afterDraw: (chart) => {
            const { ctx } = chart;
            ctx.save();
            chart.data.datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                const ultimoPunto = meta.data[meta.data.length - 1];
                if (ultimoPunto && !ultimoPunto.skip) {
                    ctx.fillStyle = dataset.borderColor;
                    ctx.font = 'bold 14px sans-serif';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(dataset.label, ultimoPunto.x + 10, ultimoPunto.y);
                }
            });
            ctx.restore();
        }
    };

    // PLUGIN 3: Cursor de reproducción (se mueve con el audio)
    const pluginCursorSonoro = {
        id: 'cursorSonoro',
        afterDraw: (chart) => {
            if (indiceReproduccion === -1) return;
            const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
            const xPos = x.getPixelForValue(indiceReproduccion);
            
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(xPos, top);
            ctx.lineTo(xPos, bottom);
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.stroke();
            
            // Dibujar el año actual flotando
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(años[indiceReproduccion], xPos, top - 10);
            ctx.restore();
        }
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
                    label: '0-17 años',
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
        plugins: [pluginProyeccion, pluginEtiquetasFinales, pluginCursorSonoro], 
        options: {
            responsive: true,
            layout: { padding: { top: 25, right: 80, bottom: 10 } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`
                    }
                }
            },
            scales: {
                y: { 
                    title: { display: true, text: 'Porcentaje de la Población Total (%)' },
                    ticks: { color: '#cbd5e1' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                x: { 
                    title: { display: true, text: 'Año' },
                    ticks: { color: '#cbd5e1' },
                    grid: { display: false }
                }
            }
        }
    });

// --- LÓGICA DE TONE.JS (Por Cantidad/Densidad) ---
    const btnReproducir = document.getElementById('btnReproducir');
    
    btnReproducir.addEventListener('click', async () => {
        await Tone.start();
        
        btnReproducir.disabled = true;
        btnReproducir.innerText = "Reproduciendo...";
        indiceReproduccion = 0;

        Tone.Transport.cancel();
        Tone.Transport.stop();

        // 1. Sintetizadores con volumen fijo
        // Usamos PolySynth para poder tocar múltiples notas al mismo tiempo sin que se corten.
        // Se reduce el volumen general (volume.value) para evitar saturación cuando se apilan muchas notas.
        
        const synthJovenes = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "triangle" }, // Agudo
            envelope: { attack: 0.01, decay: 0.05, sustain: 0, release: 0.1 } // Sonidos cortos y rápidos
        }).toDestination();
        synthJovenes.volume.value = -12; 

        const synthMayores = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "triangle" }, // Grave
            envelope: { attack: 0.025, decay: 0.05, sustain: 0, release: 0.1 }
        }).toDestination();
        synthMayores.volume.value = -2;

        // Notas posibles para generar un efecto de "multitud" en lugar de repetir siempre el mismo tono
        const notasJovenes = ["C5", "E5", "G5", "B5", "D6", "F6"];
        const notasMayores = ["C2", "E2", "G2", "B2", "D3", "F3"];

        // 2. Ciclo de reproducción
        const loop = new Tone.Loop((time) => {
            if (indiceReproduccion >= años.length) {
                Tone.Transport.stop();
                indiceReproduccion = -1;
                miGrafico.update('none');
                btnReproducir.disabled = false;
                btnReproducir.innerText = "▶ Escuchar Evolución Poblacional";
                return;
            }

            const pctJovenes = datosJovenes[indiceReproduccion];
            const pctMayores = datosMayores[indiceReproduccion];

            // 3. Mapear porcentaje a CANTIDAD de sonidos
            // Dividimos por 5 para escalar. Ej: 30% -> 6 sonidos. 10% -> 2 sonidos.
            // Math.max asegura que siempre suene al menos 1 nota si hay datos.
            const cantJovenes = Math.max(1, Math.round(pctJovenes / 5));
            const cantMayores = Math.max(1, Math.round(pctMayores / 5));

            // Calculamos cuánto dura el "paso" actual para distribuir los sonidos en ese espacio
            const duracionPaso = Tone.Time("8n").toSeconds();

            // Disparar las notas de los jóvenes
            for (let i = 0; i < cantJovenes; i++) {
                // Desfase aleatorio para que no suenen todas exactamente en el mismo milisegundo (efecto orgánico)
                const desfase = Math.random() * duracionPaso * 0.8; 
                const notaAleatoria = notasJovenes[Math.floor(Math.random() * notasJovenes.length)];
                
                synthJovenes.triggerAttackRelease(notaAleatoria, "32n", time + desfase);
            }

            // Disparar las notas de los mayores
            for (let i = 0; i < cantMayores; i++) {
                const desfase = Math.random() * duracionPaso * 0.8; 
                const notaAleatoria = notasMayores[Math.floor(Math.random() * notasMayores.length)];
                
                synthMayores.triggerAttackRelease(notaAleatoria, "16n", time + desfase);
            }

            miGrafico.update('none');
            indiceReproduccion++;
        }, "8n"); 

        Tone.Transport.bpm.value = 110; // Reduje un poco el tempo para que se aprecien mejor las "multitudes" de notas
        loop.start(0);
        Tone.Transport.start();
    });
}