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

// Variables para el chat
let currentChatAsesoriaId = null
let currentChatAsesorId = null
let currentChatAsesorName = null
let chatPollingInterval = null

// Configuración de CometChat
const COMETCHAT_CONSTANTS = {
  APP_ID: "277868b6eeea1f3d", // Reemplazar con tu App ID de CometChat
  REGION: "us", // Reemplazar con tu región
  AUTH_KEY: "837dde62048e90ace0791e4fc895365c118cfffa", // Reemplazar con tu Auth Key
}

// Definir precios por tipo de visa (para usar en el frontend)
const PRECIOS_VISA = {
  Turismo: 100,
  Estudios: 100,
  "Trabajo Temporal": 100,
  Negocios: 100,
  "Residencia Permanente": 100,
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

// Funciones para el Chat con CometChat
function initializeCometChat() {
  const appID = COMETCHAT_CONSTANTS.APP_ID
  const region = COMETCHAT_CONSTANTS.REGION

  const appSetting = new CometChat.AppSettingsBuilder().subscribePresenceForAllUsers().setRegion(region).build()

  CometChat.init(appID, appSetting).then(
    () => {
      console.log("CometChat inicializado correctamente")
      // Intentar login automático si hay usuario en sesión
      loginCometChatUser()
    },
    (error) => {
      console.log("Error al inicializar CometChat:", error)
    },
  )
}

function loginCometChatUser() {
  // Obtener el ID del usuario actual de la sesión
  const userId = document.querySelector("[data-solicitante-id]")?.getAttribute("data-solicitante-id")

  if (!userId) {
    console.log("No se encontró ID de usuario para CometChat")
    return
  }

  const authKey = COMETCHAT_CONSTANTS.AUTH_KEY

  CometChat.login(userId, authKey).then(
    (user) => {
      console.log("Login exitoso en CometChat:", user)
    },
    (error) => {
      console.log("Error en login de CometChat:", error)
      // Si el usuario no existe, crearlo
      createCometChatUser(userId)
    },
  )
}

function createCometChatUser(userId) {
  const authKey = COMETCHAT_CONSTANTS.AUTH_KEY

  // Obtener información del usuario actual
  fetch("/user/obtener_info_usuario")
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        const user = new CometChat.User(userId)
        user.setName(data.usuario.nombres + " " + data.usuario.apellidos)

        CometChat.createUser(user, authKey).then(
          (user) => {
            console.log("Usuario creado en CometChat:", user)
            // Intentar login después de crear el usuario
            CometChat.login(userId, authKey)
          },
          (error) => {
            console.log("Error al crear usuario en CometChat:", error)
          },
        )
      }
    })
    .catch((error) => {
      console.log("Error al obtener información del usuario:", error)
    })
}

function openChatModal(asesoriaId, asesorName, asesorId) {
  currentChatAsesoriaId = asesoriaId
  currentChatAsesorId = asesorId
  currentChatAsesorName = asesorName

  const modal = document.getElementById("chatModal")
  const asesorNameElement = document.getElementById("chat-asesor-name")
  const asesoriaIdElement = document.getElementById("chat-asesoria-id")

  if (asesorNameElement) asesorNameElement.textContent = `Chat con ${asesorName}`
  if (asesoriaIdElement) asesoriaIdElement.textContent = asesoriaId

  // Mostrar el modal
  modal.classList.remove("hidden")
  modal.classList.add("flex")

  // Cargar mensajes existentes
  loadChatMessages(asesoriaId)

  // Iniciar polling para nuevos mensajes
  startChatPolling()
}

function closeChatModal() {
  const modal = document.getElementById("chatModal")

  // Detener polling
  if (chatPollingInterval) {
    clearInterval(chatPollingInterval)
    chatPollingInterval = null
  }

  // Limpiar variables
  currentChatAsesoriaId = null
  currentChatAsesorId = null
  currentChatAsesorName = null

  // Cerrar modal con animación
  const modalContent = modal.querySelector(".bg-white")
  modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
  setTimeout(() => {
    modal.classList.remove("flex")
    modal.classList.add("hidden")
    modalContent.classList.remove("opacity-0", "scale-95")
  }, 300)
}

function loadChatMessages(asesoriaId) {
  const messagesContainer = document.getElementById("chat-messages")

  // Mostrar indicador de carga
  messagesContainer.innerHTML = `
        <div class="flex justify-center items-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-t-2 border-primary-600"></div>
            <p class="ml-3 text-primary-600 text-sm">Cargando mensajes...</p>
        </div>
    `

  fetch(`/asesorias/chat/obtener_mensajes/${asesoriaId}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        displayChatMessages(data.mensajes)
      } else {
        messagesContainer.innerHTML = `
                    <div class="text-center py-8">
                        <p class="text-gray-500">Error al cargar mensajes</p>
                    </div>
                `
      }
    })
    .catch((error) => {
      console.error("Error al cargar mensajes:", error)
      messagesContainer.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-red-500">Error al cargar mensajes</p>
                </div>
            `
    })
}

function displayChatMessages(mensajes) {
  const messagesContainer = document.getElementById("chat-messages")

  if (mensajes.length === 0) {
    messagesContainer.innerHTML = `
            <div class="text-center py-8">
                <div class="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                    </svg>
                </div>
                <p class="text-gray-500">No hay mensajes aún</p>
                <p class="text-sm text-gray-400 mt-1">Inicia la conversación con tu asesor</p>
            </div>
        `
    return
  }

  messagesContainer.innerHTML = ""

  mensajes.forEach((mensaje) => {
    const messageElement = createMessageElement(mensaje)
    messagesContainer.appendChild(messageElement)
  })

  // Scroll al último mensaje
  messagesContainer.scrollTop = messagesContainer.scrollHeight
}

function createMessageElement(mensaje) {
  const messageDiv = document.createElement("div")
  const isFromUser = mensaje.tipo_emisor === "solicitante"

  messageDiv.className = `flex ${isFromUser ? "justify-end" : "justify-start"} mb-4`

  const messageTime = new Date(mensaje.fecha_envio).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  })

  messageDiv.innerHTML = `
        <div class="max-w-xs lg:max-w-md ${isFromUser ? "order-1" : "order-2"}">
            <div class="${
              isFromUser ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-900"
            } rounded-2xl px-4 py-2 shadow-sm">
                <p class="text-sm">${mensaje.mensaje}</p>
            </div>
            <div class="flex ${isFromUser ? "justify-end" : "justify-start"} mt-1">
                <span class="text-xs text-gray-500">${messageTime}</span>
            </div>
        </div>
        ${
          !isFromUser
            ? `
            <div class="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mr-2 order-1 flex-shrink-0">
                <span class="text-xs font-medium">${generateAvatar(mensaje.nombre_emisor)}</span>
            </div>
        `
            : ""
        }
    `

  return messageDiv
}

function sendMessage() {
  const messageInput = document.getElementById("chat-message-input")
  const sendButton = document.getElementById("send-message-btn")
  const mensaje = messageInput.value.trim()

  if (!mensaje || !currentChatAsesoriaId) {
    return
  }

  // Deshabilitar input y botón
  messageInput.disabled = true
  sendButton.disabled = true
  sendButton.innerHTML = `
        <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
        <div class="relative flex items-center justify-center">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        </div>
    `

  fetch("/asesorias/chat/enviar_mensaje", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      codigo_asesoria: currentChatAsesoriaId,
      mensaje: mensaje,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        // Limpiar input
        messageInput.value = ""

        // Agregar mensaje a la interfaz
        const messagesContainer = document.getElementById("chat-messages")
        const messageElement = createMessageElement(data.mensaje)
        messagesContainer.appendChild(messageElement)

        // Scroll al último mensaje
        messagesContainer.scrollTop = messagesContainer.scrollHeight
      } else {
        showNotification("Error al enviar mensaje: " + data.error, "error")
      }
    })
    .catch((error) => {
      console.error("Error al enviar mensaje:", error)
      showNotification("Error al enviar mensaje", "error")
    })
    .finally(() => {
      // Rehabilitar input y botón
      messageInput.disabled = false
      sendButton.disabled = false
      sendButton.innerHTML = `
            <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
            <div class="relative flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
            </div>
        `
      messageInput.focus()
    })
}

function startChatPolling() {
  // Polling cada 3 segundos para nuevos mensajes
  chatPollingInterval = setInterval(() => {
    if (currentChatAsesoriaId) {
      loadChatMessages(currentChatAsesoriaId)
    }
  }, 3000)
}

// Inicializar los botones de consejos útiles cuando se carga la página
document.addEventListener("DOMContentLoaded", () => {
  // Inicializar CometChat
  initializeCometChat()

  // Añadir eventos para cerrar modales al hacer clic fuera del contenido
  const modals = [
    { id: "pagoModal", closeFunction: closePagoModal },
    { id: "cancelarAsesoriaModal", closeFunction: closeCancelarAsesoriaModal },
    { id: "newAdvisoryModal", closeFunction: closeNewAdvisoryModal },
    { id: "chatModal", closeFunction: closeChatModal },
  ]

  modals.forEach((modal) => {
    const modalElement = document.getElementById(modal.id)
    if (modalElement) {
      modalElement.addEventListener("click", (e) => {
        if (e.target === modalElement) {
          modal.closeFunction()
        }
      })
    }
  })

  // Event listener para enviar mensaje con Enter
  const messageInput = document.getElementById("chat-message-input")
  if (messageInput) {
    messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    })
  }

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

  // Verificar si venimos de un pago exitoso
  if (localStorage.getItem("payment_processing") === "true") {
    // Limpiar el flag
    localStorage.removeItem("payment_processing")

    // Mostrar la notificación de pago exitoso con el nuevo mensaje
    showNotification("Pago procesado exitosamente", "success")

    // Opcional: redirigir al formulario de elegibilidad después de un breve retraso
    setTimeout(() => {
      window.location.href = "/formularios_solicitud"
    }, 3000) // Redirigir después de 3 segundos
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

    // Filtro de estado (solo por estado_proceso)
    if (statusValue) {
      const estadoProceso = row.getAttribute("data-estado-proceso") || ""
      if (estadoProceso !== statusValue) {
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

    // Añadir animación de entrada
    const detailsContent = detailsRow.querySelector("div")
    if (detailsContent) {
      detailsContent.classList.add("animate-fade-in")
    }

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
                        <p class="text-sm text-gray-700"><span class="font-medium">Contacto:</span> ${asesoria.correo || "No disponible"} </p>
                      </div>
                    </div>
                  </div>
                  
                  
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
                        <p class="text-sm text-gray-700"><span class="font-medium">Precio:</span> $100.00 USD</p>
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
    // Ocultar detalles con animación
    const detailsContent = detailsRow.querySelector("div")
    if (detailsContent) {
      detailsContent.classList.add("opacity-0", "transition-opacity", "duration-300")
      setTimeout(() => {
        detailsRow.classList.add("hidden")
        detailsContent.classList.remove("opacity-0")
      }, 300)
    } else {
      detailsRow.classList.add("hidden")
    }
  }
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
      <h3 class="text-base font-medium text-primary-800">Resumen
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
              <span class="text-sm font-medium text-primary-600">$100.00 USD</span>
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
    precioAsesoriaElement.textContent = `$100.00 USD`
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
    montoInput.value = "100.00"
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

  // Añadir animación de cierre
  const modalContent = modal.querySelector(".bg-white")
  modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
  setTimeout(() => {
    modal.classList.remove("flex")
    modal.classList.add("hidden")
    modalContent.classList.remove("opacity-0", "scale-95")
  }, 300)
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

  // Añadir animación de cierre
  const modalContent = modal.querySelector(".bg-white")
  modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
  setTimeout(() => {
    modal.classList.remove("flex")
    modal.classList.add("hidden")
    modalContent.classList.remove("opacity-0", "scale-95")
  }, 300)
}

// Función para reiniciar la pasarela de pago con Stripe
function reiniciarPasarelaPago() {
  const stripePublicKey = document.querySelector('meta[name="stripe-public-key"]')?.content

  if (!stripePublicKey) {
    console.error("No se encontró la clave pública de Stripe")
    return
  }

  // Mostrar círculo de carga en el contenedor de Stripe antes de la petición
  const paymentElementContainer = document.getElementById("payment-element")
  if (paymentElementContainer) {
    paymentElementContainer.innerHTML = `
      <div id="stripe-loading-indicator" class="flex flex-col justify-center items-center h-24 space-y-3">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-t-2 border-primary-600"></div>
        <p class="ml-3 text-primary-600 text-sm">Cargando pasarela de pago...</p>
      </div>
    `
  }

  stripe = Stripe(stripePublicKey)

  const asesoriaId = document.getElementById("pago_codigo_asesoria")?.value
  const monto = document.getElementById("monto")?.value

  if (!asesoriaId || !monto) {
    console.error("Faltan datos para inicializar la pasarela de pago")
    return
  }

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
          theme: "flat",
          variables: {
            colorPrimary: "#dc2626",
            colorBackground: "#ffffff",
            colorText: "#1f2937",
            colorDanger: "#b91c1c",
            colorSuccess: "#16a34a",
            colorWarning: "#f59e42",
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            spacingUnit: "4px",
            borderRadius: "4px",
            tabSpacing: "4px",
          },
          rules: {
            ".Tab": {
              border: "1px solid #dc2626",
              backgroundColor: "#fff",
              color: "#dc2626",
              fontWeight: "bold",
              borderRadius: "4px",
            },
            ".Tab--selected": {
              backgroundColor: "#dc2626",
              color: "#fff",
            },
            ".Input": {
              border: "1px solid #dc2626",
              backgroundColor: "#fff",
              color: "#1f2937",
              fontSize: "16px",
              padding: "16px 12px",
              borderRadius: "12px",
            },
            ".Input:focus": {
              borderColor: "#b91c1c",
              border: "none",
              boxShadow: "0 0 0 2px #dc262633",
            },
            ".Label": {
              color: "#dc2626",
              fontWeight: "500",
            },
            ".Error": {
              color: "#b91c1c",
            },
            ".Block": {
              backgroundColor: "#fff",
              borderRadius: "12px",
            },
          },
          labels: "floating",
        },
        layout: {
          type: "tabs",
        },
      }

      elements = stripe.elements(options)

      // Montar el elemento de pago y ocultar el círculo de carga cuando termine
      paymentElement = elements.create("payment", { layout: "tabs" })
      paymentElement.mount("#payment-element")

      // Ocultar el círculo de carga cuando Stripe Elements esté listo
      paymentElement.on("ready", () => {
        const loadingIndicator = document.getElementById("stripe-loading-indicator")
        if (loadingIndicator) {
          loadingIndicator.style.display = "none"
        }
      })

      // Configuración del formulario de pago (igual que antes)
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

          if (submitButton) submitButton.disabled = true
          if (buttonText) buttonText.classList.add("hidden")
          if (spinner) spinner.classList.remove("hidden")

          const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
              return_url: `${window.location.origin}/pagos/confirmar_pago`,
            },
          })

          if (error) {
            if (paymentMessage) {
              paymentMessage.classList.remove("hidden")
              paymentMessage.classList.add("bg-red-100", "text-red-700")
              paymentMessage.textContent = error.message
            }
            if (submitButton) submitButton.disabled = false
            if (buttonText) buttonText.classList.remove("hidden")
            if (spinner) spinner.classList.add("hidden")
          }
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

  // Mostrar el modal con animación
  modal.classList.remove("hidden")
  modal.classList.add("flex")

  // Animar la entrada del contenido
  const modalContent = modal.querySelector(".bg-white")
  if (modalContent) {
    modalContent.classList.add("animate-scale-in")
  }

  // Cargar asesores para el primer paso
  loadAsesores()
}

// Función para cerrar el modal de nueva asesoría
function closeNewAdvisoryModal() {
  const modal = document.getElementById("newAdvisoryModal")
  if (!modal) return

  // Cancelar cualquier reserva temporal si existe
  if (reservationId) {
    cancelarReservaTemporal(reservationId)
    reservationId = null
  }

  // Añadir animación de cierre
  const modalContent = modal.querySelector(".bg-white")
  modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
  setTimeout(() => {
    modal.classList.remove("flex")
    modal.classList.add("hidden")
    modalContent.classList.remove("opacity-0", "scale-95")
  }, 300)
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

  // Actualizar indicador móvil
  const mobileStepNumber = document.getElementById("current-step-number")
  const mobileStepText = document.getElementById("current-step-text")
  if (mobileStepNumber) mobileStepNumber.textContent = "1"
  if (mobileStepText) mobileStepText.textContent = "Paso 1 de 3"
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

    // Animar la entrada del contenido anterior
    setTimeout(() => {
      contents[activeIndex - 1].classList.remove("translate-x-full", "opacity-0")
    }, 50)

    // Limpiar las clases de animación después de completar la transición
    setTimeout(() => {
      contents[activeIndex - 1].classList.remove("transform", "transition-all", "duration-500")
    }, 500)
  }, 250)

  // Actualizar los pasos
  const currentStep = steps[activeIndex]
  const prevStepElement = steps[activeIndex - 1]

  // Desactivar el paso actual
  currentStep.classList.remove("active")
  const currentCircle = currentStep.querySelector("div:first-child")
  if (currentCircle) {
    currentCircle.classList.remove("bg-primary-600", "text-white")
    currentCircle.classList.add("bg-gray-200", "text-gray-500")
    // Mostrar el número del paso
    currentCircle.innerHTML = `<span>${activeIndex + 1}</span>`
  }

  // Activar el paso anterior
  prevStepElement.classList.add("active")
  prevStepElement.classList.remove("completed")
  const prevCircle = prevStepElement.querySelector("div:first-child")
  if (prevCircle) {
    prevCircle.classList.remove("bg-gray-200", "text-gray-500")
    prevCircle.classList.add("bg-primary-600", "text-white")
    // Mostrar el número del paso en lugar del check
    prevCircle.innerHTML = `<span>${activeIndex}</span>`
  }

  // Actualizar el conector
  if (connectors[activeIndex - 1]) {
    connectors[activeIndex - 1].classList.remove("bg-primary-600")
    connectors[activeIndex - 1].classList.add("bg-gray-200")
  }

  // Actualizar botones
  if (activeIndex - 1 === 0) {
    prevBtn.classList.add("hidden")
  }
  nextBtn.classList.remove("hidden")
  submitBtn.classList.add("hidden")

  // Actualizar indicador móvil
  const mobileStepNumber = document.getElementById("current-step-number")
  const mobileStepText = document.getElementById("current-step-text")
  if (mobileStepNumber) mobileStepNumber.textContent = activeIndex.toString()
  if (mobileStepText) mobileStepText.textContent = `Paso ${activeIndex} de 3`
}

// Modificar la función nextStep para mostrar números en lugar de checks en los pasos activos
function nextStep() {
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

  // Validar el paso actual antes de continuar
  if (!validateCurrentStep(activeIndex)) {
    return
  }

  if (activeIndex >= steps.length - 1) return // Ya estamos en el último paso

  // Animar la salida del contenido actual
  contents[activeIndex].classList.add("transform", "transition-all", "duration-500", "-translate-x-full", "opacity-0")

  // Después de un breve retraso, ocultar el contenido actual y mostrar el siguiente
  setTimeout(() => {
    contents[activeIndex].classList.add("hidden")
    contents[activeIndex].classList.remove(
      "transform",
      "transition-all",
      "duration-500",
      "-translate-x-full",
      "opacity-0",
    )

    // Preparar el contenido siguiente para la animación de entrada
    contents[activeIndex + 1].classList.remove("hidden")
    contents[activeIndex + 1].classList.add(
      "transform",
      "transition-all",
      "duration-500",
      "translate-x-full",
      "opacity-0",
    )

    // Animar la entrada del contenido siguiente
    setTimeout(() => {
      contents[activeIndex + 1].classList.remove("translate-x-full", "opacity-0")
    }, 50)

    // Limpiar las clases de animación después de completar la transición
    setTimeout(() => {
      contents[activeIndex + 1].classList.remove("transform", "transition-all", "duration-500")
    }, 500)
  }, 250)

  // Actualizar los pasos
  const currentStep = steps[activeIndex]
  const nextStepElement = steps[activeIndex + 1]

  // Marcar el paso actual como completado
  currentStep.classList.remove("active")
  currentStep.classList.add("completed")
  const currentCircle = currentStep.querySelector("div:first-child")
  if (currentCircle) {
    currentCircle.classList.remove("bg-primary-600", "text-white")
    currentCircle.classList.add("bg-primary-600", "text-white")
    // Mostrar el check para pasos completados
    currentCircle.innerHTML = `
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
    `
  }

  // Activar el siguiente paso
  nextStepElement.classList.add("active")
  const nextCircle = nextStepElement.querySelector("div:first-child")
  if (nextCircle) {
    nextCircle.classList.remove("bg-gray-200", "text-gray-500")
    nextCircle.classList.add("bg-primary-600", "text-white")
    // Mostrar el número del paso activo
    nextCircle.innerHTML = `<span>${activeIndex + 2}</span>`
  }

  // Actualizar el conector
  if (connectors[activeIndex]) {
    connectors[activeIndex].classList.remove("bg-gray-200")
    connectors[activeIndex].classList.add("bg-primary-600")
  }

  // Actualizar botones
  prevBtn.classList.remove("hidden")
  if (activeIndex + 1 === steps.length - 1) {
    nextBtn.classList.add("hidden")
    submitBtn.classList.remove("hidden")
  }

  // Actualizar indicador móvil
  const mobileStepNumber = document.getElementById("current-step-number")
  const mobileStepText = document.getElementById("current-step-text")
  if (mobileStepNumber) mobileStepNumber.textContent = (activeIndex + 2).toString()
  if (mobileStepText) mobileStepText.textContent = `Paso ${activeIndex + 2} de 3`

  // Acciones específicas para cada paso
  if (activeIndex + 1 === 1) {
    // Entrando al paso 2 (calendario)
    initCalendar()
  } else if (activeIndex + 1 === 2) {
    // Entrando al paso 3 (resumen)
    updateSummary()
  }
}

// Función para validar el paso actual
function validateCurrentStep(stepIndex) {
  if (stepIndex === 0) {
    // Validar paso 1: datos básicos
    const tipoAsesoria = document.getElementById("tipo_asesoria")
    const asesorId = document.getElementById("asesor_id")
    const numeroDocumento = document.getElementById("numero_documento")

    if (!tipoAsesoria || tipoAsesoria.value === "") {
      showNotification("Por favor selecciona un tipo de asesoría", "warning")
      return false
    }

    if (!asesorId || asesorId.value === "") {
      showNotification("Por favor selecciona un asesor", "warning")
      return false
    }

    if (!numeroDocumento || numeroDocumento.value.trim() === "") {
      showNotification("Por favor ingresa tu número de documento", "warning")
      return false
    }

    // Guardar información del asesor seleccionado
    const selectedOption = asesorId.options[asesorId.selectedIndex]
    selectedAsesorId = asesorId.value
    selectedAsesorName = selectedOption.text
    selectedAsesorEspecialidad = selectedOption.getAttribute("data-especialidad") || "Especialista en Inmigración"

    return true
  } else if (stepIndex === 1) {
    // Validar paso 2: fecha y hora
    if (!selectedDate || !selectedTime) {
      showNotification("Por favor selecciona una fecha y hora para tu asesoría", "warning")
      return false
    }

    return true
  }

  return true
}

// Función para cargar asesores
function loadAsesores() {
  const asesorSelect = document.getElementById("asesor_id")
  if (!asesorSelect) return

  // Mostrar indicador de carga
  asesorSelect.innerHTML = '<option value="">Cargando asesores...</option>'

  fetch("/asesorias/obtener_asesores")
    .then((response) => response.json())
    .then((data) => {
      if (data.asesores) {
        asesorSelect.innerHTML = '<option value="">Seleccione un asesor</option>'

        data.asesores.forEach((asesor) => {
          const option = document.createElement("option")
          option.value = asesor.id_asesor
          option.textContent = `${asesor.nombre} ${asesor.apellidos}`
          option.setAttribute("data-especialidad", asesor.especialidad)
          asesorSelect.appendChild(option)
        })
      } else {
        asesorSelect.innerHTML = '<option value="">Error al cargar asesores</option>'
      }
    })
    .catch((error) => {
      console.error("Error al cargar asesores:", error)
      asesorSelect.innerHTML = '<option value="">Error al cargar asesores</option>'
    })
}

// Función para inicializar el calendario
function initCalendar() {
  const calendarContainer = document.getElementById("calendar-container")
  if (!calendarContainer) return

  // Limpiar el contenedor
  calendarContainer.innerHTML = ""

  // Crear el calendario
  const calendar = document.createElement("div")
  calendar.className = "calendar"

  // Obtener la fecha actual
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  // Crear el encabezado del calendario
  const header = document.createElement("div")
  header.className = "calendar-header flex justify-between items-center mb-4"
  header.innerHTML = `
  <button id="prev-month" class="p-2 rounded-xl hover:bg-gray-100 transition-colors duration-300 cursor-pointer">
    <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
    </svg>
  </button>
  <h3 id="calendar-title" class="text-lg font-semibold text-gray-800"></h3>
  <button id="next-month" class="p-2 rounded-xl hover:bg-gray-100 transition-colors duration-300 cursor-pointer">
    <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
    </svg>
  </button>
`

  calendar.appendChild(header)

  // Crear la grilla del calendario
  const grid = document.createElement("div")
  grid.className = "calendar-grid grid grid-cols-7 gap-1"
  grid.id = "calendar-grid"

  calendar.appendChild(grid)
  calendarContainer.appendChild(calendar)

  // Renderizar el calendario para el mes actual
  renderCalendar(currentYear, currentMonth)

  // Agregar event listeners para navegación
  document.getElementById("prev-month").addEventListener("click", () => {
    const title = document.getElementById("calendar-title")
    const [monthName, year] = title.textContent.split(" ")
    const monthIndex = getMonthIndex(monthName)
    const newDate = new Date(Number.parseInt(year), monthIndex - 1, 1)
    renderCalendar(newDate.getFullYear(), newDate.getMonth())
  })

  document.getElementById("next-month").addEventListener("click", () => {
    const title = document.getElementById("calendar-title")
    const [monthName, year] = title.textContent.split(" ")
    const monthIndex = getMonthIndex(monthName)
    const newDate = new Date(Number.parseInt(year), monthIndex + 1, 1)
    renderCalendar(newDate.getFullYear(), newDate.getMonth())
  })
}

// Función para obtener el índice del mes por nombre
function getMonthIndex(monthName) {
  const months = [
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
  return months.indexOf(monthName)
}

// Función para renderizar el calendario
function renderCalendar(year, month) {
  const grid = document.getElementById("calendar-grid")
  const title = document.getElementById("calendar-title")

  if (!grid || !title) return

  // Limpiar la grilla
  grid.innerHTML = ""

  // Actualizar el título
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
  title.textContent = `${monthNames[month]} ${year}`

  // Días de la semana
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
  dayNames.forEach((day) => {
    const dayHeader = document.createElement("div")
    dayHeader.className = "text-center text-xs font-medium text-gray-500 py-2"
    dayHeader.textContent = day
    grid.appendChild(dayHeader)
  })

  // Obtener información del mes
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  // Obtener la fecha actual
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month
  const currentDate = today.getDate()

  // Agregar días vacíos al inicio
  for (let i = 0; i < startingDayOfWeek; i++) {
    const emptyDay = document.createElement("div")
    emptyDay.className = "h-10"
    grid.appendChild(emptyDay)
  }

  // Agregar los días del mes
  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = document.createElement("div")
    dayElement.className =
      "h-10 flex items-center justify-center text-sm cursor-pointer rounded-xl transition-all duration-300 hover:bg-primary-100"
    dayElement.textContent = day

    // Marcar el día actual
    if (isCurrentMonth && day === currentDate) {
      dayElement.classList.add("bg-primary-600", "text-white", "font-semibold")
      dayElement.classList.remove("hover:bg-primary-100")
    }

    // Deshabilitar días pasados
    const dayDate = new Date(year, month, day)
    if (dayDate < today.setHours(0, 0, 0, 0)) {
      dayElement.classList.add("text-gray-300", "cursor-not-allowed")
      dayElement.classList.remove("cursor-pointer", "hover:bg-primary-100")
    } else {
      // Agregar event listener para días válidos
      dayElement.addEventListener("click", () => selectDate(year, month, day, dayElement))
    }

    grid.appendChild(dayElement)
  }
}

// Función para seleccionar una fecha
function selectDate(year, month, day, element) {
  // Remover selección anterior
  const previousSelected = document.querySelector(".calendar-grid .selected-date")
  if (previousSelected) {
    previousSelected.classList.remove("selected-date", "bg-primary-100", "border-primary-500", "border-2")
    // Restaurar el estilo del día actual si es necesario
    const today = new Date()
    if (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === Number.parseInt(previousSelected.textContent)
    ) {
      previousSelected.classList.add("bg-primary-600", "text-white", "font-semibold")
    }
  }

  // Seleccionar la nueva fecha
  element.classList.add("selected-date", "bg-primary-100", "border-primary-500", "border-2")
  element.classList.remove("bg-primary-600", "text-white", "font-semibold")

  // Guardar la fecha seleccionada
  selectedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`

  // Cargar horarios disponibles
  loadAvailableTimes(selectedDate)
}

// Función para cargar horarios disponibles
function loadAvailableTimes(date) {
  const timeContainer = document.getElementById("time-container")
  if (!timeContainer || !selectedAsesorId) return

  // Mostrar indicador de carga
  timeContainer.innerHTML = `
  <div class="flex justify-center items-center py-8">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-t-2 border-primary-600"></div>
    <p class="ml-3 text-primary-600 text-sm">Cargando horarios...</p>
  </div>
`

  fetch(`/asesorias/obtener_horarios_disponibles?id_asesor=${selectedAsesorId}&fecha=${date}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.horarios && data.horarios.length > 0) {
        timeContainer.innerHTML = ""

        // Crear botones para cada horario
        data.horarios.forEach((hora) => {
          const timeButton = document.createElement("button")
          timeButton.className =
            "w-full p-3 mb-2 text-left rounded-xl border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-all duration-300 cursor-pointer"
          timeButton.textContent = hora
          timeButton.addEventListener("click", () => selectTime(hora, timeButton))
          timeContainer.appendChild(timeButton)
        })
      } else {
        timeContainer.innerHTML = `
        <div class="text-center py-8">
          <svg class="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-gray-500">No hay horarios disponibles para esta fecha</p>
          <p class="text-sm text-gray-400 mt-1">Selecciona otra fecha</p>
        </div>
      `
      }
    })
    .catch((error) => {
      console.error("Error al cargar horarios:", error)
      timeContainer.innerHTML = `
      <div class="text-center py-8">
        <p class="text-red-500">Error al cargar horarios</p>
        <p class="text-sm text-gray-400 mt-1">Intenta nuevamente</p>
      </div>
    `
    })
}

// Función para seleccionar una hora
function selectTime(time, element) {
  // Remover selección anterior
  const previousSelected = document.querySelector("#time-container .selected-time")
  if (previousSelected) {
    previousSelected.classList.remove("selected-time", "bg-primary-600", "text-white", "border-primary-600")
    previousSelected.classList.add("border-gray-200", "hover:border-primary-500", "hover:bg-primary-50")
  }

  // Seleccionar la nueva hora
  element.classList.add("selected-time", "bg-primary-600", "text-white", "border-primary-600")
  element.classList.remove("border-gray-200", "hover:border-primary-500", "hover:bg-primary-50")

  // Guardar la hora seleccionada
  selectedTime = time

  // Crear reserva temporal
  createTemporaryReservation()
}

// Función para crear una reserva temporal
function createTemporaryReservation() {
  if (!selectedAsesorId || !selectedDate || !selectedTime) return

  fetch("/asesorias/reservar_horario_temporal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id_asesor: selectedAsesorId,
      fecha: selectedDate,
      hora: selectedTime,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        reservationId = data.reserva_id
        showNotification("Horario reservado temporalmente por 10 minutos", "success")
      } else {
        showNotification("Error al reservar horario: " + data.error, "error")
        // Limpiar selección si hay error
        selectedTime = null
        const selectedElement = document.querySelector("#time-container .selected-time")
        if (selectedElement) {
          selectedElement.classList.remove("selected-time", "bg-primary-600", "text-white", "border-primary-600")
          selectedElement.classList.add("border-gray-200", "hover:border-primary-500", "hover:bg-primary-50")
        }
      }
    })
    .catch((error) => {
      console.error("Error al crear reserva temporal:", error)
      showNotification("Error al reservar horario", "error")
    })
}

// Función para cancelar una reserva temporal
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
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        console.log("Reserva temporal cancelada")
      } else {
        console.error("Error al cancelar reserva temporal:", data.error)
      }
    })
    .catch((error) => {
      console.error("Error al cancelar reserva temporal:", error)
    })
}

// Función para enviar la solicitud de asesoría
function submitAsesoria() {
  if (!validateCurrentStep(2)) return

  // Mostrar indicador de carga
  showLoadingIndicator()

  // Obtener datos del formulario
  const formData = {
    id_solicitante: document.getElementById("asesoria-form").getAttribute("data-solicitante-id"),
    tipo_asesoria: document.getElementById("tipo_asesoria").value,
    descripcion: document.getElementById("descripcion").value,
    lugar: document.getElementById("lugar").value,
    tipo_documento: document.getElementById("tipo_documento").value,
    numero_documento: document.getElementById("numero_documento").value,
    id_asesor: selectedAsesorId,
    asesor_asignado: selectedAsesorName,
    asesor_especialidad: selectedAsesorEspecialidad,
    fecha_asesoria: `${selectedDate}T${selectedTime}`,
  }

  fetch("/asesorias/nueva_asesoria", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
  })
    .then((response) => response.json())
    .then((data) => {
      hideLoadingIndicator()

      if (data.success) {
        showNotification("Asesoría agendada exitosamente. Tienes 5 minutos para realizar el pago.", "success")

        // Cerrar el modal
        closeNewAdvisoryModal()

        // Recargar la página para mostrar la nueva asesoría
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        showNotification("Error al agendar asesoría: " + data.error, "error")
      }
    })
    .catch((error) => {
      hideLoadingIndicator()
      console.error("Error al enviar solicitud:", error)
      showNotification("Error al agendar asesoría", "error")
    })
}

// Exportar funciones para uso global
window.formatDate = formatDate
window.isAsesoriaVigente = isAsesoriaVigente
window.getRandomColor = getRandomColor
window.generateAvatar = generateAvatar
window.showNotification = showNotification
window.toggleDetails = toggleDetails
window.resetFilters = resetFilters
window.pagarAsesoria = pagarAsesoria
window.closePagoModal = closePagoModal
window.cancelarAsesoria = cancelarAsesoria
window.closeCancelarAsesoriaModal = closeCancelarAsesoriaModal
window.openNewAdvisoryModal = openNewAdvisoryModal
window.closeNewAdvisoryModal = closeNewAdvisoryModal
window.showTipsTooltip = showTipsTooltip