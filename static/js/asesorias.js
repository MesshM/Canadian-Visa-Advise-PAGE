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
let paymentTimer = null
let paymentTimeLeft = 300 // 5 minutos en segundos

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
  notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transform transition-all duration-500 translate-x-full`

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

// Inicializar el sistema de pasos cuando se carga la página
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

    // Animar la apertura
    const detailsContent = detailsRow.querySelector("div")
    if (detailsContent) {
      detailsContent.classList.add("animate-fade-in")
    }
  } else {
    // Ocultar detalles
    detailsRow.classList.add("hidden")
  }
}

// Función para editar una asesoría
function editAsesoria(asesoriaId) {
  const modal = document.getElementById("editAdvisoryModal")
  if (!modal) return

  // Buscar datos de la asesoría
  const row = document.querySelector(`tr[data-asesoria-id="${asesoriaId}"]`)
  if (!row) return

  // Obtener datos de la fila
  const fechaCell = row.querySelector("td:nth-child(2)")
  const fechaText = fechaCell ? fechaCell.textContent.trim() : ""
  const fechaParts = fechaText.split("\n")
  const fecha = fechaParts[0]
  const hora = fechaParts[1] ? fechaParts[1].trim() : "00:00"

  // Obtener datos adicionales de los detalles
  const detailsRow = document.getElementById(`details-${asesoriaId}`)
  let tipoAsesoria = ""
  let descripcion = ""
  let lugar = "Virtual (Zoom)"
  const tipoDocumento = "C.C"
  const numeroDocumento = ""

  if (detailsRow) {
    const paragraphs = detailsRow.querySelectorAll("p")
    paragraphs.forEach((p) => {
      const text = p.textContent.trim()
      if (text.includes("Tipo de Visa:")) {
        tipoAsesoria = text.split(":")[1].trim()
      } else if (text.includes("Descripción:")) {
        descripcion = text.split(":")[1].trim()
      } else if (text.includes("Lugar:")) {
        lugar = text.split(":")[1].trim()
      }
    })
  }

  // Llenar el formulario
  const editForm = document.getElementById("editForm")
  if (editForm) {
    const codigoInput = document.getElementById("edit_codigo_asesoria")
    const fechaInput = document.getElementById("edit_fecha_asesoria")
    const tipoAsesoriaSelect = document.getElementById("edit_tipo_asesoria")
    const descripcionInput = document.getElementById("edit_descripcion")
    const lugarSelect = document.getElementById("edit_lugar")
    const tipoDocumentoSelect = document.getElementById("edit_tipo_documento")
    const numeroDocumentoInput = document.getElementById("edit_numero_documento")

    if (codigoInput) codigoInput.value = asesoriaId

    // Formatear fecha y hora para input datetime-local
    if (fechaInput) {
      const fechaObj = new Date(fecha)
      const year = fechaObj.getFullYear()
      const month = String(fechaObj.getMonth() + 1).padStart(2, "0")
      const day = String(fechaObj.getDate()).padStart(2, "0")
      const [hours, minutes] = hora.split(":")
      fechaInput.value = `${year}-${month}-${day}T${hours}:${minutes}`
    }

    if (tipoAsesoriaSelect) {
      for (let i = 0; i < tipoAsesoriaSelect.options.length; i++) {
        if (tipoAsesoriaSelect.options[i].value === tipoAsesoria) {
          tipoAsesoriaSelect.selectedIndex = i
          break
        }
      }
    }

    if (descripcionInput) descripcionInput.value = descripcion

    if (lugarSelect) {
      for (let i = 0; i < lugarSelect.options.length; i++) {
        if (lugarSelect.options[i].value === lugar) {
          lugarSelect.selectedIndex = i
          break
        }
      }
    }

    if (tipoDocumentoSelect) tipoDocumentoSelect.value = tipoDocumento
    if (numeroDocumentoInput) numeroDocumentoInput.value = numeroDocumento
  }

  // Mostrar el modal
  modal.classList.remove("hidden")
  modal.classList.add("flex")
}

// Función para cerrar el modal de editar asesoría
function closeEditAdvisoryModal() {
  const modal = document.getElementById("editAdvisoryModal")
  if (!modal) return

  modal.classList.remove("flex")
  modal.classList.add("hidden")
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
  <div class="bg-primary-100 text-primary-800 p-3 rounded-lg max-w-xs">
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
    <div class="bg-gray-100 text-gray-800 p-3 rounded-lg max-w-xs">
      <p class="text-sm">Gracias por tu mensaje. Un asesor te responderá pronto.</p>
    </div>
    <span class="text-xs text-gray-500 mt-1">Ahora</span>
  `

    chatMessages.appendChild(responseElement)
    chatMessages.scrollTop = chatMessages.scrollHeight
  }, 1000)
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

  // Detener el temporizador si está activo
  if (paymentTimer) {
    clearInterval(paymentTimer)
    paymentTimer = null
  }

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
        const response = await fetch("/cancelar_asesoria", {
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
  fetch("/crear_payment_intent", {
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
              return_url: `${window.location.origin}/confirmar_pago`,
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
      <div class="p-4 bg-red-100 text-red-700 rounded-lg">
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

  // Detener el temporizador si está activo
  if (paymentTimer) {
    clearInterval(paymentTimer)
    paymentTimer = null
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

  if (prevBtn) {
    prevBtn.addEventListener("click", prevStep)
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", nextStep)
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", submitAsesoria)
  }
}

function resetStepper() {
  // Reiniciar el paso activo
  const steps = document.querySelectorAll(".stepper-step")
  const contents = document.querySelectorAll(".stepper-content")
  const progressBar = document.querySelector(".stepper-progress-bar .progress")
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
    const circle = step.querySelector("div")
    if (index === 0) {
      step.classList.add("active")
      step.classList.remove("completed")
      if (circle) {
        circle.classList.remove("bg-gray-200", "text-gray-500", "bg-green-500")
        circle.classList.add("bg-primary-600", "text-white")
      }
    } else {
      step.classList.remove("active", "completed")
      if (circle) {
        circle.classList.remove("bg-primary-600", "text-white", "bg-green-500")
        circle.classList.add("bg-gray-200", "text-gray-500")
      }
    }
  })

  // Reiniciar la barra de progreso
  if (progressBar) {
    progressBar.style.width = "0%"
  }

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

  // Detener el temporizador si está activo
  if (paymentTimer) {
    clearInterval(paymentTimer)
    paymentTimer = null
  }

  // Reiniciar el contador de tiempo
  const timerElement = document.getElementById("payment-timer")
  if (timerElement) {
    timerElement.textContent = "5:00"
  }
}

function prevStep() {
  const steps = document.querySelectorAll(".stepper-step")
  const contents = document.querySelectorAll(".stepper-content")
  const progressBar = document.querySelector(".stepper-progress-bar .progress")
  const prevBtn = document.getElementById("stepper-prev-btn")
  const nextBtn = document.getElementById("stepper-next-btn")
  const submitBtn = document.getElementById("stepper-submit-btn")

  // Encontrar el paso activo actual
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

    // Detener el temporizador si está activo
    if (paymentTimer) {
      clearInterval(paymentTimer)
      paymentTimer = null
    }
  }

  // Actualizar el paso activo
  steps[activeIndex].classList.remove("active")
  steps[activeIndex - 1].classList.add("active")
  steps[activeIndex - 1].classList.remove("completed")

  // Actualizar los círculos de los pasos
  const currentCircle = steps[activeIndex].querySelector("div")
  const prevCircle = steps[activeIndex - 1].querySelector("div")
  if (currentCircle) {
    currentCircle.classList.remove("bg-primary-600", "text-white")
    currentCircle.classList.add("bg-gray-200", "text-gray-500")
  }
  if (prevCircle) {
    if (activeIndex - 1 > 0) {
      prevCircle.classList.remove("bg-green-500")
    }
    prevCircle.classList.add("bg-primary-600", "text-white")
  }

  // Actualizar el contenido visible
  contents[activeIndex].classList.add("hidden")
  contents[activeIndex - 1].classList.remove("hidden")

  // Actualizar la barra de progreso
  if (progressBar) {
    progressBar.style.width = `${((activeIndex - 1) / (steps.length - 1)) * 100}%`
  }

  // Actualizar botones
  if (activeIndex - 1 === 0) {
    prevBtn.classList.add("hidden")
  }

  nextBtn.classList.remove("hidden")
  submitBtn.classList.add("hidden")
}

const nextStep = () => {
  const steps = document.querySelectorAll(".stepper-step")
  const contents = document.querySelectorAll(".stepper-content")
  const progressBar = document.querySelector(".stepper-progress-bar .progress")
  const prevBtn = document.getElementById("stepper-prev-btn")
  const nextBtn = document.getElementById("stepper-next-btn")
  const submitBtn = document.getElementById("stepper-submit-btn")

  // Encontrar el paso activo actual
  let activeIndex = -1
  steps.forEach((step, index) => {
    if (step.classList.contains("active")) {
      activeIndex = index
    }
  })

  if (activeIndex >= steps.length - 1) return // Ya estamos en el último paso

  // Validar el paso actual antes de avanzar
  if (!validateStep(activeIndex)) {
    return
  }

  // Si estamos en el paso 1 y vamos al paso 2, cargar el calendario
  if (activeIndex === 0) {
    loadCalendar()

    // Deshabilitar el botón siguiente hasta que se seleccione fecha y hora
    nextBtn.classList.add("opacity-50", "cursor-not-allowed")
    nextBtn.disabled = true
  }

  // Si estamos en el paso 2 y vamos al paso 3, actualizar el resumen
  if (activeIndex === 1) {
    updateSummary()
  }

  // Actualizar el paso activo
  steps[activeIndex].classList.remove("active")
  steps[activeIndex].classList.add("completed")
  steps[activeIndex + 1].classList.add("active")

  // Actualizar los círculos de los pasos
  const currentCircle = steps[activeIndex].querySelector("div")
  const nextCircle = steps[activeIndex + 1].querySelector("div")
  if (currentCircle) {
    currentCircle.classList.remove("bg-primary-600", "text-white")
    currentCircle.classList.add("bg-green-500", "text-white")
  }
  if (nextCircle) {
    nextCircle.classList.remove("bg-gray-200", "text-gray-500")
    nextCircle.classList.add("bg-primary-600", "text-white")
  }

  // Actualizar el contenido visible
  contents[activeIndex].classList.add("hidden")
  contents[activeIndex + 1].classList.remove("hidden")

  // Actualizar la barra de progreso
  if (progressBar) {
    progressBar.style.width = `${((activeIndex + 1) / (steps.length - 1)) * 100}%`
    progressBar.style.backgroundColor = "#4f46e5" // Asegurar que el color sea el correcto
  }

  // Actualizar botones
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
  fetch("/obtener_asesores")
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

  // Crear el calendario
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  const currentDay = currentDate.getDate()

  // Crear el encabezado del calendario con un diseño más atractivo
  const calendarHeader = document.createElement("div")
  calendarHeader.className = "flex justify-between items-center mb-4 bg-primary-50 p-3 rounded-lg shadow-sm"
  calendarHeader.innerHTML = `
    <button id="prev-month" class="p-2 rounded-full hover:bg-primary-100 transition-colors text-primary-600">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
      </svg>
    </button>
    <h3 id="calendar-month" class="text-base font-medium text-primary-800"></h3>
    <button id="next-month" class="p-2 rounded-full hover:bg-primary-100 transition-colors text-primary-600">
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
      dayElement.className = "text-center font-medium text-primary-700 py-2 border-b-2 border-primary-200"
    } else {
      // Fin de semana con un estilo diferente
      dayElement.className = "text-center font-medium text-gray-400 py-2 border-b-2 border-gray-200"
    }
    dayElement.textContent = day
    calendarGrid.appendChild(dayElement)
  })

  // Agregar los días del mes (se llenarán dinámicamente)
  for (let i = 0; i < 42; i++) {
    const dayElement = document.createElement("div")
    dayElement.className = "calendar-day text-center py-2 rounded-md"
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
    dayElements.forEach(day => {
      day.textContent = ""
      day.className = "calendar-day text-center py-2 rounded-md"
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
        dayElement.className = "calendar-day text-center py-2 rounded-md bg-primary-600 text-white font-bold transform scale-105 shadow-md text-base relative z-10"
        
        // Si el día actual es seleccionable (no es fin de semana y no es pasado)
        if (!isWeekend) {
          dayElement.className += " cursor-pointer hover:bg-primary-700 transition-all duration-300"
          
          // Agregar evento de clic
          dayElement.onclick = function() {
            // Deseleccionar día anterior
            document.querySelectorAll(".calendar-day.selected").forEach(el => {
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
        dayElement.className = "calendar-day text-center py-2 rounded-md text-gray-400 cursor-default text-base bg-gray-50"
      } else if (isWeekend) {
        dayElement.className = "calendar-day text-center py-2 rounded-md text-gray-400 cursor-default text-base bg-gray-50"
        dayElement.title = "No disponible en fin de semana"
      } else {
        // Día seleccionable (lunes a viernes)
        dayElement.className = "calendar-day text-center py-2 rounded-md cursor-pointer hover:bg-primary-50 transition-all duration-300 text-base hover:shadow-sm"
        
        // Agregar evento de clic
        dayElement.onclick = function() {
          // Deseleccionar día anterior
          document.querySelectorAll(".calendar-day.selected").forEach(el => {
            el.classList.remove("selected", "bg-primary-100", "text-primary-800", "ring-2", "ring-primary-500", "ring-offset-1")
          })
          
          // Seleccionar este día
          this.classList.add("selected", "bg-primary-100", "text-primary-800", "ring-2", "ring-primary-500", "ring-offset-1")
          
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
  const formattedDate = dateObj.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  // Cargar horarios disponibles desde el servidor
  fetch(`/obtener_horarios_disponibles?id_asesor=${selectedAsesorId}&fecha=${date}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Error al cargar horarios")
      }
      return response.json()
    })
    .then((data) => {
      // Limpiar contenedor
      timeContainer.innerHTML = ""
      
      // Añadir la fecha seleccionada como encabezado
      const dateHeader = document.createElement("div")
      dateHeader.className = "bg-primary-50 p-2 rounded-lg mb-3 text-center text-primary-800 font-medium text-sm"
      dateHeader.innerHTML = `
        <svg class="w-4 h-4 inline-block mr-1 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
        ${formattedDate}
      `
      timeContainer.appendChild(dateHeader)

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
            ? "time-slot py-3 px-4 rounded-md border border-gray-200 hover:bg-primary-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base w-full text-left flex items-center"
            : "time-slot py-3 px-4 rounded-md border border-gray-200 bg-gray-50 hover:bg-primary-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base w-full text-left flex items-center"
          
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
              el.classList.remove("selected", "bg-primary-100", "text-primary-800", "border-primary-500", "shadow-md", "scale-105")
            })

            // Seleccionar este horario con animación
            timeButton.classList.add("selected", "bg-primary-100", "text-primary-800", "border-primary-500", "shadow-md", "scale-105")

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
          <div class="flex flex-col items-center justify-center h-24 text-center bg-gray-50 rounded-lg p-4">
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
        <div class="flex flex-col items-center justify-center h-24 text-center bg-red-50 rounded-lg p-4">
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
const createTemporaryReservation = (date, time) => {
  if (!selectedAsesorId || !date || !time) return

  // Cancelar cualquier reserva temporal anterior
  if (reservationId) {
    cancelarReservaTemporal(reservationId)
    reservationId = null
  }

  // Detener el temporizador si está activo
  if (paymentTimer) {
    clearInterval(paymentTimer)
    paymentTimer = null
  }

  // Crear una nueva reserva temporal
  fetch("/reservar_horario_temporal", {
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
      }
    })
    .catch((error) => {
      console.error("Error al reservar horario:", error)
      showNotification(error.message, "error")
    })
}

const cancelarReservaTemporal = (reservaId) => {
  if (!reservaId) return

  fetch("/cancelar_reserva_temporal", {
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

function startPaymentTimer() {
  const timerElement = document.getElementById("payment-timer")
  if (!timerElement) return

  // Reiniciar el tiempo
  paymentTimeLeft = 300 // 5 minutos en segundos

  // Actualizar el elemento de tiempo
  updateTimerDisplay()

  // Iniciar el temporizador
  paymentTimer = setInterval(() => {
    paymentTimeLeft--

    // Actualizar el elemento de tiempo
    updateTimerDisplay()

    // Si el tiempo se agota, cancelar la reserva
    if (paymentTimeLeft <= 0) {
      clearInterval(paymentTimer)
      paymentTimer = null

      if (reservationId) {
        cancelarReservaTemporal(reservationId)
        reservationId = null

        // Mostrar notificación
        showNotification("El tiempo de reserva ha expirado", "error")

        // Volver al paso 2
        const steps = document.querySelectorAll(".stepper-step")
        const contents = document.querySelectorAll(".stepper-content")

        // Encontrar el paso activo actual
        let activeIndex = -1
        steps.forEach((step, index) => {
          if (step.classList.contains("active")) {
            activeIndex = index
          }
        })

        if (activeIndex === 2) {
          prevStep()
        }
      }
    }
  }, 1000)
}

function updateTimerDisplay() {
  const timerElement = document.getElementById("payment-timer")
  if (!timerElement) return

  const minutes = Math.floor(paymentTimeLeft / 60)
  const seconds = paymentTimeLeft % 60

  timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`

  // Cambiar color cuando quede poco tiempo
  if (paymentTimeLeft <= 60) {
    timerElement.classList.add("text-red-600")
    timerElement.classList.remove("text-gray-700")
  } else {
    timerElement.classList.remove("text-red-600")
    timerElement.classList.add("text-gray-700")
  }
}

// Modificar la función updateSummary para que coincida con la imagen
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

  // Actualizar el resumen con un diseño que coincida con la imagen
  summaryContainer.innerHTML = `
    <div class="bg-white rounded-xl p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-6 flex items-center">
        <svg class="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
        </svg>
        Resumen de la Asesoría
      </h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Detalles de la Asesoría -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="text-sm font-medium text-gray-700 mb-3">Detalles de la Asesoría</h4>
          
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-gray-600 text-sm">Tipo:</span>
              <span class="text-sm">${tipoAsesoria ? tipoAsesoria.options[tipoAsesoria.selectedIndex].text : ""}</span>
            </div>
            
            <div class="flex justify-between items-center">
              <span class="text-gray-600 text-sm">Precio:</span>
              <span class="text-sm font-medium text-red-500">$${precio.toFixed(2)} USD</span>
            </div>
            
            <div class="flex justify-between items-center">
              <span class="text-gray-600 text-sm">Modalidad:</span>
              <span class="text-sm">${lugar ? lugar.options[lugar.selectedIndex].text : "Virtual (Zoom)"}</span>
            </div>
          </div>
        </div>

        <!-- Detalles del Asesor -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="text-sm font-medium text-gray-700 mb-3">Detalles del Asesor</h4>
          
          <div class="space-y-2">
            <div class="flex justify-between items-start">
              <span class="text-gray-600 text-sm">Nombre:</span>
              <span class="text-sm text-right">${selectedAsesorName || ""}</span>
            </div>
            
            <div class="flex justify-between items-start">
              <span class="text-gray-600 text-sm">Especialidad:</span>
              <span class="text-sm text-right">${selectedAsesorEspecialidad || ""}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Fecha y Hora -->
      <div class="bg-gray-50 p-4 rounded-lg mt-4">
        <h4 class="text-sm font-medium text-gray-700 mb-3">Fecha y Hora</h4>
        
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <svg class="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <span class="text-sm">${fechaFormateada}</span>
          </div>
          <div class="flex items-center">
            <svg class="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="text-sm">${horaFormateada}</span>
          </div>
        </div>
      </div>

      <!-- Información del Solicitante -->
      <div class="bg-gray-50 p-4 rounded-lg mt-4">
        <h4 class="text-sm font-medium text-gray-700 mb-3">Información del Solicitante</h4>
        
        <div class="flex justify-between items-center">
          <span class="text-gray-600 text-sm">Documento:</span>
          <span class="text-sm">${tipoDocumento ? tipoDocumento.value : ""} ${numeroDocumento ? numeroDocumento.value : ""}</span>
        </div>
      </div>

      ${
        descripcion && descripcion.value
          ? `
      <div class="bg-gray-50 p-4 rounded-lg mt-4">
        <h4 class="text-sm font-medium text-gray-700 mb-3">Descripción de la Consulta</h4>
        <p class="text-sm text-gray-700">${descripcion.value}</p>
      </div>
      `
          : ""
      }
    </div>
  `
}

// Modificar la función submitAsesoria para iniciar el temporizador al finalizar
function submitAsesoria() {
  // Obtener datos del formulario
  const form = document.getElementById("asesoria-form")
  if (!form) return

  const tipoAsesoria = document.getElementById("tipo_asesoria").value
  const tipoDocumento = document.getElementById("tipo_documento").value
  const numeroDocumento = document.getElementById("numero_documento").value
  const descripcion = document.getElementById("descripcion").value
  const lugar = document.getElementById("lugar").value

  // Verificar que tenemos todos los datos necesarios
  if (!selectedAsesorId || !selectedDate || !selectedTime) {
    showNotification("Faltan datos para agendar la asesoría", "error")
    return
  }

  // Formatear fecha y hora para el servidor
  const fechaAsesoria = `${selectedDate}T${selectedTime}`

  // Crear objeto con los datos de la asesoría
  const asesoriaData = {
    id_solicitante: form.getAttribute("data-solicitante-id"),
    tipo_asesoria: tipoAsesoria,
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
  fetch("/nueva_asesoria", {
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
        // Mostrar notificación de éxito
        showNotification(data.message || "Asesoría agendada con éxito", "success")

        // Iniciar temporizador de 5 minutos
        startPaymentTimer()

        // Mostrar notificación de tiempo
        showNotification("Tienes 5 minutos para completar el pago", "warning")

        // Cerrar el modal
        closeNewAdvisoryModal()

        // Redirigir a la página de pago
        pagarAsesoria(data.codigo_asesoria, tipoAsesoria)
      }
    })
    .catch((error) => {
      console.error("Error al agendar asesoría:", error)
      showNotification(error.message, "error")
    })
}

// Exportar funciones para uso global
window.formatDate = formatDate
window.isAsesoriaVigente = isAsesoriaVigente
window.getRandomColor = getRandomColor
window.generateAvatar = generateAvatar
window.showNotification = showNotification
window.editAsesoria = editAsesoria
window.closeEditAdvisoryModal = closeEditAdvisoryModal
window.toggleDetails = toggleDetails
window.resetFilters = resetFilters
window.verHistorialChat = verHistorialChat
window.closeChatHistorialModal = closeChatHistorialModal
window.enviarMensaje = enviarMensaje
window.pagarAsesoria = pagarAsesoria
window.closePagoModal = closePagoModal
window.cancelarAsesoria = cancelarAsesoria
window.closeCancelarAsesoriaModal = closeCancelarAsesoriaModal
window.reiniciarPasarelaPago = reiniciarPasarelaPago
window.updateAppointmentPrice = updateAppointmentPrice
window.openNewAdvisoryModal = openNewAdvisoryModal
window.closeNewAdvisoryModal = closeNewAdvisoryModal
