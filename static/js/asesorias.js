// Variables globales para Stripe
let stripe
let elements
let paymentElement
let clientSecret

// Variables para el formulario de asesoría y calendario
let selectedAsesorId = null
let selectedAsesorName = null
let selectedAsesorEspecialidad = null
let selectedDate = null
let selectedTime = null
let reservationId = null

// Definir precios por tipo de visa (para usar en el frontend)
const PRECIOS_VISA = {
  "Visa de Trabajo": 150.0,
  "Visa de Estudio": 100.0,
  "Residencia Permanente": 200.0,
  Ciudadanía: 250.0,
  Otro: 150.0,
}

// Función para formatear fechas en un formato legible
function formatDate(dateString) {
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
  return new Date(dateString).toLocaleDateString("es-ES", options)
}

// Función para verificar si una asesoría está vigente o vencida
function isAsesoriaVigente(fechaAsesoria) {
  const now = new Date()
  const fechaAsesoriaDate = new Date(fechaAsesoria)
  return fechaAsesoriaDate > now
}

// Función para generar un color aleatorio para los avatares
function getRandomColor() {
  const colors = [
    "bg-red-100 text-red-600",
    "bg-blue-100 text-blue-600",
    "bg-green-100 text-green-600",
    "bg-yellow-100 text-yellow-600",
    "bg-purple-100 text-purple-600",
    "bg-pink-100 text-pink-600",
    "bg-indigo-100 text-indigo-600",
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

// Función para generar un avatar con iniciales
function generateAvatar(name) {
  if (!name) return "U"
  const parts = name.split(" ")
  if (parts.length >= 2) {
    return parts[0][0] + parts[1][0]
  }
  return name[0]
}

// Función para enumerar y ordenar asesorías
function ordenarYNumerarAsesorias() {
  const tbody = document.getElementById("asesorias-table-body")
  if (!tbody) return // Evitar errores si no existe el elemento

  const rows = Array.from(tbody.querySelectorAll("tr[data-asesoria-id]"))

  // Ordenar de mayor a menor por "data-asesoria-id"
  rows.sort((a, b) => {
    const idA = Number.parseInt(a.getAttribute("data-asesoria-id"))
    const idB = Number.parseInt(b.getAttribute("data-asesoria-id"))
    return idB - idA // Orden descendente
  })

  // Reorganizar filas en el DOM sin borrar contenido
  rows.forEach((row, index) => {
    const numCell = row.querySelector(".numero-asesoria")
    if (numCell) {
      numCell.textContent = `#${rows.length - index}` // Asigna número inverso
    }
    tbody.appendChild(row) // Mueve la fila principal

    // Buscar y mover también la fila de detalles
    const detailsRow = document.getElementById(`details-${row.getAttribute("data-asesoria-id")}`)
    if (detailsRow) {
      tbody.appendChild(detailsRow)
    }
  })
}

// Función para mostrar una notificación
function showNotification(message, type = "success") {
  // Crear el elemento de notificación
  const notification = document.createElement("div")
  notification.className = `fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 transform transition-all duration-500 translate-x-full`

  // Aplicar estilos según el tipo
  if (type === "success") {
    notification.classList.add("bg-green-100", "text-green-800", "border-l-4", "border-green-500")
  } else if (type === "error") {
    notification.classList.add("bg-red-100", "text-red-800", "border-l-4", "border-red-500")
  } else if (type === "warning") {
    notification.classList.add("bg-yellow-100", "text-yellow-800", "border-l-4", "border-yellow-500")
  } else {
    notification.classList.add("bg-blue-100", "text-blue-800", "border-l-4", "border-blue-500")
  }

  // Agregar el mensaje
  notification.innerHTML = `
      <div class="flex items-center">
          <div class="flex-shrink-0">
              ${
                type === "success"
                  ? '<svg class="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
                  : type === "error"
                    ? '<svg class="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
                    : type === "warning"
                      ? '<svg class="h-5 w-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>'
                      : '<svg class="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
              }
          </div>
          <div class="ml-3">
              <p class="text-sm">${message}</p>
          </div>
          <div class="ml-auto pl-3">
              <button class="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none cursor-pointer">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
          </div>
      </div>
  `

  // Agregar al DOM
  document.body.appendChild(notification)

  // Animar la entrada
  setTimeout(() => {
    notification.classList.remove("translate-x-full")
    notification.classList.add("translate-x-0")
  }, 100)

  // Configurar la eliminación automática
  setTimeout(() => {
    notification.classList.remove("translate-x-0")
    notification.classList.add("translate-x-full")

    // Eliminar del DOM después de la animación
    setTimeout(() => {
      notification.remove()
    }, 500)
  }, 5000)

  // Agregar evento para cerrar manualmente
  notification.querySelector("button").addEventListener("click", () => {
    notification.classList.remove("translate-x-0")
    notification.classList.add("translate-x-full")

    // Eliminar del DOM después de la animación
    setTimeout(() => {
      notification.remove()
    }, 500)
  })
}

// Implementación del tooltip flotante para consejos útiles

// Función para mostrar el tooltip con consejos útiles
function showTipsTooltip(event) {
  // Eliminar cualquier tooltip existente
  const existingTooltip = document.getElementById("tips-tooltip")
  if (existingTooltip) {
    existingTooltip.remove()
  }

  // Crear el tooltip
  const tooltip = document.createElement("div")
  tooltip.id = "tips-tooltip"
  tooltip.className = "fixed z-50 bg-white rounded-xl shadow-2xl p-4 max-w-md border border-gray-200 animate-fade-in"
  tooltip.style.width = "320px"

  // Contenido del tooltip
  tooltip.innerHTML = `
    <div class="flex justify-between items-start mb-3">
      <h4 class="text-sm font-medium text-gray-900">Consejos útiles</h4>
      <button id="close-tooltip" class="text-gray-400 hover:text-gray-600">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
    <p class="text-sm text-blue-700 mb-3">Seleccione una fecha y hora para su asesoría. Las citas están disponibles de lunes a viernes en horario laboral. Recuerde que debe completar el proceso de pago dentro de los 5 minutos siguientes a la reserva.</p>
    <div class="grid grid-cols-1 gap-2">
      <div class="bg-green-50 p-2 rounded-xl border border-green-200 flex items-center">
        <svg class="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <p class="text-xs text-green-700">Los horarios se muestran en su zona horaria local.</p>
      </div>
      <div class="bg-purple-50 p-2 rounded-xl border border-purple-200 flex items-center">
        <svg class="w-4 h-4 text-purple-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <p class="text-xs text-purple-700">Puede reprogramar su cita hasta 24 horas antes.</p>
      </div>
      <div class="bg-amber-50 p-2 rounded-xl border border-amber-200 flex items-center">
        <svg class="w-4 h-4 text-amber-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <p class="text-xs text-amber-700">Las asesorías tienen una duración de 60 minutos.</p>
      </div>
      <div class="bg-sky-50 p-2 rounded-xl border border-sky-200 flex items-center">
        <svg class="w-4 h-4 text-sky-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path>
        </svg>
        <p class="text-xs text-sky-700">Las asesorías virtuales se realizan por Zoom o Teams.</p>
      </div>
    </div>
  `

  // Posicionar el tooltip cerca del botón que lo activó
  const buttonRect = event.target.closest("button").getBoundingClientRect()
  tooltip.style.top = `${buttonRect.bottom + 10}px`
  tooltip.style.left = `${buttonRect.left - 150}px` // Centrar aproximadamente

  // Asegurarse de que el tooltip no se salga de la pantalla
  document.body.appendChild(tooltip)
  const tooltipRect = tooltip.getBoundingClientRect()

  if (tooltipRect.right > window.innerWidth) {
    tooltip.style.left = `${window.innerWidth - tooltipRect.width - 10}px`
  }

  if (tooltipRect.bottom > window.innerHeight) {
    tooltip.style.top = `${buttonRect.top - tooltipRect.height - 10}px`
  }

  // Agregar evento para cerrar el tooltip
  document.getElementById("close-tooltip").addEventListener("click", () => {
    tooltip.remove()
  })

  // Cerrar el tooltip al hacer clic fuera de él
  document.addEventListener("click", function closeTooltip(e) {
    if (!tooltip.contains(e.target) && e.target !== event.target && !event.target.contains(e.target)) {
      tooltip.remove()
      document.removeEventListener("click", closeTooltip)
    }
  })
}

// Función para formatear el tiempo restante en formato mm:ss
function formatTimeRemaining(milliseconds) {
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000)

  const formattedMinutes = String(minutes).padStart(2, "0")
  const formattedSeconds = String(seconds).padStart(2, "0")

  return `${formattedMinutes}:${formattedSeconds}`
}

// Inicializar los botones de consejos útiles cuando se carga la página
document.addEventListener("DOMContentLoaded", () => {
  // Inicializar el resto de funcionalidades
  ordenarYNumerarAsesorias()

  // Agregar event listeners para los filtros
  const searchInput = document.getElementById("search-input")
  const statusFilter = document.getElementById("filter-status")
  const dateFilter = document.getElementById("filter-date")

  if (searchInput) searchInput.addEventListener("input", filterAsesorias)
  if (statusFilter) statusFilter.addEventListener("change", filterAsesorias)
  if (dateFilter) dateFilter.addEventListener("change", filterAsesorias)

  // Inicializar el stepper para el modal de asesoría
  initStepper()

  // Agregar validación en tiempo real para los campos obligatorios
  const tipoAsesoria = document.getElementById("tipo_asesoria")
  const asesorSelect = document.getElementById("asesor_id")
  const numeroDocumento = document.getElementById("numero_documento")

  // Función para validar campos y actualizar estado del botón
  function validateRequiredFields() {
    const nextBtn = document.getElementById("stepper-next-btn")

    if (tipoAsesoria && asesorSelect && numeroDocumento) {
      const isValid = tipoAsesoria.value !== "" && asesorSelect.value !== "" && numeroDocumento.value.trim() !== ""

      if (isValid) {
        nextBtn.classList.remove("opacity-50", "cursor-not-allowed")
        nextBtn.disabled = false
      } else {
        nextBtn.classList.add("opacity-50", "cursor-not-allowed")
        nextBtn.disabled = true
      }
    }
  }

  // Agregar listeners para validación en tiempo real
  if (tipoAsesoria) tipoAsesoria.addEventListener("change", validateRequiredFields)
  if (asesorSelect) asesorSelect.addEventListener("change", validateRequiredFields)
  if (numeroDocumento) numeroDocumento.addEventListener("input", validateRequiredFields)

  // Validar campos al cargar la página
  validateRequiredFields()

  // Inicializar el botón principal de consejos útiles
  const mainTipsBtn = document.getElementById("show-tips-btn-main")
  if (mainTipsBtn) {
    mainTipsBtn.addEventListener("click", showTipsTooltip)
  }
})

// Función para filtrar asesorías
function filterAsesorias() {
  const searchInput = document.getElementById("search-input")
  const statusFilter = document.getElementById("filter-status")
  const dateFilter = document.getElementById("filter-date")
  const rows = document.querySelectorAll("#asesorias-table-body tr[data-asesoria-id]")
  const noResults = document.getElementById("no-results")

  let visibleCount = 0

  // Obtener valores de filtro
  const searchText = searchInput ? searchInput.value.toLowerCase() : ""
  const statusValue = statusFilter ? statusFilter.value : ""
  const dateValue = dateFilter ? dateFilter.value : ""

  // Filtrar filas
  rows.forEach((row) => {
    // Obtener datos de la fila
    const asesoriaId = row.getAttribute("data-asesoria-id")
    const estado = row.getAttribute("data-estado") // vigente, vencida
    const pagoEstado = row.getAttribute("data-pago-estado") // Pagada, Pendiente

    // Obtener texto de la fila para búsqueda
    const rowText = row.textContent.toLowerCase()

    // Obtener fecha de la asesoría
    const fechaCell = row.querySelector("td:nth-child(2)")
    const fechaText = fechaCell ? fechaCell.textContent.trim() : ""
    const fechaParts = fechaText.split("\n")
    const fecha = fechaParts[0]
    const hora = fechaParts[1] ? fechaParts[1].trim() : "00:00"

    // Aplicar filtros
    let showRow = true

    // Filtro de búsqueda
    if (searchText && !rowText.includes(searchText)) {
      showRow = false
    }

    // Filtro de estado
    if (statusValue) {
      if (statusValue === "vigente" && estado !== "vigente") {
        showRow = false
      } else if (statusValue === "vencida" && estado !== "vencida") {
        showRow = false
      } else if (statusValue === "pendiente" && pagoEstado !== "Pendiente") {
        showRow = false
      } else if (statusValue === "activo" && pagoEstado !== "Pagada") {
        showRow = false
      }
    }

    // Filtro de fecha
    if (dateValue) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay()) // Domingo

      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

      // Ensure fechaAsesoria is defined and is a Date object
      let fechaAsesoria
      try {
        fechaAsesoria = new Date(fecha)
        if (isNaN(fechaAsesoria.getTime())) {
          showRow = false // Invalid date, hide the row
          return
        }
      } catch (e) {
        showRow = false // Error creating date, hide the row
        return
      }

      if (dateValue === "today" && fechaAsesoria.toDateString() !== today.toDateString()) {
        showRow = false
      } else if (
        dateValue === "week" &&
        (fechaAsesoria < weekStart ||
          fechaAsesoria > new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + 6))
      ) {
        showRow = false
      } else if (
        dateValue === "month" &&
        (fechaAsesoria < monthStart || fechaAsesoria > new Date(today.getFullYear(), today.getMonth() + 1, 0))
      ) {
        showRow = false
      }
    }

    // Mostrar u ocultar fila
    if (showRow) {
      row.classList.remove("hidden")
      visibleCount++

      // También mostrar la fila de detalles si está abierta
      const detailsRow = document.getElementById(`details-${asesoriaId}`)
      if (detailsRow && !detailsRow.classList.contains("hidden")) {
        detailsRow.classList.remove("hidden")
      }
    } else {
      row.classList.add("hidden")

      // Ocultar la fila de detalles
      const detailsRow = document.getElementById(`details-${asesoriaId}`)
      if (detailsRow) {
        detailsRow.classList.add("hidden")
      }
    }
  })

  // Mostrar mensaje si no hay resultados
  if (noResults) {
    if (visibleCount === 0) {
      noResults.classList.remove("hidden")
    } else {
      noResults.classList.add("hidden")
    }
  }
}

// Función para mostrar/ocultar detalles de una asesoría
function toggleDetails(asesoriaId) {
  const detailsRow = document.getElementById(`details-${asesoriaId}`)
  if (!detailsRow) return

  if (detailsRow.classList.contains("hidden")) {
    // Mostrar detalles con animación
    detailsRow.classList.remove("hidden")

    // Obtener datos de la asesoría para mostrar detalles más completos
    const mainRow = document.querySelector(`tr[data-asesoria-id="${asesoriaId}"]`)
    if (mainRow) {
      const tipoAsesoria = mainRow.getAttribute("data-tipo-asesoria") || "No especificado"
      const estado = mainRow.getAttribute("data-estado") || "No especificado"
      const estadoPago = mainRow.getAttribute("data-pago-estado") || "No especificado"

      // Obtener fecha y hora de la celda correspondiente
      const fechaCell = mainRow.querySelector("td:nth-child(2)")
      const fechaText = fechaCell ? fechaCell.textContent.trim() : ""
      const fechaParts = fechaText.split("\n")
      const fecha = fechaParts[0] || "No especificada"
      const hora = fechaParts[1] ? fechaParts[1].trim() : "No especificada"

      // Obtener asesor de la celda correspondiente
      const asesorCell = mainRow.querySelector("td:nth-child(3)")
      const asesor = asesorCell ? asesorCell.textContent.trim() : "No especificado"

      // Obtener solicitante de la celda correspondiente
      const solicitanteCell = mainRow.querySelector("td:nth-child(4)")
      const solicitante = solicitanteCell
        ? solicitanteCell.querySelector("span")?.textContent.trim()
        : "No especificado"

      // Actualizar el contenido de los detalles con los datos obtenidos
      const detailsContent = detailsRow.querySelector("div")
      if (detailsContent) {
        // Mostrar un indicador de carga mientras se obtienen los detalles completos
        detailsContent.innerHTML = `
          <div class="flex justify-center items-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-t-2 border-primary-600"></div>
            <p class="ml-3 text-primary-600 text-sm">Cargando detalles...</p>
          </div>
        `

        // Cargar los detalles completos de la asesoría
        fetch(`/asesorias/obtener_detalles_asesoria/${asesoriaId}`)
          .then((response) => {
            if (!response.ok) {
              throw new Error("Error al cargar detalles")
            }
            return response.json()
          })
          .then((data) => {
            if (data.success && data.asesoria) {
              const asesoria = data.asesoria

              // Actualizar el contenido con los datos completos
              detailsContent.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <!-- Tarjeta de Detalles del Asesor -->
                  <div class="bg-white p-5 rounded-xl shadow-lg border border-gray-100 transform transition-all duration-300 hover:shadow-xl hover:scale-[1.01]">
                    <div class="flex items-center mb-4">
                      <div class="w-12 h-12 rounded-full ${getRandomColor()} flex items-center justify-center text-lg font-bold mr-3">
                        ${generateAvatar(asesor)}
                      </div>
                      <div>
                        <h4 class="font-medium text-gray-900 text-lg">Detalles del Asesor</h4>
                        <p class="text-sm text-gray-500">Información de contacto</p>
                      </div>
                    </div>
                    
                    <div class="space-y-3">
                      <div class="flex items-center">
                        <svg class="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                        <div>
                          <p class="text-sm text-gray-700"><span class="font-medium">Nombre:</span> ${asesor}</p>
                        </div>
                      </div>
                      
                      <div class="flex items-center">
                        <svg class="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                        </svg>
                        <div>
                          <p class="text-sm text-gray-700"><span class="font-medium">Especialidad:</span> ${asesoria.especialidad || "Inmigración Canadiense"}</p>
                        </div>
                      </div>
                      
                      <div class="flex items-center">
                        <svg class="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                        </svg>
                        <div>
                          <p class="text-sm text-gray-700"><span class="font-medium">Contacto:</span> asesor@cva.com</p>
                        </div>
                      </div>
                    </div>
                    
                    <button onclick="verHistorialChat(${asesoriaId})"
                      class="mt-4 relative overflow-hidden group bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-600 text-white text-xs font-medium py-2 px-4 rounded-xl shadow-md hover:shadow-primary-500/30 transition-all duration-300 cursor-pointer w-full">
                      <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
                      <div class="relative flex items-center justify-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                        </svg>
                        <span>Ver registro de chat</span>
                      </div>
                    </button>
                  </div>

                  <!-- Tarjeta de Detalles de la Asesoría -->
                  <div class="bg-white p-5 rounded-xl shadow-lg border border-gray-100 transform transition-all duration-300 hover:shadow-xl hover:scale-[1.01]">
                    <div class="flex items-center mb-4">
                      <div class="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mr-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                        </svg>
                      </div>
                      <div>
                        <h4 class="font-medium text-gray-900 text-lg">Detalles de la Asesoría</h4>
                        <p class="text-sm text-gray-500">Información de la cita</p>
                      </div>
                    </div>
                    
                    <div class="space-y-3">
                      <div class="flex items-center">
                        <svg class="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path>
                        </svg>
                        <div>
                          <p class="text-sm text-gray-700"><span class="font-medium">Código:</span> <span class="font-mono">#${asesoriaId}</span></p>
                        </div>
                      </div>
                      
                      <div class="flex items-center">
                        <svg class="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <div>
                          <p class="text-sm text-gray-700"><span class="font-medium">Tipo de Visa:</span> ${asesoria.tipo_asesoria}</p>
                        </div>
                      </div>
                      
                      <div class="flex items-center">
                        <svg class="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <div class="flex items-center">
                          <p class="text-sm text-gray-700"><span class="font-medium">Precio:</span> $${asesoria.precio || PRECIOS_VISA[asesoria.tipo_asesoria] || "150.00"} USD</p>
                          ${
                            asesoria.estado === "Pagada"
                              ? `
                            <svg class="w-4 h-4 ml-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                          `
                              : ""
                          }
                        </div>
                      </div>
                      
                      <div class="flex items-center">
                        <svg class="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                        </svg>
                        <div>
                          <p class="text-sm text-gray-700"><span class="font-medium">Fecha:</span> ${fecha}</p>
                        </div>
                      </div>
                      
                      <div class="flex items-center">
                        <svg class="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <div>
                          <p class="text-sm text-gray-700"><span class="font-medium">Hora:</span> ${hora}</p>
                        </div>
                      </div>
                      
                      <div class="flex items-center">
                        <svg class="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <div>
                          <p class="text-sm text-gray-700">
                            <span class="font-medium">Estado:</span>
                            ${
                              asesoria.estado === "Pagada"
                                ? '<span class="text-blue-600">En Proceso Activo</span>'
                                : isAsesoriaVigente(asesoria.fecha_asesoria)
                                  ? '<span class="text-green-600">Vigente</span>'
                                  : '<span class="text-red-600">Vencida</span>'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Tarjeta de Información Adicional -->
                  <div class="bg-white p-5 rounded-xl shadow-lg border border-gray-100 transform transition-all duration-300 hover:shadow-xl hover:scale-[1.01]">
                    <div class="flex items-center mb-4">
                      <div class="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mr-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </div>
                      <div>
                        <h4 class="font-medium text-gray-900 text-lg">Información Adicional</h4>
                        <p class="text-sm text-gray-500">Detalles complementarios</p>
                      </div>
                    </div>
                    
                    <div class="space-y-3">
                      <div class="flex items-center">
                        <svg class="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        <div>
                          <p class="text-sm text-gray-700"><span class="font-medium">Lugar:</span> ${asesoria.lugar || "Virtual (Zoom)"}</p>
                        </div>
                      </div>
                      
                      <div class="flex items-center">
                        <svg class="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                        </svg>
                        <div>
                          <p class="text-sm text-gray-700"><span class="font-medium">Método de Pago:</span> ${asesoria.metodo_pago_stripe || asesoria.metodo_pago || "Tarjeta de Crédito"}</p>
                        </div>
                      </div>
                      
                      <div class="flex items-center">
                        <svg class="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <div>
                          <p class="text-sm text-gray-700"><span class="font-medium">Duración:</span> 60 minutos</p>
                        </div>
                      </div>
                      
                      <div class="flex items-center">
                        <svg class="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path>
                        </svg>
                        <div>
                          <p class="text-sm text-gray-700"><span class="font-medium">Documento:</span> ${asesoria.tipo_documento || "C.C"} ${asesoria.numero_documento || ""}</p>
                        </div>
                      </div>
                      
                      ${
                        asesoria.descripcion
                          ? `
                        <div class="mt-3 pt-3 border-t border-gray-100">
                          <p class="text-sm text-gray-700 mb-1"><span class="font-medium">Descripción:</span></p>
                          <div class="bg-gray-50 p-3 rounded-xl text-sm text-gray-700">
                            ${asesoria.descripcion}
                          </div>
                        </div>
                      `
                          : ""
                      }
                    </div>
                  </div>
                </div>
              `
            } else {
              // Si no se pueden cargar los detalles completos, mostrar un mensaje de error
              detailsContent.innerHTML = `
                <div class="p-4 bg-red-50 rounded-xl text-red-600 text-center">
                  <p>No se pudieron cargar los detalles completos. Por favor, intente nuevamente.</p>
                </div>
              `
            }

            // Animar la apertura
            detailsContent.classList.add("animate-fade-in")
          })
          .catch((error) => {
            console.error("Error al cargar detalles:", error)
            // Mostrar un mensaje de error
            detailsContent.innerHTML = `
              <div class="p-4 bg-red-50 rounded-xl text-red-600 text-center">
                <p>Error al cargar los detalles. Por favor, intente nuevamente.</p>
              </div>
            `
            detailsContent.classList.add("animate-fade-in")
          })
      }
    }
  } else {
    // Ocultar detalles
    detailsRow.classList.add("hidden")
  }
}

// Función para ver historial de chat
function verHistorialChat(asesoriaId) {
  const modal = document.getElementById("chatHistorialModal")
  if (!modal) return

  // Actualizar el ID de la asesoría en el modal
  const chatAsesoriaId = document.getElementById("chat-asesoria-id")
  if (chatAsesoriaId) chatAsesoriaId.textContent = asesoriaId

  // Limpiar mensajes anteriores
  const chatMessages = document.getElementById("chat-messages")
  if (chatMessages) {
    chatMessages.innerHTML = `
    <div class="flex justify-center py-4">
      <p class="text-gray-500">No hay mensajes en esta conversación</p>
    </div>
  `
  }

  // Mostrar el modal
  modal.classList.remove("hidden")
  modal.classList.add("flex")

  // En una implementación real, aquí cargaríamos los mensajes del chat desde el servidor
  // fetch(`/obtener_mensajes_chat?codigo_asesoria=${asesoriaId}`)
  //   .then(response => response.json())
  //   .then(data => {
  //     // Mostrar mensajes
  //   });
}

// Función para cerrar el modal de historial de chat
function closeChatHistorialModal() {
  const modal = document.getElementById("chatHistorialModal")
  if (!modal) return

  modal.classList.remove("flex")
  modal.classList.add("hidden")
}

// Función para enviar mensaje en el chat
function enviarMensaje() {
  const chatInput = document.getElementById("chat-input")
  const chatMessages = document.getElementById("chat-messages")
  const chatAsesoriaId = document.getElementById("chat-asesoria-id")

  if (!chatInput || !chatMessages || !chatAsesoriaId) return

  const mensaje = chatInput.value.trim()
  if (!mensaje) return

  // Obtener el ID de la asesoría
  const asesoriaId = chatAsesoriaId.textContent

  // Crear elemento de mensaje
  const messageElement = document.createElement("div")
  messageElement.className = "flex flex-col items-end"
  messageElement.innerHTML = `
  <div class="bg-primary-100 text-primary-800 p-3 rounded-xl max-w-xs">
    <p class="text-sm">${mensaje}</p>
  </div>
  <span class="text-xs text-gray-500 mt-1">Ahora</span>
`

  // Agregar mensaje al chat
  chatMessages.appendChild(messageElement)

  // Limpiar input
  chatInput.value = ""

  // Hacer scroll al final del chat
  chatMessages.scrollTop = chatMessages.scrollHeight

  // En una implementación real, aquí enviaríamos el mensaje al servidor
  // fetch('/enviar_mensaje_chat', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     codigo_asesoria: asesoriaId,
  //     mensaje: mensaje
  //   })
  // });

  // Simular respuesta del asesor después de 1 segundo
  setTimeout(() => {
    const responseElement = document.createElement("div")
    responseElement.className = "flex flex-col items-start animate-fade-in"
    responseElement.innerHTML = `
    <div class="bg-gray-100 text-gray-800 p-3 rounded-xl max-w-xs">
      <p class="text-sm">Gracias por tu mensaje. Un asesor te responderá pronto.</p>
    </div>
    <span class="text-xs text-gray-500 mt-1">Ahora</span>
  `

    chatMessages.appendChild(responseElement)
    chatMessages.scrollTop = chatMessages.scrollHeight
  }, 1000)
}

// Función para actualizar el resumen con un diseño mejorado
function updateSummary() {
  const summaryContainer = document.getElementById("summary-container")
  if (!summaryContainer) return

  // Obtener datos del formulario
  const tipoAsesoria = document.getElementById("tipo_asesoria")
  const tipoDocumento = document.getElementById("tipo_documento")
  const numeroDocumento = document.getElementById("numero_documento")
  const descripcion = document.getElementById("descripcion")
  const lugar = document.getElementById("lugar")

  // Obtener precio según tipo de asesoría
  let precio = 150.0 // Valor por defecto
  if (tipoAsesoria) {
    const selectedOption = tipoAsesoria.options[tipoAsesoria.selectedIndex]
    if (selectedOption) {
      const precioAttr = selectedOption.getAttribute("data-precio")
      if (precioAttr) {
        precio = Number.parseFloat(precioAttr)
      }
    }
  }

  // Formatear fecha y hora
  const fechaHora = new Date(`${selectedDate}T${selectedTime}`)
  const fechaFormateada = fechaHora.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const horaFormateada = fechaHora
    .toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    })
    .slice(0, 5) // Solo tomar HH:MM

  // Actualizar el resumen con un diseño mejorado
  summaryContainer.innerHTML = `
    <div class="bg-white rounded-xl shadow-md overflow-hidden">
      <!-- Encabezado con animación sutil -->
      <div class="mb-4 bg-gradient-to-r from-primary-50 to-white p-3 rounded-xl border-l-4 border-primary-500 animate-fade-in">
        <h3 class="text-base font-medium text-primary-800">Resumen de la Asesoría</h3>
          <p class="text-sm text-gray-600">Revisa los detalles antes de confirmar</p>
      </div>

      <!-- Contenido principal -->
      <div class="p-5">
        <!-- Tarjeta de fecha y hora destacada -->
        <div class="bg-primary-50 rounded-xl p-4 mb-5 flex items-center justify-between border border-primary-100 shadow-sm">
          <div class="flex items-center">
            <div class="bg-primary-100 p-2 rounded-full mr-3">
              <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div>
              <p class="text-sm font-medium text-primary-800">${fechaFormateada}</p>
              <p class="text-xs text-primary-600">${horaFormateada} (60 minutos)</p>
            </div>
          </div>
          <div class="bg-white px-3 py-1 rounded-full text-sm font-medium text-primary-700 border border-primary-200">
            ${lugar ? lugar.options[lugar.selectedIndex].text : "Virtual (Zoom)"}
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <!-- Detalles de la Asesoría -->
          <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div class="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h4 class="font-medium text-gray-700">Detalles de la Asesoría</h4>
            </div>
            <div class="p-4">
              <div class="flex justify-between items-center py-2 border-b border-gray-100">
                <span class="text-gray-600 text-sm">Tipo:</span>
                <span class="text-sm font-medium">${tipoAsesoria ? tipoAsesoria.options[tipoAsesoria.selectedIndex].text.split(" - ")[0] : ""}</span>
              </div>
              
              <div class="flex justify-between items-center py-2 border-b border-gray-100">
                <span class="text-gray-600 text-sm">Precio:</span>
                <span class="text-sm font-medium text-primary-600">$${precio.toFixed(2)} USD</span>
              </div>

              <div class="flex justify-between items-center py-2 border-b border-gray-100">
                <span class="text-gray-600 text-sm">Documento:</span>
                <span class="text-sm">${tipoDocumento ? tipoDocumento.value : ""} ${numeroDocumento ? numeroDocumento.value : ""}</span>
              </div>
              
              
            </div>
          </div>

          <!-- Detalles del Asesor -->
          <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div class="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h4 class="font-medium text-gray-700">Información del Asesor</h4>
            </div>
            <div class="p-4">
              <div class="flex items-center mb-3">
                <div class="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-medium mr-3">
                  ${selectedAsesorName ? selectedAsesorName.substring(0, 2).toUpperCase() : "AS"}
                </div>
                <div>
                  <p class="font-medium text-gray-800">${selectedAsesorName || "Asesor Asignado"}</p>
                  <p class="text-xs text-gray-500">${selectedAsesorEspecialidad || "Especialista en Inmigración"}</p>
                </div>
              </div>
              
              
              <div class="mt-3">
                <div class="flex items-center text-xs text-gray-500">
                  <svg class="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Asesor disponible en el horario seleccionado
                </div>
              </div>
              ${
                descripcion && descripcion.value
                  ? `
              <div class="mt-3 pt-2">
                <span class="text-gray-600 text-sm block mb-1">Descripción:</span>
                <p class="text-sm text-gray-700 bg-gray-50 p-2 rounded">${descripcion.value}</p>
              </div>
              `
                  : ""
              }
            </div>
          </div>
        </div>
        
        <!-- Nota informativa -->
        <div class="mt-5 bg-yellow-50 border border-yellow-100 rounded-xl p-3 flex items-start">
          <svg class="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-sm text-yellow-700">
            Recuerda que tienes 5 minutos para completar el pago una vez agendada la cita, de lo contrario la reserva se cancelará automáticamente.
          </p>
        </div>
      </div>
    </div>
  `
}

// Función para mostrar el indicador de carga durante el agendamiento
function showLoadingIndicator() {
  const submitBtn = document.getElementById("stepper-submit-btn")
  if (!submitBtn) return

  // Cambiar el texto del botón y mostrar el indicador de carga
  submitBtn.innerHTML = `
    <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
    <div class="relative flex items-center justify-center">
      <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
      <span>Agendando...</span>
    </div>
  `
  submitBtn.disabled = true
}

// Función para restaurar el botón después de la carga
function hideLoadingIndicator() {
  const submitBtn = document.getElementById("stepper-submit-btn")
  if (!submitBtn) return

  // Restaurar el texto original del botón
  submitBtn.innerHTML = `
    <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
    <div class="relative flex items-center justify-center">
      <span>Agendar Cita</span>
      <svg xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 ml-2 transform group-hover:translate-x-1 transition-transform duration-200"
          viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd"
              d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
              clip-rule="evenodd" />
      </svg>
    </div>
  `
  submitBtn.disabled = false
}

// Función para actualizar el precio en tiempo real
function updateAppointmentPrice() {
  const tipoAsesoriaSelect = document.getElementById("tipo_asesoria")
  const precioAsesoriaElement = document.getElementById("precio-asesoria")

  if (tipoAsesoriaSelect && precioAsesoriaElement) {
    const precioAsesoria = tipoAsesoriaSelect.options[tipoAsesoriaSelect.selectedIndex].getAttribute("data-precio")
    precioAsesoriaElement.textContent = `$${precioAsesoria} USD`
  } else if (tipoAsesoriaSelect) {
    // Si no existe el elemento de precio pero sí el selector, actualizar los detalles completos
    updateAppointmentDetails()
  }
}

// Función para actualizar los detalles completos de la cita
function updateAppointmentDetails() {
  updateAppointmentPrice()
}

// Función para resetear filtros
function resetFilters() {
  const searchInput = document.getElementById("search-input")
  const statusFilter = document.getElementById("filter-status")
  const dateFilter = document.getElementById("filter-date")

  if (searchInput) searchInput.value = ""
  if (statusFilter) statusFilter.value = ""
  if (dateFilter) dateFilter.value = ""

  // Aplicar filtros (mostrará todas las asesorías)
  filterAsesorias()
}

// Función para pagar una asesoría
function pagarAsesoria(asesoriaId, tipoAsesoria) {
  const modal = document.getElementById("pagoModal")
  if (!modal) return

  // Actualizar el ID de la asesoría en el modal
  const pagoAsesoriaId = document.getElementById("pago-asesoria-id")
  if (pagoAsesoriaId) pagoAsesoriaId.textContent = asesoriaId

  // Actualizar campos ocultos
  const pagoCodigoAsesoria = document.getElementById("pago_codigo_asesoria")
  const pagoTipoAsesoria = document.getElementById("pago_tipo_asesoria")

  if (pagoCodigoAsesoria) pagoCodigoAsesoria.value = asesoriaId
  if (pagoTipoAsesoria) pagoTipoAsesoria.value = tipoAsesoria

  // Actualizar monto según el tipo de asesoría
  const montoInput = document.getElementById("monto")
  if (montoInput) {
    switch (tipoAsesoria) {
      case "Visa de Trabajo":
        montoInput.value = "150.00"
        break
      case "Visa de Estudio":
        montoInput.value = "100.00"
        break
      case "Residencia Permanente":
        montoInput.value = "200.00"
        break
      case "Ciudadanía":
        montoInput.value = "250.00"
        break
      default:
        montoInput.value = "150.00"
    }
  }

  // Mostrar el modal
  modal.classList.remove("hidden")
  modal.classList.add("flex")

  // Inicializar Stripe
  reiniciarPasarelaPago()
}

// Función para cerrar el modal de pago
function closePagoModal() {
  const modal = document.getElementById("pagoModal")
  if (!modal) return

  modal.classList.remove("flex")
  modal.classList.add("hidden")
}

// Función para cancelar una asesoría
function cancelarAsesoria(asesoriaId) {
  const modal = document.getElementById("cancelarAsesoriaModal")
  if (!modal) return

  // Mostrar el modal
  modal.classList.remove("hidden")
  modal.classList.add("flex")

  // Configurar la acción del botón de confirmación
  const confirmBtn = document.getElementById("confirmarCancelarBtn")
  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      try {
        // Enviar solicitud para eliminar la asesoría
        const response = await fetch("/asesorias/cancelar_asesoria", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            codigo_asesoria: asesoriaId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Error al cancelar la asesoría")
        }

        // Mostrar notificación de éxito
        showNotification("Asesoría cancelada exitosamente", "success")

        // Cerrar el modal
        closeCancelarAsesoriaModal()

        // Eliminar la asesoría del DOM
        const row = document.querySelector(`tr[data-asesoria-id="${asesoriaId}"]`)
        if (row) {
          row.remove()
        }

        // También eliminar la fila de detalles si existe
        const detailsRow = document.getElementById(`details-${asesoriaId}`)
        if (detailsRow) {
          detailsRow.remove()
        }

        // Verificar si no hay más asesorías y mostrar el mensaje de no resultados
        const visibleRows = document.querySelectorAll("#asesorias-table-body tr[data-asesoria-id]:not(.hidden)")
        if (visibleRows.length === 0) {
          const noResults = document.getElementById("no-results")
          if (noResults) {
            noResults.classList.remove("hidden")
          }
        }

        // Renumerar las asesorías restantes
        ordenarYNumerarAsesorias()
      } catch (error) {
        console.error("Error al cancelar la asesoría:", error)
        showNotification("Error al cancelar la asesoría: " + error.message, "error")
      }
    }
  }
}

// Función para cerrar el modal de cancelar asesoría
function closeCancelarAsesoriaModal() {
  const modal = document.getElementById("cancelarAsesoriaModal")
  if (!modal) return

  modal.classList.remove("flex")
  modal.classList.add("hidden")
}

// Función para reiniciar la pasarela de pago con Stripe
function reiniciarPasarelaPago() {
  // Obtener la clave pública de Stripe del meta tag
  const stripePublicKey = document.querySelector('meta[name="stripe-public-key"]')?.content

  if (!stripePublicKey) {
    console.error("No se encontró la clave pública de Stripe")
    return
  }

  // Inicializar Stripe con la clave pública
  stripe = Stripe(stripePublicKey)

  const asesoriaId = document.getElementById("pago_codigo_asesoria")?.value
  const monto = document.getElementById("monto")?.value

  if (!asesoriaId || !monto) {
    console.error("Faltan datos para inicializar la pasarela de pago")
    return
  }

  // Crear un PaymentIntent en el servidor
  fetch("/pagos/crear_payment_intent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      codigo_asesoria: asesoriaId,
      monto: monto,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.error || "Error al crear el PaymentIntent")
        })
      }
      return response.json()
    })
    .then((data) => {
      clientSecret = data.clientSecret

      // Configurar Stripe Elements
      const options = {
        clientSecret: clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#4f46e5",
            colorBackground: "#ffffff",
            colorText: "#1f2937",
            colorDanger: "#ef4444",
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            spacingUnit: "4px",
            borderRadius: "8px",
          },
        },
      }

      // Crear elementos de Stripe
      elements = stripe.elements(options)

      // Crear y montar el elemento de pago
      paymentElement = elements.create("payment")
      paymentElement.mount("#payment-element")

      // Configurar el formulario de pago
      const form = document.getElementById("payment-form")
      const submitButton = document.getElementById("submit-button")
      const buttonText = document.getElementById("button-text")
      const spinner = document.getElementById("spinner")
      const paymentMessage = document.getElementById("payment-message")

      if (form) {
        form.addEventListener("submit", async (e) => {
          e.preventDefault()

          if (!stripe || !elements) {
            return
          }

          // Deshabilitar el botón y mostrar spinner
          if (submitButton) submitButton.disabled = true
          if (buttonText) buttonText.classList.add("hidden")
          if (spinner) spinner.classList.remove("hidden")

          // Confirmar el pago
          const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
              return_url: `${window.location.origin}/pagos/confirmar_pago`,
            },
          })

          if (error) {
            // Mostrar mensaje de error
            if (paymentMessage) {
              paymentMessage.classList.remove("hidden")
              paymentMessage.classList.add("bg-red-100", "text-red-700")
              paymentMessage.textContent = error.message
            }

            // Restaurar botón
            if (submitButton) submitButton.disabled = false
            if (buttonText) buttonText.classList.remove("hidden")
            if (spinner) spinner.classList.add("hidden")
          }
          // Si no hay error, el usuario será redirigido a la URL de retorno
        })
      }
    })
    .catch((error) => {
      console.error("Error:", error)
      const paymentElement = document.getElementById("payment-element")
      if (paymentElement) {
        paymentElement.innerHTML = `
      <div class="p-4 bg-red-100 text-red-700 rounded-xl">
        <p>Error al inicializar el pago: ${error.message}</p>
      </div>
    `
      }
    })
}

// Funciones para el modal de solicitud de asesoría con stepper
function openNewAdvisoryModal() {
  const modal = document.getElementById("newAdvisoryModal")
  if (!modal) return

  // Reiniciar el stepper
  resetStepper()

  // Mostrar el modal
  modal.classList.remove("hidden")
  modal.classList.add("flex")

  // Cargar asesores para el primer paso
  loadAsesores()
}

function closeNewAdvisoryModal() {
  const modal = document.getElementById("newAdvisoryModal")
  if (!modal) return

  // Cancelar cualquier reserva temporal si existe
  if (reservationId) {
    cancelarReservaTemporal(reservationId)
    reservationId = null
  }

  // Ocultar el modal
  modal.classList.remove("flex")
  modal.classList.add("hidden")

  // Reiniciar variables
  selectedAsesorId = null
  selectedAsesorName = null
  selectedAsesorEspecialidad = null
  selectedDate = null
  selectedTime = null
  reservationId = null
}

function initStepper() {
  const prevBtn = document.getElementById("stepper-prev-btn")
  const nextBtn = document.getElementById("stepper-next-btn")
  const submitBtn = document.getElementById("stepper-submit-btn")

  // Añadir animaciones a los botones
  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      this.classList.add()
      setTimeout(() => this.classList.remove(), 150)
      prevStep()
    })
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      this.classList.add()
      setTimeout(() => this.classList.remove(), 150)
      nextStep()
    })
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", function () {
      this.classList.add()
      setTimeout(() => this.classList.remove(), 150)
      submitAsesoria()
    })
  }

  // Añadir animación a los pasos del stepper
  const steps = document.querySelectorAll(".stepper-step")
  steps.forEach((step, index) => {
    step.addEventListener("mouseenter", function () {
      const circle = this.querySelector("div:first-child")
      if (circle) {
        circle.classList.add()
        setTimeout(() => circle.classList.remove(), 300)
      }
    })
  })
}

// Modificar la función resetStepper para mostrar números en lugar de checks en los pasos activos
function resetStepper() {
  // Reiniciar el paso activo
  const steps = document.querySelectorAll(".stepper-step")
  const contents = document.querySelectorAll(".stepper-content")
  const connectors = document.querySelectorAll(".stepper-connector")
  const prevBtn = document.getElementById("stepper-prev-btn")
  const nextBtn = document.getElementById("stepper-next-btn")
  const submitBtn = document.getElementById("stepper-submit-btn")

  // Ocultar todos los contenidos excepto el primero
  contents.forEach((content, index) => {
    if (index === 0) {
      content.classList.remove("hidden")
    } else {
      content.classList.add("hidden")
    }
  })

  // Reiniciar los pasos
  steps.forEach((step, index) => {
    const circle = step.querySelector("div:first-child")
    if (index === 0) {
      step.classList.add("active")
      step.classList.remove("completed")
      if (circle) {
        circle.classList.remove("bg-gray-200", "text-gray-500")
        circle.classList.add("bg-primary-600", "text-white")
        // Mostrar el número del paso en lugar del check
        circle.innerHTML = `<span>1</span>`
      }
    } else {
      step.classList.remove("active", "completed")
      if (circle) {
        circle.classList.remove("bg-primary-600", "text-white")
        circle.classList.add("bg-gray-200", "text-gray-500")
        // Mostrar el número del paso
        circle.innerHTML = `<span>${index + 1}</span>`
      }
    }
  })

  // Reiniciar los conectores
  connectors.forEach((connector) => {
    connector.classList.remove("bg-primary-600")
    connector.classList.add("bg-gray-200")
  })

  // Reiniciar botones
  if (prevBtn) prevBtn.classList.add("hidden")
  if (nextBtn) nextBtn.classList.remove("hidden")
  if (submitBtn) submitBtn.classList.add("hidden")

  // Reiniciar formulario
  const form = document.getElementById("asesoria-form")
  if (form) form.reset()

  // Reiniciar variables
  selectedAsesorId = null
  selectedAsesorName = null
  selectedAsesorEspecialidad = null
  selectedDate = null
  selectedTime = null
  reservationId = null
}

// Modificar la función prevStep para mostrar números en lugar de checks en los pasos activos
function prevStep() {
  const steps = document.querySelectorAll(".stepper-step")
  const contents = document.querySelectorAll(".stepper-content")
  const connectors = document.querySelectorAll(".stepper-connector")
  const prevBtn = document.getElementById("stepper-prev-btn")
  const nextBtn = document.getElementById("stepper-next-btn")
  const submitBtn = document.getElementById("stepper-submit-btn")

  // Encontrar el índice del paso activo actual
  let activeIndex = -1
  steps.forEach((step, index) => {
    if (step.classList.contains("active")) {
      activeIndex = index
    }
  })

  if (activeIndex <= 0) return // Ya estamos en el primer paso

  // Cancelar cualquier reserva temporal si estamos volviendo del paso 2
  if (activeIndex === 2 && reservationId) {
    cancelarReservaTemporal(reservationId)
    reservationId = null
  }

  // Animar la salida del contenido actual
  contents[activeIndex].classList.add("transform", "transition-all", "duration-500", "translate-x-full", "opacity-0")

  // Después de un breve retraso, ocultar el contenido actual y mostrar el anterior
  setTimeout(() => {
    contents[activeIndex].classList.add("hidden")
    contents[activeIndex].classList.remove(
      "transform",
      "transition-all",
      "duration-500",
      "translate-x-full",
      "opacity-0",
    )

    // Preparar el contenido anterior para la animación de entrada
    contents[activeIndex - 1].classList.remove("hidden")
    contents[activeIndex - 1].classList.add(
      "transform",
      "transition-all",
      "duration-500",
      "translate-x-full",
      "opacity-0",
    )

    // Forzar un reflow para que la animación funcione
    contents[activeIndex - 1].offsetHeight

    // Animar la entrada del contenido anterior
    contents[activeIndex - 1].classList.remove("translate-x-full", "opacity-0")
    contents[activeIndex - 1].classList.add("translate-x-0", "opacity-100")
  }, 300)

  // SECUENCIA DE ANIMACIÓN MEJORADA:

  // 1. Primero: Cambiar el color del círculo actual
  const currentCircle = steps[activeIndex].querySelector("div:first-child")
  if (currentCircle) {
    currentCircle.classList.add("transition-all", "duration-500")
    currentCircle.classList.remove("bg-primary-600", "text-white")
    currentCircle.classList.add("bg-gray-200", "text-gray-500")
    currentCircle.innerHTML = `<span>${activeIndex + 1}</span>`
  }

  // Actualizar el paso activo DESPUÉS de cambiar los círculos
  steps[activeIndex].classList.remove("active", "completed")
  steps[activeIndex - 1].classList.add("active")
  steps[activeIndex - 1].classList.remove("completed")

  // 2. Segundo: Después de un delay, cambiar el color de la barra conectora
  setTimeout(() => {
    if (activeIndex > 0 && activeIndex - 1 < connectors.length) {
      // Añadir transición a la barra conectora
      connectors[activeIndex - 1].classList.add("transition-all", "duration-700")
      // Cambiar el color de la barra conectora
      connectors[activeIndex - 1].classList.remove("bg-primary-600")
      connectors[activeIndex - 1].classList.add("bg-gray-200")
    }
  }, 300) // Delay para la barra conectora

  // 3. Tercero: Después de otro delay, quitar el check y mostrar el número
  setTimeout(() => {
    const prevCircle = steps[activeIndex - 1].querySelector("div:first-child")
    if (prevCircle) {
      prevCircle.classList.add("transition-all", "duration-500")
      prevCircle.classList.remove("bg-gray-200", "text-gray-500")
      prevCircle.classList.add("bg-primary-600", "text-white")

      // Crear un efecto de animación para el número que reaparece
      prevCircle.innerHTML = `<span class="inline-block animate-fade-in">${activeIndex}</span>`
    }
  }, 600) // Delay adicional para quitar el check y mostrar el número

  // Actualizar botones
  if (activeIndex - 1 === 0) {
    prevBtn.classList.add("hidden")
  }

  nextBtn.classList.remove("hidden")
  submitBtn.classList.add("hidden")
}

// Modificar la función nextStep para mostrar checks solo en pasos completados
function nextStep() {
  const steps = document.querySelectorAll(".stepper-step")
  const contents = document.querySelectorAll(".stepper-content")
  const connectors = document.querySelectorAll(".stepper-connector")
  const prevBtn = document.getElementById("stepper-prev-btn")
  const nextBtn = document.getElementById("stepper-next-btn")
  const submitBtn = document.getElementById("stepper-submit-btn")

  // Find the active step index
  let activeIndex = -1
  steps.forEach((step, index) => {
    if (step.classList.contains("active")) {
      activeIndex = index
    }
  })

  if (activeIndex >= steps.length - 1) return // Already at the last step

  // Validate the current step before proceeding
  if (!validateStep(activeIndex)) {
    return
  }

  // If we're in the first step and going to the second step, load the calendar
  if (activeIndex === 0) {
    loadCalendar()

    // Disable the next button until a date and time are selected
    nextBtn.classList.add("opacity-50", "cursor-not-allowed")
    nextBtn.disabled = true
  }

  // If we're in the second step and going to the third step, update the summary
  if (activeIndex === 1) {
    updateSummary()
  }

  // Animate the exit of the current content with a more evident transition
  contents[activeIndex].classList.add("transform", "transition-all", "duration-500", "translate-x-[-100%]", "opacity-0")

  // After a brief delay, hide the current content and show the next one
  setTimeout(() => {
    contents[activeIndex].classList.add("hidden")
    contents[activeIndex].classList.remove(
      "transform",
      "transition-all",
      "duration-500",
      "translate-x-[-100%]",
      "opacity-0",
    )

    // Prepare the next content for the entrance animation
    contents[activeIndex + 1].classList.remove("hidden")
    contents[activeIndex + 1].classList.add(
      "transform",
      "transition-all",
      "duration-500",
      "translate-x-[-100%]",
      "opacity-0",
    )

    // Force a reflow to make the animation work
    contents[activeIndex + 1].offsetHeight

    // Animate the entrance of the next content
    contents[activeIndex + 1].classList.remove("translate-x-[-100%]", "opacity-0")
    contents[activeIndex + 1].classList.add("translate-x-0", "opacity-100")
  }, 300)

  // First, animate the connector with a delay before updating the circles
  if (activeIndex < connectors.length) {
    // First animate the connector
    connectors[activeIndex].classList.remove("bg-gray-200")
    connectors[activeIndex].classList.add("bg-primary-600", "transition-all", "duration-700")

    // After the connector animation, update the step circles
    setTimeout(() => {
      // Update the active step
      steps[activeIndex].classList.remove("active")
      steps[activeIndex].classList.add("completed")
      steps[activeIndex + 1].classList.add("active")

      // Update the circles of the steps
      const currentCircle = steps[activeIndex].querySelector("div:first-child")
      const nextCircle = steps[activeIndex + 1].querySelector("div:first-child")

      if (currentCircle) {
        currentCircle.classList.remove("bg-gray-200", "text-gray-500")
        currentCircle.classList.add("bg-primary-600", "text-white", "transition-all", "duration-500")
        // Show the check icon in the completed step with animation
        currentCircle.innerHTML =
          '<svg class="w-6 h-6 animate-check-mark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
      }

      if (nextCircle) {
        nextCircle.classList.remove("bg-gray-200", "text-gray-500")
        nextCircle.classList.add("bg-primary-600", "text-white", "transition-all", "duration-500")
        // Show the number in the active step, not the check
        nextCircle.innerHTML = `<span>${activeIndex + 2}</span>`
      }
    }, 300) // Delay the circle animation to happen after the connector
  }

  // Update buttons
  prevBtn.classList.remove("hidden")

  if (activeIndex + 1 === steps.length - 1) {
    nextBtn.classList.add("hidden")
    submitBtn.classList.remove("hidden")
  }
}

function validateStep(stepIndex) {
  switch (stepIndex) {
    case 0: // Validar formulario de datos personales
      const form = document.getElementById("asesoria-form")
      const tipoAsesoria = document.getElementById("tipo_asesoria")
      const asesorSelect = document.getElementById("asesor_id")
      const tipoDocumento = document.getElementById("tipo_documento")
      const numeroDocumento = document.getElementById("numero_documento")
      const descripcion = document.getElementById("descripcion")

      if (!tipoAsesoria || !asesorSelect || !tipoDocumento || !numeroDocumento) {
        showNotification("Por favor, complete todos los campos obligatorios", "error")
        return false
      }

      if (tipoAsesoria.value === "") {
        showNotification("Por favor, seleccione un tipo de asesoría", "error")
        return false
      }

      if (asesorSelect.value === "") {
        showNotification("Por favor, seleccione un asesor", "error")
        return false
      }

      if (numeroDocumento.value.trim() === "") {
        showNotification("Por favor, ingrese su número de documento", "error")
        return false
      }

      // Guardar los datos seleccionados
      selectedAsesorId = asesorSelect.value
      const asesorText = asesorSelect.options[asesorSelect.selectedIndex].text
      // Extraer solo el nombre del asesor (sin la especialidad)
      selectedAsesorName = asesorText.split(" - ")[0]
      selectedAsesorEspecialidad = asesorSelect.options[asesorSelect.selectedIndex].getAttribute("data-especialidad")

      return true

    case 1: // Validar selección de fecha y hora
      if (!selectedDate || !selectedTime) {
        showNotification("Por favor, seleccione una fecha y hora para la asesoría", "error")
        return false
      }

      return true

    default:
      return true
  }
}

function loadAsesores() {
  const asesorSelect = document.getElementById("asesor_id")
  if (!asesorSelect) return

  // Limpiar opciones actuales
  asesorSelect.innerHTML = '<option value="">Seleccione un asesor</option>'

  // Cargar asesores desde el servidor
  fetch("/asesorias/obtener_asesores")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Error al cargar asesores")
      }
      return response.json()
    })
    .then((data) => {
      if (data.asesores && data.asesores.length > 0) {
        data.asesores.forEach((asesor) => {
          const option = document.createElement("option")
          option.value = asesor.id_asesor
          option.text = `${asesor.nombre} ${asesor.apellidos} - ${asesor.especialidad}`
          option.setAttribute("data-especialidad", asesor.especialidad)
          asesorSelect.appendChild(option)
        })
      }
    })
    .catch((error) => {
      console.error("Error al cargar asesores:", error)
      showNotification("Error al cargar la lista de asesores", "error")
    })
}

// Modificar la función loadCalendar para añadir más colores y destacar el día actual
function loadCalendar() {
  const calendarContainer = document.getElementById("calendar-container")
  const timeContainer = document.getElementById("time-container")

  if (!calendarContainer || !timeContainer) return

  // Limpiar contenedores
  calendarContainer.innerHTML = ""
  timeContainer.innerHTML =
    '<p class="text-gray-500 text-center">Seleccione una fecha para ver los horarios disponibles</p>'

  // Crear el calendario con un contenedor redondeado
  calendarContainer.className =
    "bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300"

  // Crear el calendario
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  const currentDay = currentDate.getDate()

  // Crear el encabezado del calendario con un diseño más atractivo y redondeado
  const calendarHeader = document.createElement("div")
  calendarHeader.className = "flex justify-between items-center mb-4 bg-primary-50 p-3 rounded-xl shadow-sm"
  calendarHeader.innerHTML = `
    <button id="prev-month" class="p-2 rounded-full hover:bg-primary-100 transition-colors text-primary-600 hover:shadow-sm">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
      </svg>
    </button>
    <h3 id="calendar-month" class="text-base font-medium text-primary-800"></h3>
    <button id="next-month" class="p-2 rounded-full hover:bg-primary-100 transition-colors text-primary-600 hover:shadow-sm">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
      </svg>
    </button>
  `
  calendarContainer.appendChild(calendarHeader)

  // Crear la estructura del calendario
  const calendarGrid = document.createElement("div")
  calendarGrid.className = "grid grid-cols-7 gap-2"

  // Agregar los días de la semana (lunes a domingo) con un estilo más destacado
  const daysOfWeek = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
  daysOfWeek.forEach((day, index) => {
    const dayElement = document.createElement("div")
    // Destacar los días laborables (lunes a viernes)
    if (index < 5) {
      dayElement.className = "text-center font-medium text-primary-700 py-2 border-b border-primary-200 mx-1"
    } else {
      // Fin de semana con un estilo diferente
      dayElement.className = "text-center font-medium text-gray-400 py-2 border-b border-gray-200 mx-1"
    }
    dayElement.textContent = day
    calendarGrid.appendChild(dayElement)
  })

  // Agregar los días del mes (se llenarán dinámicamente)
  for (let i = 0; i < 42; i++) {
    const dayElement = document.createElement("div")
    dayElement.className = "calendar-day text-center py-2 rounded-full"
    dayElement.setAttribute("data-day", "")
    calendarGrid.appendChild(dayElement)
  }

  calendarContainer.appendChild(calendarGrid)

  // Configurar los botones de navegación
  const prevMonthBtn = document.getElementById("prev-month")
  const nextMonthBtn = document.getElementById("next-month")
  const calendarMonthElement = document.getElementById("calendar-month")

  let displayMonth = currentMonth
  let displayYear = currentYear

  // Función para actualizar el calendario
  function updateCalendar() {
    // Actualizar el título del mes
    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ]
    calendarMonthElement.textContent = `${monthNames[displayMonth]} ${displayYear}`

    // Obtener el primer día del mes
    const firstDayOfMonth = new Date(displayYear, displayMonth, 1)

    // Ajustar para que la semana comience en lunes (0 = lunes, 6 = domingo)

    // getDay() devuelve 0 para domingo, 1 para lunes, etc.
    let firstDayIndex = firstDayOfMonth.getDay() - 1
    if (firstDayIndex < 0) firstDayIndex = 6 // Si es domingo (0-1=-1), ajustar a 6

    // Número de días en el mes actual
    const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate()

    // Obtener todos los elementos de día
    const dayElements = document.querySelectorAll(".calendar-day")

    // Limpiar todos los días
    dayElements.forEach((day) => {
      day.textContent = ""
      day.className = "calendar-day text-center py-2 rounded-full"
      day.removeAttribute("data-date")
      day.onclick = null // Eliminar eventos de clic anteriores
    })

    // Llenar los días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
      const dayIndex = firstDayIndex + i - 1
      if (dayIndex >= dayElements.length) break // Protección contra errores

      const dayElement = dayElements[dayIndex]
      const date = new Date(displayYear, displayMonth, i)
      const dateStr = `${displayYear}-${String(displayMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`

      // Establecer el texto y atributo de fecha
      dayElement.textContent = i
      dayElement.setAttribute("data-date", dateStr)

      // Verificar si es el día actual
      const isToday = displayYear === currentYear && displayMonth === currentMonth && i === currentDay

      // Verificar si es un día pasado
      const isPastDay = date < new Date().setHours(0, 0, 0, 0)

      // Verificar si es fin de semana (0 = domingo, 6 = sábado)
      const dayOfWeek = date.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

      // Aplicar estilos según el tipo de día
      if (isToday) {
        // Destacar el día actual con un estilo distintivo
        dayElement.className =
          "calendar-day text-center py-2 rounded-full bg-primary-600 text-white font-bold transform scale-105 shadow-md text-base relative z-10 hover:bg-primary-700 transition-all duration-300"

        // Si el día actual es seleccionable (no es fin de semana y no es pasado)
        if (!isWeekend) {
          dayElement.className += " cursor-pointer"

          // Agregar evento de clic
          dayElement.onclick = function () {
            // Deseleccionar día anterior
            document.querySelectorAll(".calendar-day.selected").forEach((el) => {
              if (el !== this) {
                el.classList.remove("selected", "ring-2", "ring-primary-500", "ring-offset-1")
              }
            })

            // Seleccionar este día (mantener el estilo de día actual)
            this.classList.add("selected", "ring-2", "ring-primary-500", "ring-offset-1")

            // Guardar la fecha seleccionada
            selectedDate = dateStr

            // Cargar horarios disponibles
            loadAvailableTimes(selectedDate)
          }
        }
      } else if (isPastDay) {
        dayElement.className =
          "calendar-day text-center py-2 rounded-full text-gray-400 cursor-default text-base bg-gray-50"
      } else if (isWeekend) {
        dayElement.className =
          "calendar-day text-center py-2 rounded-full text-gray-400 cursor-default text-base bg-gray-50"
        dayElement.title = "No disponible en fin de semana"
      } else {
        // Día seleccionable (lunes a viernes)
        dayElement.className =
          "calendar-day text-center py-2 rounded-full cursor-pointer hover:bg-primary-50 transition-all duration-300 text-base hover:shadow-sm"

        // Agregar evento de clic
        dayElement.onclick = function () {
          // Deseleccionar día anterior
          document.querySelectorAll(".calendar-day.selected").forEach((el) => {
            el.classList.remove(
              "selected",
              "bg-primary-100",
              "text-primary-800",
              "ring-2",
              "ring-primary-500",
              "ring-offset-1",
            )
          })

          // Seleccionar este día
          this.classList.add(
            "selected",
            "bg-primary-100",
            "text-primary-800",
            "ring-2",
            "ring-primary-500",
            "ring-offset-1",
          )

          // Guardar la fecha seleccionada
          selectedDate = dateStr

          // Cargar horarios disponibles
          loadAvailableTimes(selectedDate)
        }
      }
    }
  }

  // Configurar eventos de navegación con efectos visuales
  prevMonthBtn.addEventListener("click", () => {
    // Añadir efecto visual al botón
    prevMonthBtn.classList.add("scale-90")
    setTimeout(() => prevMonthBtn.classList.remove("scale-90"), 150)

    displayMonth--
    if (displayMonth < 0) {
      displayMonth = 11
      displayYear--
    }
    updateCalendar()
  })

  nextMonthBtn.addEventListener("click", () => {
    // Añadir efecto visual al botón
    nextMonthBtn.classList.add("scale-90")
    setTimeout(() => nextMonthBtn.classList.remove("scale-90"), 150)

    displayMonth++
    if (displayMonth > 11) {
      displayMonth = 0
      displayYear++
    }
    updateCalendar()
  })

  // Inicializar el calendario
  updateCalendar()
}

// Modificar la función loadAvailableTimes para mejorar el diseño de los horarios
function loadAvailableTimes(date) {
  const timeContainer = document.getElementById("time-container")
  if (!timeContainer || !selectedAsesorId) return

  // Mostrar mensaje de carga con animación mejorada
  timeContainer.innerHTML = `
    <div class="flex flex-col justify-center items-center h-24 space-y-3">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-t-2 border-primary-600"></div>
      <p class="text-primary-600 text-sm animate-pulse">Cargando horarios disponibles...</p>
    </div>
  `

  // Formatear la fecha para mostrarla
  const dateObj = new Date(date)
  const formattedDate = dateObj.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Cargar horarios disponibles desde el servidor
  fetch(`/asesorias/obtener_horarios_disponibles?id_asesor=${selectedAsesorId}&fecha=${date}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Error al cargar horarios")
      }
      return response.json()
    })
    .then((data) => {
      // Limpiar contenedor
      timeContainer.innerHTML = ""

      // Añadir un título con la fecha
      timeContainer.innerHTML = `
        <div class="bg-primary-50 p-3 rounded-xl mb-4 text-center">
          <p class="text-primary-700 font-medium">${formattedDate}</p>
        </div>
      `

      if (data.horarios && data.horarios.length > 0) {
        // Crear lista de horarios en columna
        const timeList = document.createElement("div")
        timeList.className = "flex flex-col space-y-2 mt-2"

        // Agregar cada horario disponible con un diseño mejorado
        data.horarios.forEach((hora, index) => {
          const timeButton = document.createElement("button")
          // Alternar colores de fondo para mejor visualización
          const isEven = index % 2 === 0
          timeButton.className = isEven
            ? "time-slot py-3 px-4 rounded-xl border border-gray-200 hover:bg-primary-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base w-full text-left flex items-center"
            : "time-slot py-3 px-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-primary-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base w-full text-left flex items-center"

          timeButton.setAttribute("data-time", hora)

          // Añadir icono de reloj junto a la hora
          timeButton.innerHTML = `
            <svg class="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>${hora}</span>
          `

          // Agregar evento de clic con efectos visuales mejorados
          timeButton.addEventListener("click", () => {
            // Deseleccionar horario anterior
            document.querySelectorAll(".time-slot.selected").forEach((el) => {
              el.classList.remove(
                "selected",
                "bg-primary-100",
                "text-primary-800",
                "border-primary-500",
                "shadow-md",
                "scale-105",
              )
            })

            // Seleccionar este horario con animación
            timeButton.classList.add(
              "selected",
              "bg-primary-100",
              "text-primary-800",
              "border-primary-500",
              "shadow-md",
              "scale-105",
            )

            // Guardar el horario seleccionado
            selectedTime = hora

            // Crear reserva temporal
            createTemporaryReservation(selectedDate, selectedTime)
          })

          timeList.appendChild(timeButton)
        })

        timeContainer.appendChild(timeList)
      } else {
        timeContainer.innerHTML += `
          <div class="flex flex-col items-center justify-center h-24 text-center bg-gray-50 rounded-xl p-4">
            <svg class="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p class="text-gray-500 text-base">No hay horarios disponibles para esta fecha</p>
            <p class="text-primary-600 text-sm mt-2">Por favor, seleccione otra fecha</p>
          </div>
        `
      }
    })
    .catch((error) => {
      console.error("Error al cargar horarios:", error)
      timeContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center h-24 text-center bg-red-50 rounded-xl p-4">
          <svg class="w-10 h-10 text-red-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-red-500 text-base">Error al cargar horarios disponibles</p>
          <p class="text-gray-600 text-sm mt-2">Intente nuevamente más tarde</p>
        </div>
      `
    })
}

// Modificar la función createTemporaryReservation para habilitar el botón siguiente cuando se selecciona una hora
function createTemporaryReservation(date, time) {
  if (!selectedAsesorId || !date || !time) return

  // Cancelar cualquier reserva temporal anterior
  if (reservationId) {
    cancelarReservaTemporal(reservationId)
    reservationId = null
  }

  // Crear una nueva reserva temporal
  fetch("/asesorias/reservar_horario_temporal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id_asesor: selectedAsesorId,
      fecha: date,
      hora: time,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.error || "Error al reservar horario")
        })
      }
      return response.json()
    })
    .then((data) => {
      if (data.success) {
        reservationId = data.reserva_id

        // Habilitar el botón siguiente ahora que tenemos fecha y hora seleccionadas
        const nextBtn = document.getElementById("stepper-next-btn")
        if (nextBtn) {
          nextBtn.classList.remove("opacity-50", "cursor-not-allowed")
          nextBtn.disabled = false
        }

        // Mostrar el indicador de reserva temporal
        const reservationIndicator = document.getElementById("reservation-indicator")
        if (reservationIndicator) {
          reservationIndicator.classList.remove("hidden")
        }
      }
    })
    .catch((error) => {
      console.error("Error al reservar horario:", error)
      showNotification(error.message, "error")
    })
}

function cancelarReservaTemporal(reservaId) {
  if (!reservaId) return

  fetch("/asesorias/cancelar_reserva_temporal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reserva_id: reservaId,
    }),
  }).catch((error) => {
    console.error("Error al cancelar reserva temporal:", error)
  })
}

// Modificar la función submitAsesoria para mostrar el indicador de carga
function submitAsesoria() {
  // Mostrar indicador de carga
  showLoadingIndicator()

  // Obtener datos del formulario
  const form = document.getElementById("asesoria-form")
  if (!form) {
    hideLoadingIndicator()
    return
  }

  const tipoAsesoriaValue = document.getElementById("tipo_asesoria").value
  const tipoDocumento = document.getElementById("tipo_documento").value
  const numeroDocumento = document.getElementById("numero_documento").value
  const descripcion = document.getElementById("descripcion").value
  const lugar = document.getElementById("lugar").value

  // Verificar que tenemos todos los datos necesarios
  if (!selectedAsesorId || !selectedDate || !selectedTime) {
    showNotification("Faltan datos para agendar la asesoría", "error")
    hideLoadingIndicator()
    return
  }

  // Formatear fecha y hora para el servidor
  const fechaAsesoria = `${selectedDate}T${selectedTime}`

  // Crear objeto con los datos de la asesoría
  // Obtener el id_solicitante del usuario actual mediante una petición al servidor
  fetch("/user/obtener_id_solicitante")
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        showNotification(data.error, "error")
        hideLoadingIndicator()
        return
      }

      const asesoriaData = {
        id_solicitante: data.id_solicitante, // Usar el ID obtenido del servidor
        tipo_asesoria: tipoAsesoriaValue,
        descripcion: descripcion,
        lugar: lugar,
        tipo_documento: tipoDocumento,
        numero_documento: numeroDocumento,
        id_asesor: selectedAsesorId,
        asesor_asignado: selectedAsesorName,
        asesor_especialidad: selectedAsesorEspecialidad,
        fecha_asesoria: fechaAsesoria,
      }

      // Enviar solicitud al servidor
      fetch("/asesorias/nueva_asesoria", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(asesoriaData),
      })
        .then((response) => {
          if (!response.ok) {
            return response.json().then((data) => {
              throw new Error(data.error || "Error al agendar la asesoría")
            })
          }
          return response.json()
        })
        .then((data) => {
          if (data.success) {
            // Ocultar indicador de carga
            hideLoadingIndicator()

            // Mostrar notificación de éxito con información del tiempo límite
            showNotification(
              data.message || "Asesoría agendada con éxito. Tienes 5 minutos para realizar el pago.",
              "success",
            )

            // Cerrar el modal
            closeNewAdvisoryModal()

            // Redirigir a la página de pago
            pagarAsesoria(data.codigo_asesoria, tipoAsesoriaValue)
          }
        })
        .catch((error) => {
          console.error("Error al agendar asesoría:", error)
          showNotification(error.message, "error")
          hideLoadingIndicator()
        })
    })
    .catch((error) => {
      console.error("Error al obtener ID de solicitante:", error)
      showNotification("Error al obtener información del usuario", "error")
      hideLoadingIndicator()
    })
}

// Función para iniciar un temporizador para una nueva asesoría
function startNewAppointmentTimer(asesoriaId, tiempoLimite) {
  // Crear elemento para el temporizador si no existe
  let timerElement = document.querySelector(`.countdown-timer[data-asesoria-id="${asesoriaId}"]`)

  if (!timerElement) {
    // Si estamos en la página de pago y no en la lista de asesorías
    const paymentMessage = document.getElementById("payment-message")
    if (paymentMessage) {
      paymentMessage.classList.remove("hidden")
      paymentMessage.classList.add("bg-yellow-100", "text-yellow-700")
      paymentMessage.innerHTML = `
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>Tiempo restante para completar el pago: <span id="payment-timer">5:00</span></span>
        </div>
      `

      timerElement = document.getElementById("payment-timer")

      // Iniciar cuenta regresiva
      let timeRemaining = tiempoLimite * 1000 // Convertir a milisegundos

      const timerId = setInterval(() => {
        timeRemaining -= 1000

        if (timeRemaining <= 0) {
          clearInterval(timerId)
          paymentMessage.innerHTML = `
            <div class="flex items-center">
              <svg class="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>El tiempo para realizar el pago ha expirado. La reserva ha sido cancelada.</span>
            </div>
          `

          // Deshabilitar el botón de pago
          const submitButton = document.getElementById("submit-button")
          if (submitButton) {
            submitButton.disabled = true
            submitButton.classList.add("opacity-50", "cursor-not-allowed")
          }

          // Cerrar el modal después de 3 segundos
          setTimeout(() => {
            closePagoModal()
            // Recargar la página para actualizar la lista de asesorías
            window.location.reload()
          }, 3000)
        } else {
          timerElement.textContent = formatTimeRemaining(timeRemaining)
        }
      }, 1000)
    }
  }
}

// Exportar funciones para uso global
window.formatDate = formatDate
window.isAsesoriaVigente = isAsesoriaVigente
window.getRandomColor = getRandomColor
window.generateAvatar = generateAvatar
window.showNotification = showNotification
window.toggleDetails = toggleDetails
window.resetFilters = resetFilters
window.verHistorialChat = verHistorialChat
window.closeChatHistorialModal = closeChatHistorialModal
window.enviarMensaje = enviarMensaje
window.pagarAsesoria = pagarAsesoria
window.closePagoModal = closePagoModal
window.cancelarAsesoria = cancelarAsesoria
window.closeCancelarAsesoriaModal = closeCancelarAsesoriaModal
window.openNewAdvisoryModal = openNewAdvisoryModal
window.closeNewAdvisoryModal = closeNewAdvisoryModal
window.showTipsTooltip = showTipsTooltip
window.startNewAppointmentTimer = startNewAppointmentTimer

