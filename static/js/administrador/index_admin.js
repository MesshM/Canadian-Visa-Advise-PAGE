// Aca va el codigo js

// Variables globales para los gráficos
let graficoTipoVisa = null
let graficoModalidad = null
let graficoEstado = null
let graficoTendencia = null
let graficoRankingAsesores = null

// Importación de ApexCharts
const ApexCharts = window.ApexCharts

// Función para inicializar el dashboard
document.addEventListener("DOMContentLoaded", () => {
  console.log("Inicializando dashboard del administrador...")
  cargarTodasLasMetricasAdmin()
})

// Función para cargar todas las métricas del administrador
async function cargarTodasLasMetricasAdmin() {
  try {
    await Promise.all([
      cargarMetricasPrincipales(),
      cargarGraficoTipoVisa(),
      cargarGraficoModalidad(),
      cargarGraficoEstado(),
      cargarGraficoTendencia(),
      cargarGraficoRankingAsesores(),
      cargarVisasMasSolicitadas(),
    ])
    console.log("Todas las métricas del administrador cargadas exitosamente")
  } catch (error) {
    console.error("Error al cargar las métricas del administrador:", error)
    mostrarNotificacion("Error al cargar algunas métricas", "error")
  }
}

// Función para cargar las métricas principales
async function cargarMetricasPrincipales() {
  try {
    console.log("Cargando métricas principales del administrador...")
    const response = await fetch("/admin/api/metricas-principales")

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    // Actualizar los números en las tarjetas
    document.getElementById("totalAsesorias").textContent = data.total_asesorias || 0
    document.getElementById("asesoriasActivas").textContent = data.asesorias_activas || 0
    document.getElementById("asesoriasTerminadas").textContent = data.asesorias_terminadas || 0
    document.getElementById("tasaCompletacion").textContent = data.tasa_completacion || "0"
    document.getElementById("ingresosTotales").textContent = formatearMoneda(data.ingresos_totales || 0)
    document.getElementById("ingresosMes").textContent = formatearMoneda(data.ingresos_mes || 0)
    document.getElementById("totalAsesores").textContent = data.total_asesores || 0
    document.getElementById("totalUsuarios").textContent = data.total_usuarios || 0

    console.log("Métricas principales del administrador cargadas:", data)
  } catch (error) {
    console.error("Error al cargar métricas principales del administrador:", error)
    mostrarNotificacion("Error al cargar métricas principales", "error")
  }
}

// Función para cargar el gráfico de asesorías por tipo de visa
async function cargarGraficoTipoVisa() {
  const contenedor = document.getElementById("contenedorGraficoTipoVisa")
  if (!contenedor) return

  try {
    console.log("Cargando gráfico de asesorías por tipo de visa...")
    const response = await fetch("/admin/api/asesorias-tipo-visa")

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    // Validar que tenemos datos válidos
    if (!data.cantidades || !Array.isArray(data.cantidades) || data.cantidades.length === 0) {
      mostrarGraficoVacio(contenedor, "No hay datos de asesorías por tipo de visa disponibles")
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

    console.log("Gráfico de asesorías por tipo de visa cargado:", data)
  } catch (error) {
    console.error("Error al cargar gráfico de asesorías por tipo de visa:", error)
    mostrarGraficoVacio(contenedor, "Error al cargar gráfico de asesorías por tipo de visa")
  }
}

// Función para cargar el gráfico de asesorías por modalidad
async function cargarGraficoModalidad() {
  const contenedor = document.getElementById("contenedorGraficoModalidad")
  if (!contenedor) return

  try {
    console.log("Cargando gráfico de asesorías por modalidad...")
    const response = await fetch("/admin/api/asesorias-modalidad")

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

    console.log("Gráfico de asesorías por modalidad cargado:", data)
  } catch (error) {
    console.error("Error al cargar gráfico de asesorías por modalidad:", error)
    mostrarGraficoVacio(contenedor, "Error al cargar gráfico de asesorías por modalidad")
  }
}

// Función para cargar el gráfico de estado general de asesorías
async function cargarGraficoEstado() {
  const contenedor = document.getElementById("contenedorGraficoEstado")
  if (!contenedor) return

  try {
    console.log("Cargando gráfico de estado general...")
    const response = await fetch("/admin/api/estado-asesorias")

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
          gradientToColors: ["#10B981", "#F59E0B", "#EF4444"],
          inverseColors: false,
          opacityFrom: 0.9,
          opacityTo: 0.7,
        },
      },
      colors: ["#10B981", "#F59E0B", "#EF4444"],
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

    console.log("Gráfico de estado general cargado:", data)
  } catch (error) {
    console.error("Error al cargar gráfico de estado general:", error)
    mostrarGraficoVacio(contenedor, "Error al cargar gráfico de estado general")
  }
}

// Función para cargar el gráfico de tendencia de últimos 7 días
async function cargarGraficoTendencia() {
  const contenedor = document.getElementById("contenedorGraficoTendencia")
  if (!contenedor) return

  try {
    console.log("Cargando gráfico de tendencia...")
    const response = await fetch("/admin/api/asesorias-ultimos-dias")

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    // Validar que tenemos datos válidos
    if (!data.cantidades || !Array.isArray(data.cantidades) || data.cantidades.length === 0) {
      mostrarGraficoVacio(contenedor, "No hay datos de tendencia disponibles")
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
        type: "area",
        height: 320,
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
          text: "Asesorías",
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
      },
      fill: {
        type: "gradient",
        gradient: {
          shade: "light",
          type: "vertical",
          shadeIntensity: 0.3,
          gradientToColors: ["#F97316"],
          inverseColors: false,
          opacityFrom: 0.8,
          opacityTo: 0.1,
        },
      },
      colors: ["#EA580C"],
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
          formatter: (val) => val + " asesorías",
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

// Función para cargar el gráfico de ranking de asesores
async function cargarGraficoRankingAsesores() {
  const contenedor = document.getElementById("contenedorGraficoRankingAsesores")
  if (!contenedor) return

  try {
    console.log("Cargando gráfico de ranking de asesores...")
    const response = await fetch("/admin/api/ranking-asesores")

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    // Validar que tenemos datos válidos
    if (!data.cantidades || !Array.isArray(data.cantidades) || data.cantidades.length === 0) {
      mostrarGraficoVacio(contenedor, "No hay datos de ranking de asesores disponibles")
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
        categories: data.asesores || ["Sin datos"],
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
          text: "Asesores",
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
          gradientToColors: ["#F59E0B"],
          inverseColors: false,
          opacityFrom: 0.9,
          opacityTo: 0.7,
        },
      },
      colors: ["#EAB308"],
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
    if (graficoRankingAsesores) {
      graficoRankingAsesores.destroy()
    }

    contenedor.innerHTML = ""
    graficoRankingAsesores = new ApexCharts(contenedor, opciones)
    await graficoRankingAsesores.render()

    console.log("Gráfico de ranking de asesores cargado:", data)
  } catch (error) {
    console.error("Error al cargar gráfico de ranking de asesores:", error)
    mostrarGraficoVacio(contenedor, "Error al cargar gráfico de ranking de asesores")
  }
}

// Función para cargar las visas más solicitadas
async function cargarVisasMasSolicitadas() {
  const loadingElement = document.getElementById("loadingVisasRanking")
  const tablaElement = document.getElementById("tablaVisasRanking")

  if (!loadingElement || !tablaElement) return

  // Mostrar loading
  loadingElement.classList.remove("hidden")

  try {
    console.log("Cargando visas más solicitadas...")
    const response = await fetch("/admin/api/visas-mas-solicitadas")

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    tablaElement.innerHTML = ""

    if (!data.visas_ranking || data.visas_ranking.length === 0) {
      tablaElement.innerHTML = `
        <tr>
          <td colspan="4" class="p-8 text-center text-gray-500">
            No hay datos de visas disponibles
          </td>
        </tr>
      `
    } else {
      data.visas_ranking.forEach((visa) => {
        const fila = document.createElement("tr")
        fila.className = "hover:bg-gray-50 transition-colors duration-200"

        const posicionColor = obtenerColorPosicion(visa.posicion)

        fila.innerHTML = `
          <td class="p-4 border-b border-gray-200">
            <div class="flex items-center">
              <span class="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${posicionColor}">
                ${visa.posicion}
              </span>
            </div>
          </td>
          <td class="p-4 border-b border-gray-200">
            <div class="font-medium text-gray-900">
              ${visa.tipo_visa}
            </div>
          </td>
          <td class="p-4 border-b border-gray-200">
            <span class="text-sm font-semibold text-gray-900">${visa.cantidad}</span>
          </td>
          <td class="p-4 border-b border-gray-200">
            <div class="flex items-center">
              <div class="w-full bg-gray-200 rounded-full h-2 mr-3">
                <div class="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full" style="width: ${visa.porcentaje}%"></div>
              </div>
              <span class="text-sm font-medium text-gray-700">${visa.porcentaje}%</span>
            </div>
          </td>
        `

        tablaElement.appendChild(fila)
      })
    }

    console.log("Visas más solicitadas cargadas:", data.visas_ranking.length)
  } catch (error) {
    console.error("Error al cargar visas más solicitadas:", error)
    tablaElement.innerHTML = `
      <tr>
        <td colspan="4" class="p-8 text-center text-red-500">
          Error al cargar las visas más solicitadas: ${error.message}
        </td>
      </tr>
    `
  } finally {
    // Ocultar loading
    loadingElement.classList.add("hidden")
  }
}

// Función para obtener el color de la posición
function obtenerColorPosicion(posicion) {
  switch (posicion) {
    case 1:
      return "bg-yellow-500 text-white"
    case 2:
      return "bg-gray-400 text-white"
    case 3:
      return "bg-orange-600 text-white"
    default:
      return "bg-blue-500 text-white"
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

// Función para formatear moneda
function formatearMoneda(cantidad) {
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cantidad)
}

// Función para actualizar todas las métricas del administrador
async function actualizarMetricasAdmin() {
  const btnActualizar = document.getElementById("btnActualizarAdmin")
  const textoActualizar = document.getElementById("textoActualizarAdmin")
  const loadingActualizar = document.getElementById("loadingActualizarAdmin")

  // Cambiar a estado de loading
  btnActualizar.disabled = true
  btnActualizar.classList.add("opacity-75", "cursor-not-allowed")
  textoActualizar.classList.add("hidden")
  loadingActualizar.classList.remove("hidden")

  try {
    console.log("Actualizando todas las métricas del administrador...")
    await cargarTodasLasMetricasAdmin()
  } catch (error) {
    console.error("Error al actualizar métricas del administrador:", error)
    mostrarNotificacion("Error al actualizar métricas", "error")
  } finally {
    // Restaurar estado normal
    btnActualizar.disabled = false
    btnActualizar.classList.remove("opacity-75", "cursor-not-allowed")
    textoActualizar.classList.remove("hidden")
    loadingActualizar.classList.add("hidden")
  }
}

// Función para exportar reporte del administrador
async function exportarReporteAdmin() {
  const btnExportar = document.getElementById("btnExportarReporteAdmin")
  const textoExportar = document.getElementById("textoExportarAdmin")
  const loadingExportar = document.getElementById("loadingExportarAdmin")

  // Cambiar a estado de loading
  btnExportar.disabled = true
  btnExportar.classList.add("opacity-75", "cursor-not-allowed")
  textoExportar.classList.add("hidden")
  loadingExportar.classList.remove("hidden")

  try {
    const response = await fetch("/admin/api/generar-reporte-admin")

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
    let filename = `reporte_admin_${new Date().toISOString().slice(0, 10)}.pdf`
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
    console.error("Error al generar reporte del administrador:", error)
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
