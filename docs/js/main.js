// Variable global para almacenar la instancia del gráfico de pastel y no superponerlos
let chartPastel = null;

Papa.parse("./data/Evolucion_Poblacional.csv", {
  download: true,
  header: true,
  dynamicTyping: true,
  complete: function (results) {
    const datos = results.data;
    crearGrafico(datos);
  },
});

function crearGrafico(datos) {
  const datosLimpios = datos.filter((fila) => fila.AÑO != null);
  const años = [...new Set(datosLimpios.map((fila) => fila.AÑO))];

  const pobJovenes = datosLimpios
    .filter((fila) => fila.Grupo_Edad === "0-17")
    .map((fila) => fila.POBLACION);

  const pobMayores = datosLimpios
    .filter((fila) => fila.Grupo_Edad === "60+")
    .map((fila) => fila.POBLACION);

  const totalesPorAño = datosLimpios
    .filter((fila) => fila.Grupo_Edad === "0-17")
    .map((fila) => fila.TOTAL);

  const pctJovenes = datosLimpios
    .filter((fila) => fila.Grupo_Edad === "0-17")
    .map((fila) => fila.PORCENTAJE);

  const pctMayores = datosLimpios
    .filter((fila) => fila.Grupo_Edad === "60+")
    .map((fila) => fila.PORCENTAJE);

  const index2024 = años.indexOf(2024);
  let indiceReproduccion = -1;
  let añoHoverActual = -1;

  // ==========================================
  // INICIALIZACIÓN DEL GRÁFICO DE BARRAS APILADAS
  // ==========================================
  const ctxBarra = document.getElementById("miGraficoBarra").getContext("2d");
  const initJovenes = pobJovenes[0];
  const initMayores = pobMayores[0];
  const initResto = totalesPorAño[0] - initJovenes - initMayores;

  document.getElementById("tituloBarra").innerText = `Población en ${años[0]}`;

  let chartBarra = new Chart(ctxBarra, {
    type: "bar",
    data: {
      labels: ["Total"], 
      datasets: [
        { label: "0-17 años", data: [initJovenes], backgroundColor: "#36A2EB" },
        { label: "Resto de la población", data: [initResto], backgroundColor: "rgba(255, 255, 255, 0.2)" },
        { label: "60+ años", data: [initMayores], backgroundColor: "#FF9800" },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, 
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const valor = context.parsed.y;
              
              // Sumamos los datos de las 3 porciones de la barra para obtener el 100%
              let totalPoblacion = 0;
              context.chart.data.datasets.forEach((dataset) => {
                totalPoblacion += dataset.data[0]; 
              });

              // Calculamos el porcentaje
              const porcentaje = ((valor / totalPoblacion) * 100).toFixed(1);

              // Retornamos el string con el formato deseado
              return ` ${context.dataset.label}: ${valor.toLocaleString("es-CL")} (${porcentaje}%)`;
            },
          },
        },
      },
      scales: {
        y: {
          stacked: true, 
          beginAtZero: true,
          max: 22000000, 
          ticks: {
            stepSize: 2000000,
            color: "#cbd5e1",
            callback: function (value) { return (value / 1000000).toFixed(0) + "M"; },
          },
          grid: { color: "rgba(255, 255, 255, 0.05)" },
          border: { display: false } 
        },
        x: { stacked: true, ticks: { display: false }, grid: { display: false }, border: { display: false } },
      },
    },
  });

  // ==========================================
  // VARIABLES Y LÓGICA DE TONE.JS (Global para todo el gráfico)
  // ==========================================
  let synthJovenes = null; 
  let synthMayores = null; 
  let loopSonoro = null;
  const notasJovenes = ["C5", "E5", "G5", "B5", "D6", "F6"];
  const notasMayores = ["C2", "E2", "G2", "B2", "D3", "F3"];

  // Función auxiliar para inicializar sintetizadores de forma segura
  const inicializarSintetizadores = async () => {
    await Tone.start();
    if (!synthJovenes) {
      synthJovenes = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.01, decay: 0.05, sustain: 0, release: 0.1 } }).toDestination();
      synthJovenes.volume.value = -12;
      synthMayores = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.025, decay: 0.05, sustain: 0, release: 0.1 } }).toDestination();
      synthMayores.volume.value = 0;
    }
  };


  // ==========================================
  // PLUGINS Y GRÁFICO PRINCIPAL
  // ==========================================
  const pluginProyeccion = {
    id: "lineaProyeccion",
    beforeDraw: (chart) => {
      if (index2024 === -1) return;
      const { ctx, chartArea: { top, bottom, right }, scales: { x } } = chart;
      const xPos = x.getPixelForValue(index2024);
      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
      ctx.fillRect(xPos, top, right - xPos, bottom - top);
      ctx.beginPath();
      ctx.moveTo(xPos, top);
      ctx.lineTo(xPos, bottom);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = "12px Arial";
      ctx.fillText("  Proyecciones ➔", xPos + 5, top + 15);
      ctx.restore();
    },
  };

  const pluginEtiquetasFinales = {
    id: "etiquetasFinales",
    afterDraw: (chart) => {
      const { ctx } = chart;
      ctx.save();
      chart.data.datasets.forEach((dataset, i) => {
        const meta = chart.getDatasetMeta(i);
        const ultimoPunto = meta.data[meta.data.length - 1];
        if (ultimoPunto && !ultimoPunto.skip) {
          ctx.fillStyle = dataset.borderColor;
          ctx.font = "bold 14px sans-serif";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(dataset.label, ultimoPunto.x + 10, ultimoPunto.y);
        }
      });
      ctx.restore();
    },
  };

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
      ctx.fillStyle = "white";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(años[indiceReproduccion], xPos, top - 10);
      ctx.restore();
    },
  };

  const ctx = document.getElementById("miGrafico").getContext("2d");
  Chart.defaults.color = "#cbd5e1";

  const miGrafico = new Chart(ctx, {
    type: "line",
    data: {
      labels: años,
      datasets: [
        { label: "0-17 años", data: pobJovenes, borderColor: "#36A2EB", backgroundColor: "rgba(54, 162, 235, 0.4)", fill: false, borderWidth: 2, pointRadius: 0, pointHitRadius: 10, tension: 0.4 },
        { label: "60+ años", data: pobMayores, borderColor: "#FF9800", backgroundColor: "rgba(255, 152, 0, 0.4)", fill: false, borderWidth: 2, pointRadius: 0, pointHitRadius: 10, tension: 0.4 },
      ],
    },
    plugins: [
      pluginProyeccion, pluginEtiquetasFinales, pluginCursorSonoro,
      {
        id: "contextoTexto",
        afterDraw: (chart) => {
          const { ctx, chartArea: { top }, scales: { x } } = chart;
          if (index2024 === -1) return;
          const xBase = x.getPixelForValue(index2024);
          const yBase = top;
          const bloquesTexto = [
            { text: "RESUMEN DEMOGRÁFICO: ", x: 15, y: 50, font: "bold 13px sans-serif", color: "#cbd5e1" },
            { text: "A partir de 2024, las proyecciones muestran", x: 15, y: 65, font: "12px sans-serif", color: "#cbd5e1" },
            { text: "un cruce clave.", x: 15, y: 80, font: "12px sans-serif", color: "#cbd5e1" },
            { text: "Población 0-17 años:", x: 220, y: 285, font: "bold 12px sans-serif", color: "#36A2EB" },
            { text: "Tendencia al descenso continuo.", x: 220, y: 300, font: "12px sans-serif", color: "#cbd5e1" },
            { text: "Población 60+ años:", x: 220, y: 140, font: "bold 12px sans-serif", color: "#FF9800" },
            { text: "Crecimiento acelerado proyectado.", x: 220, y: 155, font: "12px sans-serif", color: "#cbd5e1" },
            { text: "* Datos post-2024 son estimaciones", x: 200, y: 350, font: "italic 11px sans-serif", color: "#64748b" },
          ];
          ctx.save();
          ctx.textAlign = "left"; ctx.textBaseline = "top";
          bloquesTexto.forEach((block) => {
            ctx.font = block.font; ctx.fillStyle = block.color;
            ctx.fillText(block.text, xBase + block.x, yBase + block.y);
          });
          ctx.restore();
        },
      },
    ],
    options: {
      onHover: (event, elements, chart) => {
        if (elements.length > 0) {
          const dataIndex = elements[0].index;
          if (dataIndex !== añoHoverActual) {
            añoHoverActual = dataIndex;
            const añoHover = chart.data.labels[dataIndex];
            const j = pobJovenes[dataIndex];
            const m = pobMayores[dataIndex];
            const t = totalesPorAño[dataIndex];
            const r = t - j - m;
            document.getElementById("tituloBarra").innerText = `Población en ${añoHover}`;
            chartBarra.data.datasets[0].data = [j];
            chartBarra.data.datasets[1].data = [r];
            chartBarra.data.datasets[2].data = [m];
            chartBarra.update();
          }
        }
      },
      onClick: async (event, elements, chart) => {
        if (elements.length > 0) {
          const datasetIndex = elements[0].datasetIndex;
          const dataIndex = elements[0].index;
          const año = chart.data.labels[dataIndex];
          const poblacion = chart.data.datasets[datasetIndex].data[dataIndex];
          const etiqueta = chart.data.datasets[datasetIndex].label;
          const colorLinea = chart.data.datasets[datasetIndex].borderColor;
          const poblacionTotalDelAño = totalesPorAño[dataIndex];
          const xCoord = elements[0].element.x;
          const yCoord = elements[0].element.y;

          generarGraficoPastel(año, etiqueta, poblacion, poblacionTotalDelAño, colorLinea, xCoord, yCoord);

          // 2. NUEVA LÓGICA DE FEEDBACK SONORO AL CLIC (Basada en densidad/cantidad)
          await inicializarSintetizadores();
          
          // Rescatamos el porcentaje real para mantener la escala sonora
          const porcentajeReal = (datasetIndex === 0) ? pctJovenes[dataIndex] : pctMayores[dataIndex];
          
          const divisor = 8; 
          const exponente = 1.5;
          const cantidadSonidos = Math.max(1, Math.floor(Math.pow(porcentajeReal / divisor, exponente))) * 2;
          
          // Definimos una ventana de tiempo corta para el "cluster" de clics (0.25 segundos)
          const duracionPaso = 0.5; 

          if (datasetIndex === 0) {
              // Clic en línea de Jóvenes
              for (let i = 0; i < cantidadSonidos; i++) {
                  const desfase = Math.random() * duracionPaso;
                  const notaAleatoria = notasJovenes[Math.floor(Math.random() * notasJovenes.length)];
                  // Usamos Tone.now() para disparar en relación al tiempo actual exacto
                  synthJovenes.triggerAttackRelease(notaAleatoria, "32n", Tone.now() + desfase);
              }
          } else {
              // Clic en línea de Mayores
              for (let i = 0; i < cantidadSonidos; i++) {
                  const desfase = Math.random() * duracionPaso;
                  const notaAleatoria = notasMayores[Math.floor(Math.random() * notasMayores.length)];
                  synthMayores.triggerAttackRelease(notaAleatoria, "16n", Tone.now() + desfase);
              }
          }

        }
      },
      responsive: true,
      layout: { padding: { top: 10, right: 80, bottom: 10 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${context.parsed.y.toLocaleString("es-CL")} personas`,
          },
        },
      },
      scales: {
        y: { 
            title: { display: true, text: "Población (N° de personas)" },
            ticks: { color: "#cbd5e1", callback: function (value) { return value.toLocaleString("es-CL"); } },
            grid: { color: "rgba(255, 255, 255, 0.05)" },
        },
        x: { title: { display: true, text: "Año" }, ticks: { color: "#cbd5e1" }, grid: { display: false } },
      },
    },
  });

  // ==========================================
  // LÓGICA DE CIERRE AL CLICKEAR AFUERA
  // ==========================================
  document.addEventListener("mousedown", function(event) {
    const contenedor = document.getElementById("contenedorPastel");
    const canvasPrincipal = document.getElementById("miGrafico");
    
    if (contenedor.style.display === "block" && 
        !contenedor.contains(event.target) && 
        event.target !== canvasPrincipal) {
      contenedor.style.display = "none";
    }
  });

  // ==========================================
  // BOTONES DE REPRODUCCIÓN Y PAUSA
  // ==========================================
  const btnReproducir = document.getElementById("btnReproducir");
  const btnPausa = document.getElementById("btnPausa"); 

  btnReproducir.addEventListener("click", async () => {
    await inicializarSintetizadores();
    
    if (indiceReproduccion >= años.length || indiceReproduccion === -1) { indiceReproduccion = 0; }
    btnReproducir.disabled = true; btnPausa.disabled = false;
    btnReproducir.innerText = "Reproduciendo..."; btnPausa.innerText = "⏸ Pausar";

    if (!loopSonoro) {
      loopSonoro = new Tone.Loop((time) => {
        if (indiceReproduccion >= años.length) {
          Tone.Transport.stop(); indiceReproduccion = -1; miGrafico.update("none");
          btnReproducir.disabled = false; btnPausa.disabled = true;
          btnReproducir.innerText = "▶ Escuchar Evolución Poblacional"; return;
        }
        const valorJovenes = pctJovenes[indiceReproduccion];
        const valorMayores = pctMayores[indiceReproduccion];
        const divisor = 8; const exponente = 1.5;
        const cantJovenes = Math.max(1, Math.floor(Math.pow(valorJovenes / divisor, exponente)));
        const cantMayores = Math.max(1, Math.floor(Math.pow(valorMayores / divisor, exponente)));
        const duracionPaso = Tone.Time("8n").toSeconds();

        for (let i = 0; i < cantJovenes; i++) {
          const desfase = Math.random() * duracionPaso * 0.8;
          const notaAleatoria = notasJovenes[Math.floor(Math.random() * notasJovenes.length)];
          synthJovenes.triggerAttackRelease(notaAleatoria, "32n", time + desfase);
        }
        for (let i = 0; i < cantMayores; i++) {
          const desfase = Math.random() * duracionPaso * 0.8;
          const notaAleatoria = notasMayores[Math.floor(Math.random() * notasMayores.length)];
          synthMayores.triggerAttackRelease(notaAleatoria, "16n", time + desfase);
        }
        const jAudio = pobJovenes[indiceReproduccion];
        const mAudio = pobMayores[indiceReproduccion];
        const rAudio = totalesPorAño[indiceReproduccion] - jAudio - mAudio;
        document.getElementById("tituloBarra").innerText = `Población en ${años[indiceReproduccion]}`;
        chartBarra.data.datasets[0].data = [jAudio]; chartBarra.data.datasets[1].data = [rAudio]; chartBarra.data.datasets[2].data = [mAudio];
        chartBarra.update(); miGrafico.update("none"); indiceReproduccion++;
      }, "8n");
      Tone.Transport.bpm.value = 110; loopSonoro.start(0);
    }
    Tone.Transport.start();
  });

  btnPausa.addEventListener("click", () => {
    if (Tone.Transport.state === "started") { Tone.Transport.pause(); btnPausa.innerText = "▶ Reanudar"; btnReproducir.innerText = "En Pausa"; } 
    else { Tone.Transport.start(); btnPausa.innerText = "⏸ Pausar"; btnReproducir.innerText = "Reproduciendo..."; }
  });
}

// ==========================================
// LÓGICA DEL GRÁFICO DE PASTEL FLOTANTE 
// ==========================================
function generarGraficoPastel(año, etiqueta, poblacion, poblacionTotalDelAño, colorPrincipal, x, y) {
  const contenedor = document.getElementById("contenedorPastel");
  const titulo = document.getElementById("tituloPastel");
  const ctxPastel = document.getElementById("miGraficoPastel").getContext("2d");

  const canvasWidth = document.getElementById("miGrafico").clientWidth;
  const anchoContenedor = 200;
  let posLeft = x + 15; let posTop = y + 15;
  if (posLeft + anchoContenedor > canvasWidth) { posLeft = x - anchoContenedor - 15; }

  contenedor.style.left = `${posLeft}px`;
  contenedor.style.top = `${posTop}px`;
  contenedor.style.display = "block";
  
  titulo.innerHTML = `<span style="color:${colorPrincipal}">${etiqueta}</span> en ${año}<br><small style="font-weight:normal; opacity:0.8">vs Población Total</small>`;

  const restoPoblacion = poblacionTotalDelAño - poblacion;
  if (chartPastel) { chartPastel.destroy(); }

  chartPastel = new Chart(ctxPastel, {
    type: "pie",
    data: {
      labels: [etiqueta, "Resto de Chile"],
      datasets: [{
        data: [poblacion, restoPoblacion],
        backgroundColor: [colorPrincipal, "#1e293b"],
        borderColor: "rgba(255, 255, 255, 0.2)",
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false, 
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0,0,0,0.8)',
          callbacks: {
            label: (context) => {
              const valor = context.parsed;
              const porcentaje = ((valor / poblacionTotalDelAño) * 100).toFixed(1);
              return ` ${context.label}: ${valor.toLocaleString("es-CL")} (${porcentaje}%)`;
            },
          },
        },
      },
    },
  });
}