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

  // --- SEPARACIÓN DE DATOS ---
  // 1. Datos para el Gráfico Visual (Números absolutos de población)
  const pobJovenes = datosLimpios
    .filter((fila) => fila.Grupo_Edad === "0-17")
    .map((fila) => fila.POBLACION);

  const pobMayores = datosLimpios
    .filter((fila) => fila.Grupo_Edad === "60+")
    .map((fila) => fila.POBLACION);

  // 2. Totales poblacionales por año (Para calcular el resto en el gráfico de pastel)
  const totalesPorAño = datosLimpios
    .filter((fila) => fila.Grupo_Edad === "0-17") // Usamos un grupo de filtro solo para obtener 1 registro por año
    .map((fila) => fila.TOTAL);

  // 3. Datos para el Audio (Porcentajes para evitar que Tone.js colapse con números en millones)
  const pctJovenes = datosLimpios
    .filter((fila) => fila.Grupo_Edad === "0-17")
    .map((fila) => fila.PORCENTAJE);

  const pctMayores = datosLimpios
    .filter((fila) => fila.Grupo_Edad === "60+")
    .map((fila) => fila.PORCENTAJE);

  // Buscamos en qué posición está el año 2024
  const index2024 = años.indexOf(2024);

  // Variable para controlar la posición de la música y la línea de tiempo
  let indiceReproduccion = -1;

  // PLUGIN 1: Línea de proyecciones
  const pluginProyeccion = {
    id: "lineaProyeccion",
    beforeDraw: (chart) => {
      if (index2024 === -1) return;
      const {
        ctx,
        chartArea: { top, bottom, right },
        scales: { x },
      } = chart;
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

  // PLUGIN 2: Anotaciones de texto al final de cada línea
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

  // PLUGIN 3: Cursor de reproducción (se mueve con el audio)
  const pluginCursorSonoro = {
    id: "cursorSonoro",
    afterDraw: (chart) => {
      if (indiceReproduccion === -1) return;
      const {
        ctx,
        chartArea: { top, bottom },
        scales: { x },
      } = chart;
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
  Chart.defaults.borderColor = "rgba(255, 255, 255, 0.1)";

  const miGrafico = new Chart(ctx, {
    type: "line",
    data: {
      labels: años,
      datasets: [
        {
          label: "0-17 años",
          data: pobJovenes, // Usamos la Población Absoluta
          borderColor: "#36A2EB",
          backgroundColor: "rgba(54, 162, 235, 0.4)",
          fill: false,
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          tension: 0.4,
        },
        {
          label: "60+ años",
          data: pobMayores, // Usamos la Población Absoluta
          borderColor: "#FF9800",
          backgroundColor: "rgba(255, 152, 0, 0.4)",
          fill: false,
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          tension: 0.4,
        },
      ],
    },
    plugins: [
      pluginProyeccion,
      pluginEtiquetasFinales,
      pluginCursorSonoro,
      {
        id: "contextoTexto",
        afterDraw: (chart) => {
          const {
            ctx,
            chartArea: { top },
            scales: { x },
          } = chart;
          if (index2024 === -1) return;

          const xBase = x.getPixelForValue(index2024);
          const yBase = top;

          const bloquesTexto = [
            {
              text: "RESUMEN DEMOGRÁFICO: ",
              x: 15,
              y: 50,
              font: "bold 13px sans-serif",
              color: "#cbd5e1",
            },
            {
              text: "A partir de 2024, las proyecciones muestran",
              x: 15,
              y: 65,
              font: "12px sans-serif",
              color: "#cbd5e1",
            },
            {
              text: "un cruce clave.",
              x: 15,
              y: 80,
              font: "12px sans-serif",
              color: "#cbd5e1",
            },

            {
              text: "Población 0-17 años:",
              x: 220,
              y: 285,
              font: "bold 12px sans-serif",
              color: "#36A2EB",
            },
            {
              text: "Tendencia al descenso continuo.",
              x: 220,
              y: 300,
              font: "12px sans-serif",
              color: "#cbd5e1",
            },

            {
              text: "Población 60+ años:",
              x: 220,
              y: 120,
              font: "bold 12px sans-serif",
              color: "#FF9800",
            },
            {
              text: "Crecimiento acelerado proyectado.",
              x: 220,
              y: 135,
              font: "12px sans-serif",
              color: "#cbd5e1",
            },

            {
              text: "* Datos post-2024 son estimaciones",
              x: 200,
              y: 350,
              font: "italic 11px sans-serif",
              color: "#64748b",
            },
          ];

          ctx.save();
          ctx.textAlign = "left";
          ctx.textBaseline = "top";

          bloquesTexto.forEach((block) => {
            ctx.font = block.font;
            ctx.fillStyle = block.color;
            ctx.fillText(block.text, xBase + block.x, yBase + block.y);
          });

          ctx.restore();
        },
      },
    ],
    options: {
      onClick: (event, elements, chart) => {
        if (elements.length > 0) {
          const datasetIndex = elements[0].datasetIndex;
          const dataIndex = elements[0].index;

          const año = chart.data.labels[dataIndex];
          const poblacion = chart.data.datasets[datasetIndex].data[dataIndex];
          const etiqueta = chart.data.datasets[datasetIndex].label;
          const colorLinea = chart.data.datasets[datasetIndex].borderColor;

          // Extraemos el total de población de ese año exacto
          const poblacionTotalDelAño = totalesPorAño[dataIndex];

          const xCoord = elements[0].element.x;
          const yCoord = elements[0].element.y;

          // Ahora pasamos la población y el total del año a la función del pastel
          generarGraficoPastel(
            año,
            etiqueta,
            poblacion,
            poblacionTotalDelAño,
            colorLinea,
            xCoord,
            yCoord,
          );
        }
      },
      responsive: true,
      layout: {
        padding: { top: 10, right: 80, bottom: 10 },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            // Formateamos el número para que tenga puntos de miles (Ej: 3.500.000)
            label: (context) =>
              `${context.dataset.label}: ${context.parsed.y.toLocaleString("es-CL")} personas`,
          },
        },
      },
      scales: {
        y: {
          title: { display: true, text: "Población (N° de personas)" }, // Cambiado el título del eje
          ticks: {
            color: "#cbd5e1",
            // Agregamos puntos de miles al eje Y también
            callback: function (value) {
              return value.toLocaleString("es-CL");
            },
          },
          grid: { color: "rgba(255, 255, 255, 0.05)" },
        },
        x: {
          title: { display: true, text: "Año" },
          ticks: { color: "#cbd5e1" },
          grid: { display: false },
        },
      },
    },
  });

  // --- LÓGICA DE TONE.JS ---
  const btnReproducir = document.getElementById("btnReproducir");

  btnReproducir.addEventListener("click", async () => {
    await Tone.start();

    btnReproducir.disabled = true;
    btnReproducir.innerText = "Reproduciendo...";
    indiceReproduccion = 0;

    Tone.Transport.cancel();
    Tone.Transport.stop();

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

    const loop = new Tone.Loop((time) => {
      if (indiceReproduccion >= años.length) {
        Tone.Transport.stop();
        indiceReproduccion = -1;
        miGrafico.update("none");
        btnReproducir.disabled = false;
        btnReproducir.innerText = "▶ Escuchar Evolución Poblacional";
        return;
      }

      // AQUI USAMOS LOS PORCENTAJES (Para mantener controlada la densidad de notas)
      const valorJovenes = pctJovenes[indiceReproduccion];
      const valorMayores = pctMayores[indiceReproduccion];

      const divisor = 8;
      const exponente = 1.5;

      const cantJovenes = Math.max(
        1,
        Math.floor(Math.pow(valorJovenes / divisor, exponente)),
      );
      const cantMayores = Math.max(
        1,
        Math.floor(Math.pow(valorMayores / divisor, exponente)),
      );

      const duracionPaso = Tone.Time("8n").toSeconds();

      for (let i = 0; i < cantJovenes; i++) {
        const desfase = Math.random() * duracionPaso * 0.8;
        const notaAleatoria =
          notasJovenes[Math.floor(Math.random() * notasJovenes.length)];
        synthJovenes.triggerAttackRelease(notaAleatoria, "32n", time + desfase);
      }

      for (let i = 0; i < cantMayores; i++) {
        const desfase = Math.random() * duracionPaso * 0.8;
        const notaAleatoria =
          notasMayores[Math.floor(Math.random() * notasMayores.length)];
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
// ACTUALIZADO: Ahora recibe la población y el total
function generarGraficoPastel(
  año,
  etiqueta,
  poblacion,
  poblacionTotalDelAño,
  colorPrincipal,
  x,
  y,
) {
  const contenedor = document.getElementById("contenedorPastel");
  const titulo = document.getElementById("tituloPastel");
  const ctxPastel = document.getElementById("miGraficoPastel").getContext("2d");

  const canvasWidth = document.getElementById("miGrafico").clientWidth;
  const anchoContenedor = 220;

  let posLeft = x + 15;
  let posTop = y + 15;

  if (posLeft + anchoContenedor > canvasWidth) {
    posLeft = x - anchoContenedor - 15;
  }

  contenedor.style.left = `${posLeft}px`;
  contenedor.style.top = `${posTop}px`;

  contenedor.style.display = "block";
  titulo.innerText = `Distribución en ${año}\n(${etiqueta})`;

  // Calculamos el resto usando el TOTAL de la población menos la población de este grupo
  const restoPoblacion = poblacionTotalDelAño - poblacion;

  if (chartPastel) {
    chartPastel.destroy();
  }

  chartPastel = new Chart(ctxPastel, {
    type: "pie",
    data: {
      labels: [etiqueta, "Resto de la población"],
      datasets: [
        {
          data: [poblacion, restoPoblacion],
          backgroundColor: [colorPrincipal, "rgba(255, 255, 255, 0.1)"],
          borderColor: "rgba(255, 255, 255, 0.2)",
          borderWidth: 1,
        },
      ],
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
            // Customizamos el tooltip del pie chart para mostrar el número de personas formateado
            // y calculamos el porcentaje al vuelo para que no se pierda esa información
            label: (context) => {
              const valor = context.parsed;
              const porcentaje = ((valor / poblacionTotalDelAño) * 100).toFixed(
                1,
              );
              return ` ${context.label}: ${valor.toLocaleString("es-CL")} (${porcentaje}%)`;
            },
          },
        },
      },
    },
  });
}
