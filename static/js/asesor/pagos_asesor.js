// Variables globales para los gráficos
let graficoTipoVisa = null
let graficoMetodosPago = null
let graficoTendencia = null

// Importación de ApexCharts
const ApexCharts = window.ApexCharts

// Función para inicializar el dashboard
document.addEventListener("DOMContentLoaded", () => {
  console.log("Inicializando dashboard de pagos del asesor...")
  cargarTodasLasMetricasPagos()
})

// Función para cargar todas las métricas de pagos
async function cargarTodasLasMetricasPagos() {
  try {
    await Promise.all([
      cargarMetricasPagos(),
      cargarGraficoTipoVisa(),
      cargarGraficoMetodosPago(),
      cargarGraficoTendencia(),
      cargarTransaccionesRecientes(),
    ])
    console.log("Todas las métricas de pagos cargadas exitosamente")
  } catch (error) {
    console.error("Error al cargar las métricas de pagos:", error)
    mostrarNotificacion("Error al cargar algunas métricas", "error")
  }
}

// Función para cargar las métricas principales de pagos
async function cargarMetricasPagos() {
  try {
    console.log("Cargando métricas principales de pagos...")
    const response = await fetch("/asesor/api/metricas-pagos")

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    // Actualizar los números en las tarjetas
    document.getElementById("ingresosTotales").textContent = formatearMoneda(data.ingresos_totales || 0)
    document.getElementById("totalTransacciones").textContent = data.total_transacciones || 0
    document.getElementById("pagosCompletados").textContent = data.pagos_completados || 0
    document.getElementById("pagosPendientes").textContent = data.pagos_pendientes || 0
    document.getElementById("promedioTransaccion").textContent = formatearMoneda(data.promedio_transaccion || 0)
    document.getElementById("ingresosMes").textContent = formatearMoneda(data.ingresos_mes || 0)
    document.getElementById("montoPendiente").textContent = formatearMoneda(data.monto_pendiente || 0)
    document.getElementById("tasaConversion").textContent = data.tasa_conversion || "0"

    console.log("Métricas principales de pagos cargadas:", data)
  } catch (error) {
    console.error("Error al cargar métricas principales de pagos:", error)
    mostrarNotificacion("Error al cargar métricas principales", "error")
  }
}

// Función para cargar el gráfico de ingresos por tipo de visa
async function cargarGraficoTipoVisa() {
  const contenedor = document.getElementById("contenedorGraficoTipoVisa")
  if (!contenedor) return

  try {
    console.log("Cargando gráfico de ingresos por tipo de visa...")
    const response = await fetch("/asesor/api/ingresos-tipo-visa")

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    // Validar que tenemos datos válidos
    if (!data.ingresos || !Array.isArray(data.ingresos) || data.ingresos.length === 0) {
      mostrarGraficoVacio(contenedor, "No hay datos de ingresos por tipo de visa disponibles")
      return
    }

    const opciones = {
      series: [
        {
          name: "Ingresos",
          data: data.ingresos,
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
        formatter: (val) => "$" + formatearMoneda(val),
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
          formatter: (val) => "$" + formatearMoneda(val),
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
          formatter: (val) => "$" + formatearMoneda(val) + " USD",
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

    console.log("Gráfico de ingresos por tipo de visa cargado:", data)
  } catch (error) {
    console.error("Error al cargar gráfico de ingresos por tipo de visa:", error)
    mostrarGraficoVacio(contenedor, "Error al cargar gráfico de ingresos por tipo de visa")
  }
}

// Función para cargar el gráfico de métodos de pago
async function cargarGraficoMetodosPago() {
  const contenedor = document.getElementById("contenedorGraficoMetodosPago")
  if (!contenedor) return

  try {
    console.log("Cargando gráfico de métodos de pago...")
    const response = await fetch("/asesor/api/metodos-pago")

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    // Validar que tenemos datos válidos
    if (!data.cantidades || !Array.isArray(data.cantidades) || data.cantidades.length === 0) {
      mostrarGraficoVacio(contenedor, "No hay datos de métodos de pago disponibles")
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
      labels: data.metodos || ["Sin datos"],
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
          formatter: (val) => val + " transacciones",
        },
      },
    }

    // Destruir gráfico anterior si existe
    if (graficoMetodosPago) {
      graficoMetodosPago.destroy()
    }

    contenedor.innerHTML = ""
    graficoMetodosPago = new ApexCharts(contenedor, opciones)
    await graficoMetodosPago.render()

    console.log("Gráfico de métodos de pago cargado:", data)
  } catch (error) {
    console.error("Error al cargar gráfico de métodos de pago:", error)
    mostrarGraficoVacio(contenedor, "Error al cargar gráfico de métodos de pago")
  }
}

// Función para cargar el gráfico de tendencia semanal
async function cargarGraficoTendencia() {
  const contenedor = document.getElementById("contenedorGraficoTendencia")
  if (!contenedor) return

  try {
    console.log("Cargando gráfico de tendencia...")
    const response = await fetch("/asesor/api/tendencia-semanal")

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    // Validar que tenemos datos válidos
    if (!data.ingresos || !Array.isArray(data.ingresos) || data.ingresos.length === 0) {
      mostrarGraficoVacio(contenedor, "No hay datos de tendencia disponibles")
      return
    }

    const opciones = {
      series: [
        {
          name: "Ingresos Diarios",
          data: data.ingresos,
        },
      ],
      chart: {
        type: "area",
        height: 420,
        toolbar: {
          show: false,
        },
        fontFamily: "Inter, system-ui, sans-serif",
        background: "transparent",
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: "smooth",
        width: 3,
      },
      xaxis: {
        categories: data.fechas || ["Sin datos"],
        labels: {
          style: {
            fontSize: "12px",
            fontWeight: 500,
            colors: "#6B7280",
          },
          formatter: (val) => {
            if (val === "Sin datos") return val
            const date = new Date(val)
            return date.toLocaleDateString("es-ES", { month: "short", day: "numeric" })
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
          text: "Ingresos (USD)",
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
          formatter: (val) => "$" + formatearMoneda(val),
        },
      },
      grid: {
        borderColor: "#F3F4F6",
        strokeDashArray: 3,
      },
      fill: {
        type: "gradient",
        gradient: {
          shade: "light",
          type: "vertical",
          shadeIntensity: 0.3,
          gradientToColors: ["#10B981"],
          inverseColors: false,
          opacityFrom: 0.8,
          opacityTo: 0.1,
        },
      },
      colors: ["#059669"],
      tooltip: {
        theme: "light",
        style: {
          fontSize: "12px",
          fontFamily: "Inter, system-ui, sans-serif",
        },
        x: {
          formatter: (val) => {
            if (typeof val === "string" && val !== "Sin datos") {
              const date = new Date(val)
              return date.toLocaleDateString("es-ES", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            }
            return val
          },
        },
        y: {
          formatter: (val) => "$" + formatearMoneda(val) + " USD",
        },
      },
    }

    // Destruir gráfico anterior si existe
    if (graficoTendencia) {
      graficoTendencia.destroy()
    }

    contenedor.innerHTML = ""
    graficoTendencia = new ApexCharts(contenedor, opciones)
    await graficoTendencia.render()

    console.log("Gráfico de tendencia cargado:", data)
  } catch (error) {
    console.error("Error al cargar gráfico de tendencia:", error)
    mostrarGraficoVacio(contenedor, "Error al cargar gráfico de tendencia")
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

// Función para cargar las transacciones recientes
async function cargarTransaccionesRecientes() {
  const loadingElement = document.getElementById("loadingTransaccionesRecientes")
  const tablaElement = document.getElementById("tablaTransaccionesRecientes")

  if (!loadingElement || !tablaElement) return

  // Mostrar loading
  loadingElement.classList.remove("hidden")

  try {
    console.log("Cargando transacciones recientes...")
    const response = await fetch("/asesor/api/transacciones-recientes")

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    tablaElement.innerHTML = ""

    if (!data.transacciones_recientes || data.transacciones_recientes.length === 0) {
      tablaElement.innerHTML = `
        <tr>
          <td colspan="6" class="p-8 text-center text-gray-500">
            No tienes transacciones recientes
          </td>
        </tr>
      `
    } else {
      data.transacciones_recientes.forEach((transaccion) => {
        const fila = document.createElement("tr")
        fila.className = "hover:bg-gray-50 transition-colors duration-200"

        const estadoColor = obtenerColorEstadoPago(transaccion.estado_pago)

        fila.innerHTML = `
          <td class="p-4 border-b border-gray-200">
            <div class="font-medium text-gray-900">
              ${transaccion.nombres} ${transaccion.apellidos}
            </div>
          </td>
          <td class="p-4 border-b border-gray-200">
            <span class="text-sm text-gray-600">${transaccion.tipo_asesoria}</span>
          </td>
          <td class="p-4 border-b border-gray-200">
            <span class="text-sm font-semibold text-gray-900">$${formatearMoneda(transaccion.monto)}</span>
          </td>
          <td class="p-4 border-b border-gray-200">
            <span class="text-sm text-gray-600">${transaccion.metodo_pago}</span>
          </td>
          <td class="p-4 border-b border-gray-200">
            <span class="text-sm text-gray-600">${transaccion.fecha_formateada}</span>
          </td>
          <td class="p-4 border-b border-gray-200">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoColor}">
              ${transaccion.estado_pago}
            </span>
          </td>
        `

        tablaElement.appendChild(fila)
      })
    }

    console.log("Transacciones recientes cargadas:", data.transacciones_recientes.length)
  } catch (error) {
    console.error("Error al cargar transacciones recientes:", error)
    tablaElement.innerHTML = `
      <tr>
        <td colspan="6" class="p-8 text-center text-red-500">
          Error al cargar las transacciones recientes: ${error.message}
        </td>
      </tr>
    `
  } finally {
    // Ocultar loading
    loadingElement.classList.add("hidden")
  }
}

// Función para obtener el color del estado de pago
function obtenerColorEstadoPago(estado) {
  switch (estado) {
    case "Completado":
      return "bg-green-100 text-green-800"
    case "Pendiente":
      return "bg-yellow-100 text-yellow-800"
    case "Cancelado":
      return "bg-red-100 text-red-800"
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

// Función para actualizar todas las métricas de pagos
async function actualizarMetricasPagos() {
  const btnActualizar = document.getElementById("btnActualizarPagos")
  const textoActualizar = document.getElementById("textoActualizarPagos")
  const loadingActualizar = document.getElementById("loadingActualizarPagos")

  // Cambiar a estado de loading
  btnActualizar.disabled = true
  btnActualizar.classList.add("opacity-75", "cursor-not-allowed")
  textoActualizar.classList.add("hidden")
  loadingActualizar.classList.remove("hidden")

  try {
    console.log("Actualizando todas las métricas de pagos...")
    await cargarTodasLasMetricasPagos()
  } catch (error) {
    console.error("Error al actualizar métricas de pagos:", error)
    mostrarNotificacion("Error al actualizar métricas", "error")
  } finally {
    // Restaurar estado normal
    btnActualizar.disabled = false
    btnActualizar.classList.remove("opacity-75", "cursor-not-allowed")
    textoActualizar.classList.remove("hidden")
    loadingActualizar.classList.add("hidden")
  }
}

// Función para exportar reporte de pagos
async function exportarReportePagos() {
  const btnExportar = document.getElementById("btnExportarReportePagos")
  const textoExportar = document.getElementById("textoExportarPagos")
  const loadingExportar = document.getElementById("loadingExportarPagos")

  // Cambiar a estado de loading
  btnExportar.disabled = true
  btnExportar.classList.add("opacity-75", "cursor-not-allowed")
  textoExportar.classList.add("hidden")
  loadingExportar.classList.remove("hidden")

  try {
    const response = await fetch("/asesor/api/generar-reporte-pagos")

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
    let filename = `reporte_pagos_${new Date().toISOString().slice(0, 10)}.pdf`
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
    console.error("Error al generar reporte de pagos:", error)
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
