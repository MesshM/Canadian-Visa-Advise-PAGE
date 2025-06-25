// Variables globales para los gráficos
let graficoEstado = null
let graficoModalidad = null
let graficoTipoVisa = null

// Importación de ApexCharts
const ApexCharts = window.ApexCharts

// Función para inicializar el dashboard
document.addEventListener("DOMContentLoaded", () => {
  console.log("Inicializando dashboard del asesor...")
  cargarTodasLasMetricas()
})

// Función para cargar todas las métricas
async function cargarTodasLasMetricas() {
  try {
    await Promise.all([
      cargarMetricasPrincipales(),
      cargarGraficoEstado(),
      cargarGraficoModalidad(),
      cargarGraficoTipoVisa(),
      cargarProximasAsesorias(),
    ])
    console.log("Todas las métricas cargadas exitosamente")
  } catch (error) {
    console.error("Error al cargar las métricas:", error)
    mostrarNotificacion("Error al cargar algunas métricas", "error")
  }
}

// Función para cargar las métricas principales
async function cargarMetricasPrincipales() {
  try {
    console.log("Cargando métricas principales...")
    const response = await fetch("/asesor/api/metricas-principales")

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    // Actualizar los números en las tarjetas (agregar las nuevas métricas)
    document.getElementById("totalAsesorias").textContent = data.total_asesorias || 0
    document.getElementById("asesoriasHoy").textContent = data.asesorias_hoy || 0
    document.getElementById("asesoriasSemana").textContent = data.asesorias_semana || 0
    document.getElementById("asesoriasMes").textContent = data.asesorias_mes || 0
    document.getElementById("asesoriasTerminadas").textContent = data.asesorias_terminadas || 0
    document.getElementById("asesoriasProceso").textContent = data.asesorias_proceso || 0
    document.getElementById("asesoriasPendientes").textContent = data.asesorias_pendientes || 0
    document.getElementById("tasaCompletacion").textContent = data.tasa_completacion || "0"
    document.getElementById("ingresosMes").textContent = formatearMoneda(data.ingresos_mes || 0)
    document.getElementById("calificacionPromedio").textContent = data.calificacion_promedio || "0.0"

    // Actualizar las estrellas de calificación
    actualizarEstrellas(data.calificacion_promedio || 0)

    console.log("Métricas principales cargadas:", data)
  } catch (error) {
    console.error("Error al cargar métricas principales:", error)
    mostrarNotificacion("Error al cargar métricas principales", "error")
  }
}

// Función para actualizar las estrellas de calificación
function actualizarEstrellas(calificacion) {
  const contenedorEstrellas = document.getElementById("estrellasCalificacion")
  if (!contenedorEstrellas) return

  contenedorEstrellas.innerHTML = ""

  const estrellas = Math.round(Number.parseFloat(calificacion) || 0)

  for (let i = 1; i <= 5; i++) {
    const estrella = document.createElement("svg")
    estrella.className = "w-4 h-4"
    estrella.setAttribute("fill", i <= estrellas ? "currentColor" : "none")
    estrella.setAttribute("stroke", "currentColor")
    estrella.setAttribute("viewBox", "0 0 24 24")

    estrella.innerHTML = `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-.181h4.914a1 1 0 00.951-.69l1.519-4.674z">
      </path>
    `

    contenedorEstrellas.appendChild(estrella)
  }
}

// Función para cargar el gráfico de estado de asesorías
async function cargarGraficoEstado() {
  const contenedor = document.getElementById("contenedorGraficoEstado")
  if (!contenedor) return

  try {
    console.log("Cargando gráfico de estado...")
    const response = await fetch("/asesor/api/estado-asesorias")

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    // Validar que tenemos datos válidos
    if (!data.cantidades || !Array.isArray(data.cantidades) || data.cantidades.length === 0) {
      mostrarGraficoVacio(contenedor, "No hay datos de estado disponibles")
      return
    }

    const opciones = {
      series: [
        {
          name: "Asesorías",
          data: data.cantidades,
        },
      ],
      chart: {
        type: "bar",
        height: 320,
        toolbar: {
          show: false,
        },
        fontFamily: "Inter, system-ui, sans-serif",
        background: "transparent",
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "60%",
          endingShape: "rounded",
          borderRadius: 8,
          dataLabels: {
            position: "top",
          },
        },
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: "12px",
          fontWeight: 600,
          colors: ["#374151"],
        },
        offsetY: -20,
      },
      stroke: {
        show: true,
        width: 0,
      },
      xaxis: {
        categories: data.estados || ["Sin datos"],
        labels: {
          style: {
            fontSize: "12px",
            fontWeight: 500,
            colors: "#6B7280",
          },
        },
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      yaxis: {
        title: {
          text: "Cantidad",
          style: {
            fontSize: "12px",
            fontWeight: 600,
            color: "#374151",
          },
        },
        labels: {
          style: {
            fontSize: "12px",
            colors: "#6B7280",
          },
        },
      },
      grid: {
        borderColor: "#F3F4F6",
        strokeDashArray: 3,
        xaxis: {
          lines: {
            show: false,
          },
        },
      },
      fill: {
        type: "gradient",
        gradient: {
          shade: "light",
          type: "vertical",
          shadeIntensity: 0.3,
          gradientToColors: ["#3B82F6", "#10B981", "#F59E0B"],
          inverseColors: false,
          opacityFrom: 0.9,
          opacityTo: 0.7,
        },
      },
      colors: ["#3B82F6", "#10B981", "#F59E0B"],
      tooltip: {
        theme: "light",
        style: {
          fontSize: "12px",
          fontFamily: "Inter, system-ui, sans-serif",
        },
        y: {
          formatter: (val) => val + " asesorías",
        },
      },
    }

    // Destruir gráfico anterior si existe
    if (graficoEstado) {
      graficoEstado.destroy()
    }

    contenedor.innerHTML = ""
    graficoEstado = new ApexCharts(contenedor, opciones)
    await graficoEstado.render()

    console.log("Gráfico de estado cargado:", data)
  } catch (error) {
    console.error("Error al cargar gráfico de estado:", error)
    mostrarGraficoVacio(contenedor, "Error al cargar gráfico de estado")
  }
}

// Función para cargar el gráfico de modalidad de asesorías
async function cargarGraficoModalidad() {
  const contenedor = document.getElementById("contenedorGraficoModalidad")
  if (!contenedor) return

  try {
    console.log("Cargando gráfico de modalidad...")
    const response = await fetch("/asesor/api/modalidad-asesorias")

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    // Validar que tenemos datos válidos
    if (!data.cantidades || !Array.isArray(data.cantidades) || data.cantidades.length === 0) {
      mostrarGraficoVacio(contenedor, "No hay datos de modalidad disponibles")
      return
    }

    const opciones = {
      series: data.cantidades,
      chart: {
        type: "donut",
        height: 320,
        fontFamily: "Inter, system-ui, sans-serif",
        background: "transparent",
      },
      labels: data.modalidades || ["Sin datos"],
      colors: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"],
      plotOptions: {
        pie: {
          donut: {
            size: "70%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "Total",
                fontSize: "14px",
                fontWeight: 600,
                color: "#374151",
                formatter: (w) =>
                  w.globals.seriesTotals.reduce((a, b) => {
                    return a + b
                  }, 0),
              },
              value: {
                fontSize: "24px",
                fontWeight: 700,
                color: "#1F2937",
              },
            },
          },
        },
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: "12px",
          fontWeight: 600,
          colors: ["#FFFFFF"],
        },
        dropShadow: {
          enabled: true,
          top: 1,
          left: 1,
          blur: 1,
          opacity: 0.8,
        },
      },
      legend: {
        position: "bottom",
        fontSize: "12px",
        fontWeight: 500,
        labels: {
          colors: "#374151",
        },
        markers: {
          width: 12,
          height: 12,
          radius: 6,
        },
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              width: 280,
            },
            legend: {
              position: "bottom",
            },
          },
        },
      ],
      tooltip: {
        theme: "light",
        style: {
          fontSize: "12px",
          fontFamily: "Inter, system-ui, sans-serif",
        },
        y: {
          formatter: (val) => val + " asesorías",
        },
      },
    }

    // Destruir gráfico anterior si existe
    if (graficoModalidad) {
      graficoModalidad.destroy()
    }

    contenedor.innerHTML = ""
    graficoModalidad = new ApexCharts(contenedor, opciones)
    await graficoModalidad.render()

    console.log("Gráfico de modalidad cargado:", data)
  } catch (error) {
    console.error("Error al cargar gráfico de modalidad:", error)
    mostrarGraficoVacio(contenedor, "Error al cargar gráfico de modalidad")
  }
}

// Función para cargar el gráfico de asesorías por tipo de visa
async function cargarGraficoTipoVisa() {
  const contenedor = document.getElementById("contenedorGraficoTipoVisa")
  if (!contenedor) return

  try {
    console.log("Cargando gráfico de tipo de visa...")
    const response = await fetch("/asesor/api/tipo-visa-asesorias")

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    // Validar que tenemos datos válidos
    if (!data.cantidades || !Array.isArray(data.cantidades) || data.cantidades.length === 0) {
      mostrarGraficoVacio(contenedor, "No hay datos de tipo de visa disponibles")
      return
    }

    const opciones = {
      series: [
        {
          name: "Asesorías",
          data: data.cantidades,
        },
      ],
      chart: {
        type: "bar",
        height: 420,
        toolbar: {
          show: false,
        },
        fontFamily: "Inter, system-ui, sans-serif",
        background: "transparent",
      },
      plotOptions: {
        bar: {
          horizontal: true,
          columnWidth: "70%",
          endingShape: "rounded",
          borderRadius: 6,
          dataLabels: {
            position: "center",
          },
        },
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: "12px",
          fontWeight: 600,
          colors: ["#FFFFFF"],
        },
        dropShadow: {
          enabled: true,
          top: 1,
          left: 1,
          blur: 1,
          opacity: 0.8,
        },
      },
      stroke: {
        show: false,
      },
      xaxis: {
        categories: data.tipos || ["Sin datos"],
        labels: {
          style: {
            fontSize: "12px",
            fontWeight: 500,
            colors: "#6B7280",
          },
        },
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      yaxis: {
        title: {
          text: "Tipo de Visa",
          style: {
            fontSize: "12px",
            fontWeight: 600,
            color: "#374151",
          },
        },
        labels: {
          style: {
            fontSize: "11px",
            colors: "#6B7280",
          },
        },
      },
      grid: {
        borderColor: "#F3F4F6",
        strokeDashArray: 3,
        yaxis: {
          lines: {
            show: false,
          },
        },
      },
      fill: {
        type: "gradient",
        gradient: {
          shade: "light",
          type: "horizontal",
          shadeIntensity: 0.3,
          gradientToColors: ["#A855F7"],
          inverseColors: false,
          opacityFrom: 0.9,
          opacityTo: 0.7,
        },
      },
      colors: ["#8B5CF6"],
      tooltip: {
        theme: "light",
        style: {
          fontSize: "12px",
          fontFamily: "Inter, system-ui, sans-serif",
        },
        y: {
          formatter: (val) => val + " asesorías",
        },
      },
    }

    // Destruir gráfico anterior si existe
    if (graficoTipoVisa) {
      graficoTipoVisa.destroy()
    }

    contenedor.innerHTML = ""
    graficoTipoVisa = new ApexCharts(contenedor, opciones)
    await graficoTipoVisa.render()

    console.log("Gráfico de tipo de visa cargado:", data)
  } catch (error) {
    console.error("Error al cargar gráfico de tipo de visa:", error)
    mostrarGraficoVacio(contenedor, "Error al cargar gráfico de tipo de visa")
  }
}

// Función para mostrar un gráfico vacío con mensaje
function mostrarGraficoVacio(contenedor, mensaje) {
  contenedor.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full py-8">
      <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
      </svg>
      <p class="text-gray-500 text-center">${mensaje}</p>
    </div>
  `
}

// Función para cargar las próximas asesorías
async function cargarProximasAsesorias() {
  const loadingElement = document.getElementById("loadingProximasAsesorias")
  const tablaElement = document.getElementById("tablaProximasAsesorias")

  if (!loadingElement || !tablaElement) return

  // Mostrar loading
  loadingElement.classList.remove("hidden")

  try {
    console.log("Cargando próximas asesorías...")
    const response = await fetch("/asesor/api/proximas-asesorias")

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    tablaElement.innerHTML = ""

    if (!data.proximas_asesorias || data.proximas_asesorias.length === 0) {
      tablaElement.innerHTML = `
        <tr>
          <td colspan="5" class="p-8 text-center text-gray-500">
            No tienes próximas asesorías programadas
          </td>
        </tr>
      `
    } else {
      data.proximas_asesorias.forEach((asesoria) => {
        const fila = document.createElement("tr")
        fila.className = "hover:bg-gray-50 transition-colors duration-200"

        const estadoColor = obtenerColorEstado(asesoria.estado_proceso)

        fila.innerHTML = `
          <td class="p-4 border-b border-gray-200">
            <div class="font-medium text-gray-900">
              ${asesoria.nombres} ${asesoria.apellidos}
            </div>
          </td>
          <td class="p-4 border-b border-gray-200">
            <span class="text-sm text-gray-600">${asesoria.tipo_asesoria}</span>
          </td>
          <td class="p-4 border-b border-gray-200">
            <span class="text-sm text-gray-600">${asesoria.lugar}</span>
          </td>
          <td class="p-4 border-b border-gray-200">
            <span class="text-sm text-gray-600">${asesoria.fecha_hora_formateada}</span>
          </td>
          <td class="p-4 border-b border-gray-200">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoColor}">
              ${asesoria.estado_proceso}
            </span>
          </td>
        `

        tablaElement.appendChild(fila)
      })
    }

    console.log("Próximas asesorías cargadas:", data.proximas_asesorias.length)
  } catch (error) {
    console.error("Error al cargar próximas asesorías:", error)
    tablaElement.innerHTML = `
      <tr>
        <td colspan="5" class="p-8 text-center text-red-500">
          Error al cargar las próximas asesorías: ${error.message}
        </td>
      </tr>
    `
  } finally {
    // Ocultar loading
    loadingElement.classList.add("hidden")
  }
}

// Función para obtener el color del estado
function obtenerColorEstado(estado) {
  switch (estado) {
    case "Terminado":
      return "bg-green-100 text-green-800"
    case "Proceso activo":
      return "bg-blue-100 text-blue-800"
    case "Pendiente":
      return "bg-yellow-100 text-yellow-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

// Función para formatear moneda
function formatearMoneda(cantidad) {
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cantidad)
}

// Función para actualizar todas las métricas
async function actualizarMetricas() {
  const btnActualizar = document.getElementById("btnActualizar")
  const textoActualizar = document.getElementById("textoActualizar")
  const loadingActualizar = document.getElementById("loadingActualizar")

  // Cambiar a estado de loading
  btnActualizar.disabled = true
  btnActualizar.classList.add("opacity-75", "cursor-not-allowed")
  textoActualizar.classList.add("hidden")
  loadingActualizar.classList.remove("hidden")

  try {
    console.log("Actualizando todas las métricas...")
    await cargarTodasLasMetricas()
  } catch (error) {
    console.error("Error al actualizar métricas:", error)
    mostrarNotificacion("Error al actualizar métricas", "error")
  } finally {
    // Restaurar estado normal
    btnActualizar.disabled = false
    btnActualizar.classList.remove("opacity-75", "cursor-not-allowed")
    textoActualizar.classList.remove("hidden")
    loadingActualizar.classList.add("hidden")
  }
}

// Función para exportar reporte (placeholder)
async function exportarReporte() {
  const btnExportar = document.getElementById("btnExportarReporte")
  const textoExportar = document.getElementById("textoExportar")
  const loadingExportar = document.getElementById("loadingExportar")

  // Cambiar a estado de loading
  btnExportar.disabled = true
  btnExportar.classList.add("opacity-75", "cursor-not-allowed")
  textoExportar.classList.add("hidden")
  loadingExportar.classList.remove("hidden")

  try {
    const response = await fetch("/asesor/api/generar-reporte")

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Crear blob y descargar
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.style.display = "none"
    a.href = url

    // Obtener nombre del archivo del header Content-Disposition si está disponible
    const contentDisposition = response.headers.get("Content-Disposition")
    let filename = `reporte_asesor_${new Date().toISOString().slice(0, 10)}.pdf`
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/)
      if (filenameMatch) {
        filename = filenameMatch[1]
      }
    }

    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    console.error("Error al generar reporte:", error)
    mostrarNotificacion("Error al generar el reporte", "error")
  } finally {
    // Restaurar estado normal
    btnExportar.disabled = false
    btnExportar.classList.remove("opacity-75", "cursor-not-allowed")
    textoExportar.classList.remove("hidden")
    loadingExportar.classList.add("hidden")
  }
}

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = "info") {
  // Crear elemento de notificación
  const notificacion = document.createElement("div")
  notificacion.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`

  // Aplicar estilos según el tipo
  switch (tipo) {
    case "success":
      notificacion.classList.add("bg-green-500", "text-white")
      break
    case "error":
      notificacion.classList.add("bg-red-500", "text-white")
      break
    case "info":
      notificacion.classList.add("bg-blue-500", "text-white")
      break
    default:
      notificacion.classList.add("bg-gray-500", "text-white")
  }

  notificacion.innerHTML = `
    <div class="flex items-center">
      <span>${mensaje}</span>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  `

  // Agregar al DOM
  document.body.appendChild(notificacion)

  // Animar entrada
  setTimeout(() => {
    notificacion.classList.remove("translate-x-full")
  }, 100)

  // Auto-remover después de 5 segundos
  setTimeout(() => {
    notificacion.classList.add("translate-x-full")
    setTimeout(() => {
      if (notificacion.parentElement) {
        notificacion.remove()
      }
    }, 300)
  }, 5000)
}

// Función para manejar errores de red
window.addEventListener("online", () => {
  mostrarNotificacion("Conexión restaurada", "success")
})

window.addEventListener("offline", () => {
  mostrarNotificacion("Sin conexión a internet", "error")
})
