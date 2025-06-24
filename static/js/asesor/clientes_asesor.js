// Variables globales
let clientesData = []
let clienteActual = null
let currentModalStep = 0
const totalModalSteps = 4
let currentPage = 1
let totalPages = 1

// Inicialización cuando se carga la página
document.addEventListener("DOMContentLoaded", () => {
  cargarClientes()
  configurarEventListeners()
})

// Configurar event listeners
function configurarEventListeners() {
  // Filtros en tiempo real
  document.getElementById("buscarCliente").addEventListener("input", () => {
    filtrarClientesEnTiempoReal()
  })

  // Auto-aplicar filtros cuando cambian
  document.getElementById("filtroTipoVisa").addEventListener("change", aplicarFiltros)
  document.getElementById("filtroEstadoFormulario").addEventListener("change", aplicarFiltros)
  document.getElementById("filtroEstadoProceso").addEventListener("change", aplicarFiltros)
}

// Cargar clientes desde el servidor con paginación
async function cargarClientes(page = 1) {
  try {
    mostrarSpinner(true)

    const response = await fetch(`/asesor/api/clientes?page=${page}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Error al cargar los clientes")
    }

    const data = await response.json()
    clientesData = data.clientes || []

    // Actualizar información de paginación
    if (data.pagination) {
      currentPage = data.pagination.current_page
      totalPages = data.pagination.total_pages
      actualizarPaginacion(data.pagination)
    }

    // Actualizar estadísticas con datos del servidor
    if (data.pagination && data.pagination.statistics) {
      actualizarEstadisticasServidor(data.pagination.statistics)
    } else {
      actualizarEstadisticas()
    }

    mostrarClientes(clientesData)
  } catch (error) {
    console.error("Error:", error)
    mostrarAlerta("Error al cargar los clientes: " + error.message, "error")
  } finally {
    mostrarSpinner(false)
  }
}

// Actualizar controles de paginación
function actualizarPaginacion(pagination) {
  const paginacionContainer = document.getElementById("paginacionContainer")

  if (!paginacionContainer) {
    // Crear contenedor de paginación si no existe
    const container = document.createElement("div")
    container.id = "paginacionContainer"
    container.className = "flex justify-center items-center mt-6 space-x-2"

    // Insertar después de la tabla
    const tablaContainer = document.querySelector(".overflow-x-auto").parentNode
    tablaContainer.appendChild(container)
  }

  const container = document.getElementById("paginacionContainer")

  if (pagination.total_pages <= 1) {
    container.innerHTML = ""
    return
  }

  let paginacionHTML = ""

  // Botón anterior
  if (pagination.has_prev) {
    paginacionHTML += `
      <button onclick="cargarClientes(${pagination.current_page - 1})" 
              class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 hover:text-gray-700">
        Anterior
      </button>
    `
  }

  // Números de página
  const startPage = Math.max(1, pagination.current_page - 2)
  const endPage = Math.min(pagination.total_pages, pagination.current_page + 2)

  for (let i = startPage; i <= endPage; i++) {
    const isActive = i === pagination.current_page
    paginacionHTML += `
      <button onclick="cargarClientes(${i})" 
              class="px-3 py-2 text-sm font-medium ${
                isActive
                  ? "text-primary-600 bg-primary-50 border-primary-500"
                  : "text-gray-500 bg-white border-gray-300 hover:bg-gray-50 hover:text-gray-700"
              } border">
        ${i}
      </button>
    `
  }

  // Botón siguiente
  if (pagination.has_next) {
    paginacionHTML += `
      <button onclick="cargarClientes(${pagination.current_page + 1})" 
              class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 hover:text-gray-700">
        Siguiente
      </button>
    `
  }

  container.innerHTML = paginacionHTML
}

// Mostrar/ocultar spinner de carga - ARREGLADO
function mostrarSpinner(mostrar) {
  const spinner = document.getElementById("loadingSpinner")
  const tabla = document.querySelector(".overflow-x-auto")
  const paginacion = document.getElementById("paginacionContainer")

  if (mostrar) {
    // Crear spinner dinámico si no existe
    if (!spinner) {
      const spinnerElement = document.createElement("div")
      spinnerElement.id = "loadingSpinner"
      spinnerElement.className = "flex flex-col justify-center items-center py-8 animate-fade-in"
      spinnerElement.innerHTML = `
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-primary-600 mb-3"></div>
        <p class="text-primary-600 text-sm">Cargando clientes...</p>
      `

      // Insertar antes de la tabla
      if (tabla && tabla.parentNode) {
        tabla.parentNode.insertBefore(spinnerElement, tabla)
      }
    } else {
      spinner.classList.remove("d-none", "hidden")
      spinner.style.display = "flex"
    }

    if (tabla) tabla.style.display = "none"
    if (paginacion) paginacion.style.display = "none"
  } else {
    if (spinner) {
      spinner.classList.add("d-none", "hidden")
      spinner.style.display = "none"
    }
    if (tabla) tabla.style.display = "block"
    if (paginacion) paginacion.style.display = "flex"
  }
}

// Actualizar estadísticas en las tarjetas
function actualizarEstadisticas() {
  const total = clientesData.length
  const pendientes = clientesData.filter((c) => c.estado_proceso === "Pendiente").length
  const proceso = clientesData.filter((c) => c.estado_proceso === "Proceso activo").length
  const completos = clientesData.filter((c) => c.estado_proceso === "Terminado").length

  document.getElementById("totalClientes").textContent = total
  document.getElementById("clientesPendientes").textContent = pendientes
  document.getElementById("clientesProceso").textContent = proceso
  document.getElementById("clientesCompletos").textContent = completos
}

// Actualizar estadísticas desde el servidor
function actualizarEstadisticasServidor(stats) {
  document.getElementById("totalClientes").textContent = stats.total || 0
  document.getElementById("clientesPendientes").textContent = stats.pendientes || 0
  document.getElementById("clientesProceso").textContent = stats.proceso || 0
  document.getElementById("clientesCompletos").textContent = stats.completos || 0
}

// Mostrar clientes en la tabla
function mostrarClientes(clientes) {
  const tbody = document.getElementById("cuerpoTablaClientes")

  if (clientes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="p-4 text-sm text-center text-gray-500">
          <div class="py-8">
            <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No se encontraron clientes</h3>
            <p class="text-sm">No hay clientes con los filtros aplicados</p>
          </div>
        </td>
      </tr>
    `
    return
  }

  tbody.innerHTML = clientes
    .map(
      (cliente) => `
        <tr class="transition-all duration-300 hover:bg-gray-50 relative z-0">
          <td class="p-4 text-sm border-b border-gray-200">
            <div class="flex items-center">
              <div class="w-10 h-10 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
                ${cliente.nombre_completo.charAt(0).toUpperCase()}
              </div>
              <div>
                <div class="font-semibold text-gray-900">${cliente.nombre_completo}</div>
                <small class="text-gray-500">${cliente.correo || "Sin correo"}</small>
              </div>
            </div>
          </td>
          <td class="p-4 text-sm border-b border-gray-200">
            <span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">${cliente.tipo_documento}</span><br>
            <small class="text-gray-500 mt-1 block">${cliente.numero_documento}</small>
          </td>
          <td class="p-4 text-sm border-b border-gray-200">
            <span class="px-2 py-1 text-xs font-semibold rounded-full ${getBadgeClassTipoVisa(cliente.tipo_asesoria)}">
              ${cliente.tipo_asesoria}
            </span>
          </td>
          <td class="p-4 text-sm border-b border-gray-200">
            <span class="px-2 py-1 text-xs font-semibold rounded-full ${getBadgeClassEstadoFormulario(cliente.estado_formulario)}">
              ${cliente.estado_formulario}
            </span>
          </td>
          <td class="p-4 text-sm border-b border-gray-200">
            <span class="px-2 py-1 text-xs font-semibold rounded-full ${getBadgeClassEstadoProceso(cliente.estado_proceso)}">
              ${cliente.estado_proceso || "Sin estado"}
            </span>
          </td>
          <td class="p-4 text-sm border-b border-gray-200 text-gray-700">
            <div>${formatearFecha(cliente.fecha_asesoria)}</div>
          </td>
          <td class="p-4 text-sm border-b border-gray-200">
            <div class="flex items-center">
              <span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-600 mr-1">${cliente.total_documentos}</span>
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
          </td>
          <td class="p-4 text-sm border-b border-gray-200">
            <div class="flex space-x-2">
              <button onclick="verDetalleCliente(${cliente.codigo_asesoria})"
                class="flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 transition-all duration-300 hover:text-primary-600 hover:translate-y-[-3px] relative overflow-hidden cursor-pointer"
                title="Ver detalles">
                <span class="absolute inset-0 bg-current opacity-0 rounded-xl transition-opacity duration-300 hover:opacity-10"></span>
                <svg class="relative z-10 transition-transform duration-300 hover:scale-110" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
              </button>

              <button onclick="abrirModalActualizarEstado(${cliente.codigo_asesoria})"
                class="flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 transition-all duration-300 hover:text-green-600 hover:translate-y-[-3px] relative overflow-hidden cursor-pointer"
                title="Actualizar estado">
                <span class="absolute inset-0 bg-current opacity-0 rounded-xl transition-opacity duration-300 hover:opacity-10"></span>
                <svg class="relative z-10 transition-transform duration-300 hover:scale-110" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>

              <button onclick="descargarFormulario(${cliente.id_formElegibilidad})"
                class="flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 transition-all duration-300 hover:text-blue-600 hover:translate-y-[-3px] relative overflow-hidden cursor-pointer"
                title="Descargar formulario">
                <span class="absolute inset-0 bg-current opacity-0 rounded-xl transition-opacity duration-300 hover:opacity-10"></span>
                <svg class="relative z-10 transition-transform duration-300 hover:scale-110" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("")
}

// Obtener clase CSS para badge según tipo de visa (actualizado con los 5 tipos correctos)
function getBadgeClassTipoVisa(tipo) {
  const clases = {
    Turismo: "bg-green-100 text-green-600",
    Estudios: "bg-purple-100 text-purple-600",
    "Trabajo temporal": "bg-blue-100 text-blue-600",
    Negocios: "bg-yellow-100 text-yellow-600",
    "Residencia permanente": "bg-gray-100 text-gray-600",
  }
  return clases[tipo] || "bg-gray-100 text-gray-600"
}

// Obtener clase CSS para badge según estado del formulario
function getBadgeClassEstadoFormulario(estado) {
  const clases = {
    "Pendiente (Formulario)": "bg-red-100 text-red-600",
    "Pendiente (Documentos)": "bg-yellow-100 text-yellow-600",
    Completo: "bg-green-100 text-green-600",
  }
  return clases[estado] || "bg-gray-100 text-gray-600"
}

// Obtener clase CSS para badge según estado del proceso
function getBadgeClassEstadoProceso(estado) {
  if (!estado || estado === "Sin estado") {
    return "bg-gray-100 text-gray-600"
  }

  const clases = {
    Pendiente: "bg-yellow-100 text-yellow-600",
    "Proceso activo": "bg-blue-100 text-blue-600",
    Terminado: "bg-green-100 text-green-600",
  }
  return clases[estado] || "bg-gray-100 text-gray-600"
}

// Formatear fecha
function formatearFecha(fecha) {
  if (!fecha) return "Sin fecha"
  const date = new Date(fecha)
  return date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Aplicar filtros
function aplicarFiltros() {
  const tipoVisa = document.getElementById("filtroTipoVisa").value
  const estadoFormulario = document.getElementById("filtroEstadoFormulario").value
  const estadoProceso = document.getElementById("filtroEstadoProceso").value
  const busqueda = document.getElementById("buscarCliente").value.toLowerCase()

  const clientesFiltrados = clientesData.filter((cliente) => {
    const cumpleTipoVisa = !tipoVisa || cliente.tipo_asesoria === tipoVisa
    const cumpleEstadoFormulario = !estadoFormulario || cliente.estado_formulario === estadoFormulario
    const cumpleEstadoProceso = !estadoProceso || cliente.estado_proceso === estadoProceso
    const cumpleBusqueda =
      !busqueda ||
      cliente.nombre_completo.toLowerCase().includes(busqueda) ||
      cliente.numero_documento.toLowerCase().includes(busqueda)

    return cumpleTipoVisa && cumpleEstadoFormulario && cumpleEstadoProceso && cumpleBusqueda
  })

  mostrarClientes(clientesFiltrados)
}

// Filtrar clientes en tiempo real (solo búsqueda)
function filtrarClientesEnTiempoReal() {
  aplicarFiltros()
}

// Limpiar filtros
function limpiarFiltros() {
  document.getElementById("filtroTipoVisa").value = ""
  document.getElementById("filtroEstadoFormulario").value = ""
  document.getElementById("filtroEstadoProceso").value = ""
  document.getElementById("buscarCliente").value = ""

  // Recargar la primera página sin filtros
  cargarClientes(1)
}

// Ver detalle del cliente - CORREGIDO: Solo círculo de carga sin texto
async function verDetalleCliente(codigoAsesoria) {
  // Mostrar indicador de carga en el botón - SOLO CÍRCULO
  const button = event.target.closest("button")
  const originalHTML = button.innerHTML
  button.disabled = true
  button.innerHTML = `
    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
  `

  try {
    const response = await fetch(`/asesor/api/cliente/${codigoAsesoria}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Error al cargar el detalle del cliente")
    }

    const data = await response.json()
    clienteActual = data.cliente

    mostrarDetalleCliente(data.cliente)
    cargarDocumentosCliente(data.cliente.id_formElegibilidad)
    cargarNotasCliente(codigoAsesoria)
    cargarHistorialCliente(data.cliente.id_solicitante)

    // Resetear stepper del modal
    currentModalStep = 0
    actualizarStepperModal()

    // Mostrar modal
    document.getElementById("modalDetalleCliente").classList.remove("hidden")
    document.getElementById("modalDetalleCliente").classList.add("flex")
  } catch (error) {
    console.error("Error:", error)
    mostrarAlerta("Error al cargar el detalle del cliente: " + error.message, "error")
  } finally {
    // Restaurar botón
    button.disabled = false
    button.innerHTML = originalHTML
  }
}

// Mostrar detalle del cliente en el modal - CORREGIDO: Lógica de trabajo actual
function mostrarDetalleCliente(cliente) {
  // Determinar trabajo actual - CORREGIDO
  let trabajoActual = "No especificado"
  if (cliente.trabajo_actual && cliente.trabajo_actual.trim()) {
    trabajoActual = cliente.trabajo_actual
  } else if (cliente.trabajo_actual_extranjero && cliente.trabajo_actual_extranjero.trim()) {
    trabajoActual = `${cliente.trabajo_actual_extranjero} (Extranjero)`
  } else if (cliente.motivo_no_trabajo && cliente.motivo_no_trabajo.trim()) {
    trabajoActual = `No trabaja: ${cliente.motivo_no_trabajo}`
  }

  // Información personal
  document.getElementById("infoPersonalCliente").innerHTML = `
    <div class="space-y-3">
      <div class="flex justify-between items-center py-2 border-b border-gray-100">
        <span class="text-sm font-medium text-gray-600">Nombre:</span>
        <span class="text-sm text-gray-900">${cliente.nombre_completo}</span>
      </div>
      <div class="flex justify-between items-center py-2 border-b border-gray-100">
        <span class="text-sm font-medium text-gray-600">Documento:</span>
        <span class="text-sm text-gray-900">${cliente.tipo_documento}: ${cliente.numero_documento}</span>
      </div>
      <div class="flex justify-between items-center py-2 border-b border-gray-100">
        <span class="text-sm font-medium text-gray-600">Fecha de Nacimiento:</span>
        <span class="text-sm text-gray-900">${cliente.fecha_nacimiento || "No especificada"}</span>
      </div>
      <div class="flex justify-between items-center py-2 border-b border-gray-100">
        <span class="text-sm font-medium text-gray-600">País de Residencia:</span>
        <span class="text-sm text-gray-900">${cliente.pais_residencia || "No especificado"}</span>
      </div>
      <div class="flex justify-between items-center py-2 border-b border-gray-100">
        <span class="text-sm font-medium text-gray-600">Estado Civil:</span>
        <span class="text-sm text-gray-900">${cliente.estado_civil || "No especificado"}</span>
      </div>
      <div class="flex justify-between items-center py-2 border-b border-gray-100">
        <span class="text-sm font-medium text-gray-600">Correo:</span>
        <span class="text-sm text-gray-900">${cliente.correo || "No especificado"}</span>
      </div>
      <div class="flex justify-between items-center py-2 border-b border-gray-100">
        <span class="text-sm font-medium text-gray-600">Celular:</span>
        <span class="text-sm text-gray-900">${cliente.celular || "No especificado"}</span>
      </div>
      <div class="flex justify-between items-center py-2">
        <span class="text-sm font-medium text-gray-600">Trabajo Actual:</span>
        <span class="text-sm text-gray-900">${trabajoActual}</span>
      </div>
    </div>
  `

  // Estado del proceso
  document.getElementById("estadoProcesoCliente").innerHTML = `
    <div class="space-y-4">
      <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
        <span class="text-sm font-medium text-gray-600">Tipo de Visa:</span>
        <span class="px-2 py-1 text-xs font-semibold rounded-full ${getBadgeClassTipoVisa(cliente.tipo_asesoria)}">${cliente.tipo_asesoria}</span>
      </div>
      <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
        <span class="text-sm font-medium text-gray-600">Estado del Formulario:</span>
        <span class="px-2 py-1 text-xs font-semibold rounded-full ${getBadgeClassEstadoFormulario(cliente.estado_formulario)}">${cliente.estado_formulario}</span>
      </div>
      <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
        <span class="text-sm font-medium text-gray-600">Estado del Proceso:</span>
        <span class="px-2 py-1 text-xs font-semibold rounded-full ${getBadgeClassEstadoProceso(cliente.estado_proceso)}">${cliente.estado_proceso || "Sin estado"}</span>
      </div>
      <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
        <span class="text-sm font-medium text-gray-600">Fecha de Asesoría:</span>
        <span class="text-sm text-gray-900">${formatearFecha(cliente.fecha_asesoria)}</span>
      </div>
      <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
        <span class="text-sm font-medium text-gray-600">Lugar:</span>
        <span class="text-sm text-gray-900">${cliente.lugar}</span>
      </div>
      ${
        cliente.descripcion
          ? `
      <div class="p-3 bg-gray-50 rounded-lg">
        <span class="text-sm font-medium text-gray-600 block mb-2">Descripción:</span>
        <span class="text-sm text-gray-900">${cliente.descripcion}</span>
      </div>
      `
          : ""
      }
    </div>
  `
}

// Cargar documentos del cliente con documentos específicos por tipo de visa
async function cargarDocumentosCliente(idFormElegibilidad) {
  try {
    const response = await fetch(`/asesor/api/documentos/${idFormElegibilidad}`)
    const data = await response.json()

    const listaDocumentos = document.getElementById("listaDocumentos")

    if (data.documentos && data.documentos.length > 0) {
      // Filtrar solo documentos relevantes para el tipo de visa
      const documentosRelevantes = filtrarDocumentosPorTipoVisa(data.documentos, clienteActual?.tipo_asesoria)

      if (documentosRelevantes.length > 0) {
        listaDocumentos.innerHTML = `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${documentosRelevantes
              .map(
                (doc) => `
              <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <h6 class="text-sm font-medium text-gray-900 mb-2 flex items-center">
                      <svg class="w-4 h-4 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      ${doc.nombre}
                      ${doc.required ? '<span class="text-red-500 ml-1">*</span>' : ""}
                    </h6>
                    <p class="text-xs text-gray-500 mb-3">${doc.descripcion}</p>
                    <div class="flex items-center justify-between">
                      <span class="px-2 py-1 text-xs font-semibold rounded-full ${doc.tiene_archivo ? "bg-green-100 text-green-600" : doc.required ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-600"}">
                        ${doc.tiene_archivo ? "Adjuntado" : doc.required ? "Requerido" : "Opcional"}
                      </span>
                      ${
                        doc.tiene_archivo
                          ? `
                        <button onclick="descargarDocumento('${doc.archivo}', '${doc.campo}')" class="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center">
                          <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          </svg>
                          Descargar
                        </button>
                      `
                          : ""
                      }
                    </div>
                  </div>
                </div>
              </div>
            `,
              )
              .join("")}
          </div>
        `
      } else {
        listaDocumentos.innerHTML = `
          <div class="text-center py-12 text-gray-500">
            <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No hay documentos configurados</h3>
          <p class="text-sm">No hay documentos específicos para este tipo de visa</p>
        </div>
      `
      }
    } else {
      listaDocumentos.innerHTML = `
        <div class="text-center py-12 text-gray-500">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No hay documentos</h3>
          <p class="text-sm">No hay documentos registrados para este cliente</p>
        </div>
      `
    }
  } catch (error) {
    console.error("Error al cargar documentos:", error)
    document.getElementById("listaDocumentos").innerHTML = `
      <div class="bg-red-50 border border-red-200 rounded-xl p-4">
        <div class="flex items-center">
          <svg class="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="text-sm text-red-600">Error al cargar los documentos</span>
        </div>
      </div>
    `
  }
}

// Filtrar documentos según el tipo de visa
function filtrarDocumentosPorTipoVisa(documentos, tipoVisa) {
  const documentosPorVisa = {
    Turismo: [
      { name: "doc_itinerario_viaje", required: true },
      { name: "doc_carta_motivacion", required: true },
      { name: "doc_carta_laboral", required: true },
      { name: "doc_certificados_propiedad", required: false },
      { name: "doc_extractos_bancarios", required: true },
      { name: "doc_carta_invitacion", required: false },
      { name: "doc_carta_invitacion_familiar", required: false },
      { name: "doc_prueba_parentesco", required: false },
      { name: "doc_finanzas_familiar", required: false },
    ],
    Estudios: [
      { name: "doc_carta_aceptacion", required: true },
      { name: "doc_pago_matricula", required: true },
      { name: "doc_pruebas_fondos", required: true },
      { name: "doc_carta_motivacion_estudio", required: true },
      { name: "doc_historial_academico", required: true },
      { name: "doc_examen_medico_estudio", required: false },
      { name: "doc_formulario_custodia", required: false },
    ],
    "Trabajo temporal": [
      { name: "doc_oferta_laboral", required: true },
      { name: "doc_lmia", required: true },
      { name: "doc_contrato_laboral", required: true },
      { name: "doc_certificados_experiencia", required: true },
      { name: "doc_hoja_vida", required: true },
      { name: "doc_diplomas", required: true },
      { name: "doc_examen_medico", required: false },
      { name: "doc_carta_motivacion_trabajo", required: false },
    ],
    Negocios: [
      { name: "doc_carta_invitacion_negocios", required: true },
      { name: "doc_registro_camara", required: true },
      { name: "doc_certificados_bancarios_empresa", required: true },
      { name: "doc_itinerario_negocios", required: true },
      { name: "doc_carta_empleador", required: false },
      { name: "doc_contratos_comerciales", required: false },
      { name: "doc_vinculo_comercial", required: true },
    ],
    "Residencia permanente": [
      { name: "doc_idioma", required: true },
      { name: "doc_eca", required: true },
      { name: "doc_pasaporte", required: true },
      { name: "doc_historial_laboral", required: true },
      { name: "doc_carta_intencion_residencia", required: true },
      { name: "doc_examen_medico_residencia", required: false },
      { name: "doc_antecedentes", required: true },
    ],
  }

  const documentosRequeridos = documentosPorVisa[tipoVisa] || []

  return documentos.filter((doc) => {
    const docRequerido = documentosRequeridos.find((req) => req.name === doc.campo)
    if (docRequerido) {
      doc.required = docRequerido.required
      return true
    }
    return false
  })
}

// Cargar notas del cliente
async function cargarNotasCliente(codigoAsesoria) {
  try {
    const response = await fetch(`/asesor/api/notas/${codigoAsesoria}`)
    const data = await response.json()

    const listaNotas = document.getElementById("listaNotas")

    if (data.notas && data.notas.length > 0) {
      listaNotas.innerHTML = data.notas
        .map(
          (nota) => `
        <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div class="flex justify-between items-start mb-3">
            <div class="flex items-center text-xs text-gray-500">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3a2 2 0 012-2h6a2 2 0 012 2v4m-8 0h8m-8 0V7a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2m-8 0V7"></path>
              </svg>
              ${formatearFecha(nota.fecha_creacion)}
            </div>
            <button onclick="eliminarNota(${nota.id})" class="text-red-500 hover:text-red-700 transition-colors duration-200">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </div>
          <p class="text-sm text-gray-700 leading-relaxed">${nota.contenido}</p>
        </div>
      `,
        )
        .join("")
    } else {
      listaNotas.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
          <p class="text-sm">No hay notas registradas para este cliente</p>
        </div>
      `
    }
  } catch (error) {
    console.error("Error al cargar notas:", error)
  }
}

// Cargar historial del cliente
async function cargarHistorialCliente(idSolicitante) {
  try {
    const response = await fetch(`/asesor/api/historial/${idSolicitante}`)
    const data = await response.json()

    const historialAsesorias = document.getElementById("historialAsesorias")

    if (data.historial && data.historial.length > 0) {
      historialAsesorias.innerHTML = data.historial
        .map(
          (asesoria) => `
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300 mb-4">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center mb-2">
                <h6 class="text-sm font-semibold text-gray-900">${asesoria.tipo_asesoria}</h6>
                <span class="ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getBadgeClassEstadoProceso(asesoria.estado_proceso)}">
                  ${asesoria.estado_proceso || "Sin estado"}
                </span>
              </div>
              <p class="text-sm text-gray-600 mb-3">${asesoria.descripcion || "Sin descripción"}</p>
              <div class="flex items-center text-xs text-gray-500 space-x-4">
                <div class="flex items-center">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3a2 2 0 012-2h6a2 2 0 012 2v4m-8 0h8m-8 0V7a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2m-8 0V7"></path>
                  </svg>
                  ${formatearFecha(asesoria.fecha_asesoria)}
                </div>
                <div class="flex items-center">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  ${asesoria.lugar}
                </div>
                <div class="flex items-center">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                  ${asesoria.asesor_completo}
                </div>
              </div>
            </div>
            <div class="ml-4">
              <button onclick="verFormularioHistorial(${asesoria.id_formElegibilidad})" class="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
                Ver Formulario
              </button>
            </div>
          </div>
        </div>
      `,
        )
        .join("")
    } else {
      historialAsesorias.innerHTML = `
        <div class="text-center py-12 text-gray-500">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No hay historial</h3>
          <p class="text-sm">No hay historial de asesorías para este cliente</p>
        </div>
      `
    }
  } catch (error) {
    console.error("Error al cargar historial:", error)
  }
}

// Navegación del modal (stepper)
function navegarModal(direccion) {
  if (direccion === "next" && currentModalStep < totalModalSteps - 1) {
    currentModalStep++
  } else if (direccion === "prev" && currentModalStep > 0) {
    currentModalStep--
  }

  actualizarStepperModal()
}

// Actualizar stepper del modal
function actualizarStepperModal() {
  // Actualizar contenido visible
  const contents = document.querySelectorAll("#modalDetalleCliente .stepper-content")
  contents.forEach((content, index) => {
    if (index === currentModalStep) {
      content.classList.remove("hidden")
    } else {
      content.classList.add("hidden")
    }
  })

  // Actualizar stepper visual
  const steps = document.querySelectorAll("#modalDetalleCliente .stepper-step")
  steps.forEach((step, index) => {
    const circle = step.querySelector("div")
    if (index === currentModalStep) {
      step.classList.add("active")
      circle.classList.remove("bg-gray-200", "text-gray-500")
      circle.classList.add("bg-primary-600", "text-white")
    } else if (index < currentModalStep) {
      step.classList.remove("active")
      circle.classList.remove("bg-gray-200", "text-gray-500")
      circle.classList.add("bg-green-500", "text-white")
      circle.innerHTML =
        '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
    } else {
      step.classList.remove("active")
      circle.classList.remove("bg-primary-600", "bg-green-500", "text-white")
      circle.classList.add("bg-gray-200", "text-gray-500")
      circle.innerHTML = index + 1
    }
  })

  // Actualizar botones
  const prevBtn = document.getElementById("modal-prev-btn")
  const nextBtn = document.getElementById("modal-next-btn")

  if (currentModalStep === 0) {
    prevBtn.classList.add("hidden")
  } else {
    prevBtn.classList.remove("hidden")
  }

  if (currentModalStep === totalModalSteps - 1) {
    nextBtn.classList.add("hidden")
  } else {
    nextBtn.classList.remove("hidden")
  }

  // Actualizar indicador móvil
  const stepNumber = document.getElementById("current-step-number")
  const stepText = document.getElementById("current-step-text")
  if (stepNumber && stepText) {
    stepNumber.textContent = currentModalStep + 1
    const stepNames = ["Información del Cliente", "Documentos Adjuntos", "Notas Privadas", "Historial de Asesorías"]
    stepText.textContent = stepNames[currentModalStep]
  }
}

// Guardar nueva nota
async function guardarNota() {
  const contenido = document.getElementById("nuevaNota").value.trim()

  if (!contenido) {
    mostrarAlerta("Por favor ingrese el contenido de la nota", "warning")
    return
  }

  if (!clienteActual) {
    mostrarAlerta("Error: No se ha seleccionado un cliente", "error")
    return
  }

  try {
    const response = await fetch("/asesor/api/notas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        codigo_asesoria: clienteActual.codigo_asesoria,
        contenido: contenido,
      }),
    })

    if (!response.ok) {
      throw new Error("Error al guardar la nota")
    }

    document.getElementById("nuevaNota").value = ""
    cargarNotasCliente(clienteActual.codigo_asesoria)
    mostrarAlerta("Nota guardada exitosamente", "success")
  } catch (error) {
    console.error("Error:", error)
    mostrarAlerta("Error al guardar la nota: " + error.message, "error")
  }
}

// Eliminar nota
async function eliminarNota(idNota) {
  if (!confirm("¿Está seguro de que desea eliminar esta nota?")) {
    return
  }

  try {
    const response = await fetch(`/asesor/api/notas/${idNota}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error("Error al eliminar la nota")
    }

    cargarNotasCliente(clienteActual.codigo_asesoria)
    mostrarAlerta("Nota eliminada exitosamente", "success")
  } catch (error) {
    console.error("Error:", error)
    mostrarAlerta("Error al eliminar la nota: " + error.message, "error")
  }
}

// Abrir modal para actualizar estado
function abrirModalActualizarEstado(codigoAsesoria) {
  document.getElementById("clienteIdActualizar").value = codigoAsesoria

  document.getElementById("modalActualizarEstado").classList.remove("hidden")
  document.getElementById("modalActualizarEstado").classList.add("flex")
}

// Cerrar modal actualizar estado
function cerrarModalActualizarEstado() {
  document.getElementById("modalActualizarEstado").classList.add("hidden")
  document.getElementById("modalActualizarEstado").classList.remove("flex")
}

// Confirmar actualización de estado
async function confirmarActualizacionEstado() {
  const codigoAsesoria = document.getElementById("clienteIdActualizar").value
  const nuevoEstado = document.getElementById("nuevoEstadoProceso").value
  const observaciones = document.getElementById("observacionesEstado").value

  try {
    const response = await fetch("/asesor/api/actualizar-estado", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        codigo_asesoria: codigoAsesoria,
        estado_proceso: nuevoEstado,
        observaciones: observaciones,
      }),
    })

    if (!response.ok) {
      throw new Error("Error al actualizar el estado")
    }

    cerrarModalActualizarEstado()

    // Limpiar formulario
    document.getElementById("formActualizarEstado").reset()

    // Recargar datos de la página actual
    cargarClientes(currentPage)

    // Si el modal de detalle está abierto, actualizar también
    if (clienteActual && clienteActual.codigo_asesoria == codigoAsesoria) {
      verDetalleCliente(codigoAsesoria)
    }

    mostrarAlerta("Estado actualizado exitosamente", "success")
  } catch (error) {
    console.error("Error:", error)
    mostrarAlerta("Error al actualizar el estado: " + error.message, "error")
  }
}

// Cerrar modal de detalle
function cerrarModalDetalle() {
  document.getElementById("modalDetalleCliente").classList.add("hidden")
  document.getElementById("modalDetalleCliente").classList.remove("flex")
  clienteActual = null
  currentModalStep = 0
}

// Descargar documento desde Cloudinary - descarga directa y nombre real
async function descargarDocumento(urlCloudinary, nombreColumna) {
  try {
    // Obtener el nombre real del archivo desde la URL
    let filename = "documento";
    try {
      const url = new URL(urlCloudinary);
      const pathParts = url.pathname.split("/");
      filename = pathParts[pathParts.length - 1]; // nombre y extensión real
    } catch (e) {
      filename = nombreColumna || "documento";
    }

    // Descargar el archivo usando fetch
    const response = await fetch(urlCloudinary);
    if (!response.ok) {
      throw new Error("Error al descargar el archivo");
    }

    const blob = await response.blob();

    // Crear enlace de descarga
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.target = "_self";

    // Agregar al DOM temporalmente y hacer clic
    document.body.appendChild(link);
    link.click();

    // Limpiar
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error("Error al descargar documento:", error);
    mostrarAlerta("Error al descargar el documento: " + error.message, "error");
  }
}

// Descargar formulario - CORREGIDO: Solo círculo de carga sin texto
function descargarFormulario(idFormElegibilidad) {
  // Mostrar indicador de carga en el botón específico - SOLO CÍRCULO
  const button = event.target.closest("button")
  const originalHTML = button.innerHTML
  button.disabled = true
  button.innerHTML = `
    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
  `

  // Crear enlace de descarga sin abrir nueva pestaña
  const link = document.createElement("a")
  link.href = `/asesor/api/descargar-formulario/${idFormElegibilidad}`
  link.download = "" // Forzar descarga
  link.target = "_self" // No abrir nueva pestaña

  // Agregar al DOM temporalmente y hacer clic
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Restaurar botón después de un breve delay
  setTimeout(() => {
    button.disabled = false
    button.innerHTML = originalHTML
  }, 2000)
}

// Ver formulario del historial
function verFormularioHistorial(idFormElegibilidad) {
  window.open(`/asesor/formulario/${idFormElegibilidad}`, "_blank")
}

// Exportar clientes - ARREGLADO para no abrir nueva pestaña
function exportarClientes() {
  // Mostrar indicador de carga
  const button = event.target
  const originalText = button.innerHTML
  button.disabled = true
  button.innerHTML = `
    <div class="flex items-center justify-center">
      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
      <span>Generando PDF...</span>
    </div>
  `

  // Crear enlace de descarga sin abrir nueva pestaña
  const link = document.createElement("a")
  link.href = "/asesor/api/exportar-clientes"
  link.download = "" // Forzar descarga
  link.target = "_self" // No abrir en nueva pestaña

  // Agregar al DOM temporalmente y hacer clic
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Restaurar botón después de un breve delay
  setTimeout(() => {
    button.disabled = false
    button.innerHTML = originalText
  }, 2000)
}

// Actualizar datos
function actualizarDatos() {
  cargarClientes(currentPage)
}

// Mostrar alerta
function mostrarAlerta(mensaje, tipo = "info") {
  const alertaHtml = `
    <div class="fixed top-4 right-4 z-50 animate-fade-in">
      <div class="bg-white rounded-xl shadow-2xl border-l-4 ${tipo === "success" ? "border-green-500" : tipo === "error" ? "border-red-500" : "border-blue-500"} p-4 max-w-sm">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <svg class="w-5 h-5 ${tipo === "success" ? "text-green-500" : tipo === "error" ? "text-red-500" : "text-blue-500"}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              ${
                tipo === "success"
                  ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>'
                  : tipo === "error"
                    ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
                    : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
              }
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-900">${mensaje}</p>
          </div>
          <div class="ml-auto pl-3">
            <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-gray-400 hover:text-gray-600">
              <svg class="w-4 h-4" fill="none"  class="text-gray-400 hover:text-gray-600">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `

  document.body.insertAdjacentHTML("beforeend", alertaHtml)

  // Auto-remover después de 5 segundos
  setTimeout(() => {
    const alertas = document.querySelectorAll(".fixed.top-4.right-4")
    if (alertas.length > 0) {
      alertas[alertas.length - 1].remove()
    }
  }, 5000)
}
