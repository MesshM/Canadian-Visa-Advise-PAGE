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
const reservationId = null
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

// ==================== FUNCIONES DEL CALENDARIO ====================

// Función para inicializar el calendario
function initializeCalendar() {
  console.log("Inicializando calendario...")
  const calendarContainer = document.getElementById("calendar-container")
  if (!calendarContainer) {
    console.error("No se encontró el contenedor del calendario")
    return
  }

  // Limpiar cualquier contenido previo
  calendarContainer.innerHTML = `
    <h4 class="text-md font-semibold text-gray-800 mb-3 flex items-center">
      <svg class="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
      </svg>
      Seleccione una fecha
    </h4>
  `

  // Crear el calendario con mejor diseño
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  // Crear el encabezado del mes con mejor diseño
  const monthHeader = document.createElement("div")
  monthHeader.className = "flex justify-between items-center mb-4 bg-primary-50 p-3 rounded-lg"
  monthHeader.innerHTML = `
    <button id="prev-month" class="p-2 rounded-lg text-primary-600 hover:bg-primary-100 transition-all duration-200 transform hover:scale-110">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
      </svg>
    </button>
    <h3 class="text-lg font-semibold text-primary-700 capitalize" id="month-year">
      ${new Date(currentYear, currentMonth).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
    </h3>
    <button id="next-month" class="p-2 rounded-lg text-primary-600 hover:bg-primary-100 transition-all duration-200 transform hover:scale-110">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
      </svg>
    </button>
  `
  calendarContainer.appendChild(monthHeader)

  // Crear la cuadrícula de días de la semana con mejor diseño
  const weekdaysGrid = document.createElement("div")
  weekdaysGrid.className = "grid grid-cols-7 gap-1 mb-2"
  const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
  weekdays.forEach((day) => {
    const dayElement = document.createElement("div")
    dayElement.className = "text-center text-sm font-medium text-gray-600 py-2 border-b border-gray-200"
    dayElement.textContent = day
    weekdaysGrid.appendChild(dayElement)
  })
  calendarContainer.appendChild(weekdaysGrid)

  // Crear la cuadrícula de días del mes con mejor diseño
  const daysGrid = document.createElement("div")
  daysGrid.className = "grid grid-cols-7 gap-1"
  daysGrid.id = "days-grid"
  calendarContainer.appendChild(daysGrid)

  // Guardar el año y mes actual en el encabezado para referencia
  const monthYearHeader = document.getElementById("month-year")
  if (monthYearHeader) {
    monthYearHeader.dataset.current = `${currentYear}-${currentMonth}`
  }

  // Renderizar el mes actual
  renderMonth(currentYear, currentMonth)

  // Agregar event listeners para los botones de navegación
  document.getElementById("prev-month")?.addEventListener("click", () => {
    const monthYearEl = document.getElementById("month-year")
    if (!monthYearEl || !monthYearEl.dataset.current) return

    const [year, month] = monthYearEl.dataset.current.split("-").map(Number)
    let newMonth = month - 1
    let newYear = year
    if (newMonth < 0) {
      newMonth = 11
      newYear--
    }
    renderMonth(newYear, newMonth)
  })

  document.getElementById("next-month")?.addEventListener("click", () => {
    const monthYearEl = document.getElementById("month-year")
    if (!monthYearEl || !monthYearEl.dataset.current) return

    const [year, month] = monthYearEl.dataset.current.split("-").map(Number)
    let newMonth = month + 1
    let newYear = year
    if (newMonth > 11) {
      newMonth = 0
      newYear++
    }
    renderMonth(newYear, newMonth)
  })

  // Inicializar la sección de horarios disponibles
  const timeSlotContainer = document.getElementById("time-slots-container")
  if (timeSlotContainer) {
    timeSlotContainer.classList.remove("hidden")
    timeSlotContainer.innerHTML = `
      <h4 class="text-md font-semibold text-gray-800 mb-3 flex items-center">
        <svg class="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        Horarios Disponibles
      </h4>
      <div id="time-slots" class="grid grid-cols-3 gap-2"></div>
      <div id="no-slots-message" class="text-center text-gray-500 py-4 hidden">
        No hay horarios disponibles para esta fecha
      </div>
    `
  }

  console.log("Calendario inicializado correctamente")
}

// Función para renderizar el mes
function renderMonth(year, month) {
  console.log(`Renderizando mes: ${month}/${year}`)
  const daysGrid = document.getElementById("days-grid")
  if (!daysGrid) {
    console.error("No se encontró la cuadrícula de días")
    return
  }

  // Limpiar la cuadrícula
  daysGrid.innerHTML = ""

  // Actualizar el encabezado del mes
  const monthYearHeader = document.getElementById("month-year")
  if (monthYearHeader) {
    monthYearHeader.textContent = new Date(year, month).toLocaleDateString("es-ES", { month: "long", year: "numeric" })
    monthYearHeader.dataset.current = `${year}-${month}`
  }

  // Obtener el primer día del mes y el número de días
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()

  // Ajustar para que la semana comience en lunes (0 = lunes, 6 = domingo)
  let firstDayIndex = firstDay.getDay() - 1
  if (firstDayIndex < 0) firstDayIndex = 6 // Si es domingo (0), convertir a 6

  // Agregar celdas vacías para los días anteriores al primer día del mes
  for (let i = 0; i < firstDayIndex; i++) {
    const emptyDay = document.createElement("div")
    emptyDay.className = "h-12 rounded-lg"
    daysGrid.appendChild(emptyDay)
  }

  // Obtener la fecha actual para resaltarla
  const currentDate = new Date()
  const currentDay = currentDate.getDate()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  // Agregar los días del mes con mejor diseño
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const dayElement = document.createElement("div")

    // Verificar si es fin de semana (0 = domingo, 6 = sábado)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6

    // Verificar si la fecha es anterior a hoy
    const isPast = date < new Date(currentYear, currentMonth, currentDay)

    // Aplicar clases según las condiciones con mejor diseño
    if (isWeekend || isPast) {
      dayElement.className =
        "h-12 flex items-center justify-center rounded-lg text-gray-400 bg-gray-100 cursor-not-allowed transform transition-transform duration-300"
    } else {
      dayElement.className =
        "h-12 flex items-center justify-center rounded-lg hover:bg-primary-100 hover:text-primary-600 cursor-pointer transition-all duration-300 border border-transparent hover:border-primary-200 transform hover:scale-105"
      dayElement.classList.add("day-selectable")

      // Agregar evento de clic para seleccionar el día
      dayElement.addEventListener("click", () => {
        selectDate(date)
        dayElement.classList.add("animate-pulse-scale")
        setTimeout(() => {
          dayElement.classList.remove("animate-pulse-scale")
        }, 500)
      })
    }

    // Resaltar el día actual con mejor diseño
    if (day === currentDay && month === currentMonth && year === currentYear) {
      dayElement.classList.add(
        "bg-primary-50",
        "text-primary-600",
        "font-semibold",
        "border",
        "border-primary-300",
        "ring-2",
        "ring-primary-300/50",
      )
    }

    dayElement.textContent = day
    dayElement.dataset.date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    daysGrid.appendChild(dayElement)
  }

  // Ocultar el mensaje de carga
  const loadingElement = document.getElementById("calendar-loading")
  if (loadingElement) {
    loadingElement.style.display = "none"
  }
}

// Función para seleccionar una fecha
function selectDate(date) {
  // Limpiar selección anterior
  document.querySelectorAll(".day-selected").forEach((el) => {
    el.classList.remove("day-selected", "bg-primary-600", "text-white", "border-primary-600", "scale-105")
    el.classList.add("hover:bg-primary-100", "hover:text-primary-600", "border-transparent")
  })

  // Resaltar el día seleccionado con mejor diseño
  const dateString = date.toISOString().split("T")[0]
  const dayElement = document.querySelector(`[data-date="${dateString}"]`)
  if (dayElement) {
    dayElement.classList.add("day-selected", "bg-primary-600", "text-white", "border-primary-600", "scale-105")
    dayElement.classList.remove("hover:bg-primary-100", "hover:text-primary-600", "border-transparent")
  }

  // Guardar la fecha seleccionada
  selectedDate = dateString

  // Limpiar la selección de hora
  selectedTime = null

  // Mostrar los horarios disponibles para esta fecha
  loadAvailableTimeSlots(selectedDate)

  // Actualizar los detalles de la asesoría
  updateAppointmentDetails()
}

// Función para cargar los horarios disponibles
function loadAvailableTimeSlots(date) {
  const timeSlotContainer = document.getElementById("time-slots-container")
  const timeSlots = document.getElementById("time-slots")
  const noSlotsMessage = document.getElementById("no-slots-message")

  if (!timeSlotContainer) return

  // Limpiar el contenedor
  timeSlotContainer.innerHTML = ""

  // Mostrar un indicador de carga con mejor diseño
  timeSlotContainer.innerHTML = `
    <div class="col-span-3 flex justify-center py-6">
      <svg class="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  `

  // Obtener el asesor seleccionado
  const asesorSelector = document.getElementById("asesor_selector")
  if (!asesorSelector || !asesorSelector.value) {
    timeSlotContainer.innerHTML = `
      <div class="col-span-3 text-center text-gray-500 py-6 bg-gray-50 rounded-lg">
        <svg class="w-10 h-10 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        <p>Por favor, seleccione un asesor primero</p>
      </div>
    `
    return
  }

  selectedAdvisorId = asesorSelector.value

  // Realizar la solicitud para obtener los horarios disponibles
  fetch(`/obtener_horarios_disponibles?id_asesor=${selectedAdvisorId}&fecha=${date}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Error al obtener horarios disponibles")
      }
      return response.json()
    })
    .then((data) => {
      // Limpiar el contenedor
      timeSlotContainer.innerHTML = ""

      if (data.horarios && data.horarios.length > 0) {
        // Crear un contenedor para los horarios con diseño de grid
        const timeSlotsGrid = document.createElement("div")
        timeSlotsGrid.className = "grid grid-cols-3 gap-2"
        timeSlotContainer.appendChild(timeSlotsGrid)

        // Mostrar los horarios disponibles con mejor diseño
        data.horarios.forEach((hora) => {
          const timeSlot = document.createElement("div")
          timeSlot.className =
            "time-slot p-3 text-center border border-gray-200 rounded-lg hover:bg-primary-50 hover:border-primary-300 cursor-pointer transition-all duration-300 text-gray-700 hover:text-primary-700 font-medium transform hover:scale-105"
          timeSlot.textContent = hora
          timeSlot.dataset.time = hora

          // Agregar evento de clic para seleccionar la hora
          timeSlot.addEventListener("click", () => {
            selectTimeSlot(hora)
            timeSlot.classList.add("animate-pulse-scale")
            setTimeout(() => {
              timeSlot.classList.remove("animate-pulse-scale")
            }, 500)
          })

          timeSlotsGrid.appendChild(timeSlot)
        })
      } else {
        // Mostrar mensaje de no hay horarios disponibles con mejor diseño
        timeSlotContainer.innerHTML = `
          <div class="flex flex-col items-center justify-center py-6 bg-gray-50 rounded-lg">
            <svg class="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p class="text-gray-500">No hay horarios disponibles para esta fecha</p>
            <p class="text-xs text-gray-400 mt-1">Por favor, seleccione otra fecha</p>
          </div>
        `
      }
    })
    .catch((error) => {
      console.error("Error:", error)
      timeSlotContainer.innerHTML = `
        <div class="text-center text-red-500 py-6 bg-red-50 rounded-lg">
          <svg class="w-10 h-10 mx-auto mb-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p>Error al cargar los horarios disponibles</p>
        </div>
      `
    })
}

// Función para seleccionar un horario
function selectTimeSlot(time) {
  // Limpiar selección anterior
  document.querySelectorAll(".time-slot").forEach((el) => {
    el.classList.remove("bg-primary-100", "border-primary-500", "text-primary-700", "scale-105")
    el.classList.add("border-gray-200", "text-gray-700")
  })

  // Resaltar el horario seleccionado con mejor diseño
  const timeSlot = document.querySelector(`.time-slot[data-time="${time}"]`)
  if (timeSlot) {
    timeSlot.classList.remove("border-gray-200", "text-gray-700")
    timeSlot.classList.add("bg-primary-100", "border-primary-500", "text-primary-700", "scale-105")
  }

  // Guardar la hora seleccionada
  selectedTime = time

  // Crear una reserva temporal para este horario
  createTemporaryReservation()

  // Actualizar los detalles de la cita
  updateAppointmentDetails()

  // Habilitar el botón si se ha seleccionado fecha y hora
  checkFormCompletion()
}

// Función para actualizar los detalles de la asesoría
function updateAppointmentDetails() {
  const appointmentDetailsContent = document.getElementById("appointment-details-content")
  if (!appointmentDetailsContent) return

  // Obtener datos del formulario
  const tipoDocumento = document.getElementById("tipo_documento")?.value || ""
  const numeroDocumento = document.getElementById("numero_documento")?.value || ""
  const descripcion = document.getElementById("descripcion")?.value || ""
  const lugar = document.getElementById("lugar")?.value || "Virtual (Zoom)"

  // Obtener el nombre del asesor
  const asesorSelector = document.getElementById("asesor_selector")
  const selectedOption = asesorSelector?.options[asesorSelector.selectedIndex]
  const asesorName = selectedOption ? selectedOption.getAttribute("data-name") : ""

  // Obtener la especialidad del asesor
  const asesorEspecialidad = selectedOption
    ? selectedOption.getAttribute("data-especialidad") || "Inmigración Canadiense"
    : ""

  // Obtener el tipo de asesoría y precio
  const tipoAsesoriaSelect = document.getElementById("tipo_asesoria")
  const tipoAsesoria =
    tipoAsesoriaSelect && tipoAsesoriaSelect.selectedIndex >= 0
      ? tipoAsesoriaSelect.options[tipoAsesoriaSelect.selectedIndex].text
      : ""
  const precioAsesoria =
    tipoAsesoriaSelect && tipoAsesoriaSelect.selectedIndex >= 0
      ? tipoAsesoriaSelect.options[tipoAsesoriaSelect.selectedIndex].getAttribute("data-precio")
      : "150"

  // Si no hay asesor seleccionado, mostrar mensaje de selección
  if (!asesorName) {
    appointmentDetailsContent.innerHTML = `
      <div class="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
        <p class="text-center">Seleccione un asesor, fecha y hora para ver los detalles de la asesoría</p>
      </div>
    `
    return
  }

  // Formatear la fecha si está seleccionada
  let fechaFormateada = "No seleccionada"
  let diaSemana = ""
  let diaMes = ""
  let mesAnio = ""

  if (selectedDate) {
    const dateObj = new Date(selectedDate)
    fechaFormateada = dateObj.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    // Obtener partes de la fecha para un formato más estético
    diaSemana = dateObj.toLocaleDateString("es-ES", { weekday: "long" })
    diaMes = dateObj.getDate()
    mesAnio = dateObj.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
  }

  // Actualizar el contenido con mejor diseño inspirado en la imagen de referencia
  appointmentDetailsContent.innerHTML = `
    <div class="bg-white rounded-lg">
      <h3 class="text-md font-semibold text-gray-800 mb-4 flex items-center">
        <svg class="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
        </svg>
        Detalles de Asesoría
      </h3>
      
      <div class="mb-4">
        <div class="flex items-center mb-2">
          <svg class="w-5 h-5 mr-2 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
          <div>
            <p class="text-sm font-medium">Asesor: ${asesorName || "No seleccionado"}</p>
            <p class="text-xs text-gray-500">${asesorEspecialidad}</p>
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div class="bg-gray-50 p-3 rounded-lg">
          <div class="flex items-center mb-1">
            <svg class="w-4 h-4 mr-1 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <span class="text-xs font-medium text-gray-600">Tipo:</span>
          </div>
          <p class="text-sm ml-5">${tipoAsesoria.split(" - ")[0] || "No seleccionado"}</p>
        </div>
        
        <div class="bg-gray-50 p-3 rounded-lg">
          <div class="flex items-center mb-1">
            <svg class="w-4 h-4 mr-1 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            <span class="text-xs font-medium text-gray-600">Precio:</span>
          </div>
          <p class="text-sm ml-5 font-medium text-primary-600">$${precioAsesoria} USD</p>
        </div>
        
        <div class="bg-gray-50 p-3 rounded-lg">
          <div class="flex items-center mb-1">
            <svg class="w-4 h-4 mr-1 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <span class="text-xs font-medium text-gray-600">Fecha:</span>
          </div>
          <p class="text-sm ml-5">${selectedDate ? `${diaSemana}, ${diaMes} de ${mesAnio}` : "No seleccionada"}</p>
        </div>
        
        <div class="bg-gray-50 p-3 rounded-lg">
          <div class="flex items-center mb-1">
            <svg class="w-4 h-4 mr-1 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="text-xs font-medium text-gray-600">Hora:</span>
          </div>
          <p class="text-sm ml-5">${selectedTime || "No seleccionada"}</p>
        </div>
        
        <div class="bg-gray-50 p-3 rounded-lg">
          <div class="flex items-center mb-1">
            <svg class="w-4 h-4 mr-1 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path>
            </svg>
            <span class="text-xs font-medium text-gray-600">Documento:</span>
          </div>
          <p class="text-sm ml-5">${tipoDocumento} ${numeroDocumento}</p>
        </div>
        
        <div class="bg-gray-50 p-3 rounded-lg">
          <div class="flex items-center mb-1">
            <svg class="w-4 h-4 mr-1 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
            </svg>
            <span class="text-xs font-medium text-gray-600">Modalidad:</span>
          </div>
          <p class="text-sm ml-5">${lugar}</p>
        </div>
      </div>
      
      <div class="bg-gray-50 p-3 rounded-lg mb-4">
        <div class="flex items-center mb-1">
          <svg class="w-4 h-4 mr-1 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path>
          </svg>
          <span class="text-xs font-medium text-gray-600">Descripción:</span>
        </div>
        <p class="text-sm ml-5">${descripcion || "Sin descripción"}</p>
      </div>
      
      ${
        selectedDate && selectedTime
          ? `
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start">
        <svg class="w-5 h-5 mr-2 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        <div>
          <p class="text-sm text-yellow-700 font-medium">Esta reserva es temporal.</p>
          <p class="text-xs text-yellow-600">Tendrás 5 minutos para completar el pago una vez solicites la asesoría.</p>
        </div>
      </div>
      `
          : ""
      }
    </div>
  `
}

// Función para iniciar el temporizador de pago después de solicitar la asesoría
function startPaymentTimerAfterRequest(asesoriaId) {
  // Iniciar el temporizador de pago (5 minutos)
  paymentTimeLeft = 300 // 5 minutos en segundos

  // Crear un elemento para mostrar el temporizador en la lista de asesorías
  const statusCell = document.querySelector(`tr[data-asesoria-id="${asesoriaId}"] td:nth-child(5)`)
  if (statusCell) {
    // Crear el elemento del temporizador
    const timerElement = document.createElement("div")
    timerElement.id = `payment-timer-${asesoriaId}`
    timerElement.className = "mt-2 flex items-center justify-center"
    timerElement.innerHTML = `
      <div class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
        <svg class="w-3.5 h-3.5 mr-1 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span id="timer-value-${asesoriaId}" class="font-mono">05:00</span>
      </div>
    `

    // Agregar el temporizador al estado
    statusCell.appendChild(timerElement)

    // Iniciar el intervalo para actualizar el temporizador cada segundo
    paymentTimer = setInterval(() => {
      paymentTimeLeft--

      // Actualizar la visualización del temporizador
      updatePaymentTimerInList(asesoriaId)

      // Si el tiempo se agota, cancelar la reserva
      if (paymentTimeLeft <= 0) {
        clearInterval(paymentTimer)
        paymentTimer = null

        // Cancelar la reserva temporal
        cancelTemporaryReservation()

        // Mostrar mensaje de tiempo agotado
        showNotification("El tiempo para realizar el pago ha expirado. Por favor, seleccione otro horario.", "warning")

        // Eliminar el temporizador de la lista
        const timerElement = document.getElementById(`payment-timer-${asesoriaId}`)
        if (timerElement) {
          timerElement.remove()
        }

        // Actualizar el estado a "Vencida"
        if (statusCell) {
          statusCell.innerHTML = `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-600">Vencida</span>`
        }
      }
    }, 1000)
  }
}

// Función para actualizar el temporizador en la lista de asesorías
function updatePaymentTimerInList(asesoriaId) {
  const timerValueElement = document.getElementById(`timer-value-${asesoriaId}`)
  if (!timerValueElement) return

  // Calcular minutos y segundos
  const minutes = Math.floor(paymentTimeLeft / 60)
  const seconds = paymentTimeLeft % 60

  // Formatear el tiempo
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`

  // Actualizar el elemento
  timerValueElement.textContent = formattedTime

  // Cambiar el color según el tiempo restante
  const timerContainer = document.getElementById(`payment-timer-${asesoriaId}`)
  if (timerContainer) {
    if (paymentTimeLeft <= 60) {
      // Último minuto
      timerContainer.innerHTML = `
        <div class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
          <svg class="w-3.5 h-3.5 mr-1 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span id="timer-value-${asesoriaId}" class="font-mono">${formattedTime}</span>
        </div>
      `
    } else if (paymentTimeLeft <= 120) {
      // Últimos 2 minutos
      timerContainer.innerHTML = `
        <div class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
          <svg class="w-3.5 h-3.5 mr-1 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span id="timer-value-${asesoriaId}" class="font-mono">${formattedTime}</span>
        </div>
      `
    }
  }
}

// Actualizar la visualización del temporizador de pago
function updatePaymentTimerDisplay() {
  const timerElement = document.getElementById("payment-timer")
  if (!timerElement) return

  // Calcular minutos y segundos
  const minutes = Math.floor(paymentTimeLeft / 60)
  const seconds = paymentTimeLeft % 60

  // Formatear el tiempo
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`

  // Actualizar el elemento
  timerElement.textContent = formattedTime

  // Cambiar el color según el tiempo restante
  if (paymentTimeLeft <= 60) {
    // Último minuto
    timerElement.classList.remove("text-green-600", "text-yellow-600")
    timerElement.classList.add("text-red-600")
  } else if (paymentTimeLeft <= 120) {
    // Últimos 2 minutos
    timerElement.classList.remove("text-green-600", "text-red-600")
    timerElement.classList.add("text-yellow-600")
  } else {
    timerElement.classList.remove("text-yellow-600", "text-red-600")
    timerElement.classList.add("text-green-600")
  }
}

// Función para crear una reserva temporal
function createTemporaryReservation() {
  // Implementa la lógica para crear una reserva temporal aquí
  console.log("createTemporaryReservation function called")
}

// Función para cancelar una reserva temporal
function cancelTemporaryReservation() {
  // Implementa la lógica para cancelar una reserva temporal aquí
  console.log("cancelTemporaryReservation function called")
}

// ==================== FUNCIONES DE LA INTERFAZ DE USUARIO ====================

// Agregar estilos CSS personalizados para las animaciones mejoradas
const styleElement = document.createElement("style")
styleElement.textContent = `
  @keyframes pulse-scale {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  
  @keyframes fade-in-scale {
    0% { opacity: 0; transform: scale(0.95) translateY(10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  
  @keyframes slide-in {
    0% { transform: translateX(20px); opacity: 0; }
    100% { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes bounce-in {
    0% { transform: scale(0.8); opacity: 0; }
    70% { transform: scale(1.05); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  
  .animate-pulse-scale {
    animation: pulse-scale 0.5s ease-in-out;
  }
  
  .animate-fade-in {
    animation: fade-in-scale 0.4s ease-out forwards;
  }
  
  .animate-slide-in {
    animation: slide-in 0.5s ease-out forwards;
  }
  
  .animate-bounce-in {
    animation: bounce-in 0.5s ease-out forwards;
  }
  
  .scale-110 {
    transform: scale(1.1);
  }
`
document.head.appendChild(styleElement)

// Inicializar numeración de asesorías
document.addEventListener("DOMContentLoaded", () => {
  ordenarYNumerarAsesorias()

  // Agregar event listeners para los filtros
  const searchInput = document.getElementById("search-input")
  const statusFilter = document.getElementById("filter-status")
  const dateFilter = document.getElementById("filter-date")

  if (searchInput) searchInput.addEventListener("input", filterAsesorias)
  if (statusFilter) statusFilter.addEventListener("change", filterAsesorias)
  if (dateFilter) dateFilter.addEventListener("change", filterAsesorias)

  // Event listener para el input de chat
  const chatInput = document.getElementById("chat-input")
  if (chatInput) {
    chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault()
        enviarMensaje()
      }
    })
  }

  // Mejorar la animación de los botones de pago
  document.querySelectorAll(".pago-btn, .pagado-btn").forEach((btn) => {
    // Mejorar la animación al pasar el mouse
    btn.addEventListener("mouseenter", function () {
      const span = this.querySelector("span")
      if (span) {
        span.style.transition = "transform 1.2s ease-in-out"
        span.style.transform = "translateX(-100%) rotate(12deg)"
      }

      // Añadir un efecto de pulso suave
      this.classList.add("animate-pulse-slow")
    })

    btn.addEventListener("mouseleave", function () {
      const span = this.querySelector("span")
      if (span) {
        span.style.transition = "transform 0.8s ease-in-out"
        span.style.transform = "translateX(0) rotate(12deg)"
      }

      // Quitar el efecto de pulso
      this.classList.remove("animate-pulse-slow")
    })
  })

  // Agregar event listener para el formulario de edición
  const editForm = document.getElementById("editForm")
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault()

      // Recopilar los datos del formulario
      const formData = new FormData(editForm)
      const formDataObj = {}
      formData.forEach((value, key) => {
        formDataObj[key] = value
      })

      try {
        // Enviar los datos al servidor
        const response = await fetch("/editar_asesoria", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formDataObj),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Error al actualizar la asesoría")
        }

        // Mostrar notificación de éxito
        showNotification("Asesoría actualizada exitosamente", "success")

        // Cerrar el modal
        closeEditAdvisoryModal()

        // Recargar la página para mostrar los cambios
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } catch (error) {
        console.error("Error al actualizar la asesoría:", error)
        showNotification("Error al actualizar la asesoría: " + error.message, "error")
      }
    })
  }

  // Añadir event listener para actualizar el precio cuando cambie el tipo de asesoría
  const tipoAsesoriaSelect = document.getElementById("tipo_asesoria")
  if (tipoAsesoriaSelect) {
    tipoAsesoriaSelect.addEventListener("change", updateAppointmentPrice)
  }

  // Añadir event listeners para actualizar los detalles en tiempo real
  const formInputs = document.querySelectorAll("#advisoryForm input, #advisoryForm select, #advisoryForm textarea")
  formInputs.forEach((input) => {
    input.addEventListener("change", updateAppointmentDetails)
    if (input.tagName === "INPUT" || input.tagName === "TEXTAREA") {
      input.addEventListener("keyup", updateAppointmentDetails)
    }
  })
})

// Función para abrir el modal de nueva asesoría
function openNewAdvisoryModal() {
  const modal = document.getElementById("newAdvisoryModal")
  if (!modal) return

  // Mostrar el modal con animación
  modal.classList.remove("hidden")
  modal.classList.add("flex")

  // Cargar los asesores disponibles
  loadAsesores()

  // Inicializar el calendario inmediatamente
  console.log("Inicializando calendario...")

  // Asegurarse de que el contenedor del calendario esté visible
  const calendarContainer = document.getElementById("calendar-container")
  if (calendarContainer) {
    calendarContainer.style.display = "block"
  }

  // Inicializar el calendario con un pequeño retraso para asegurar que el DOM esté listo
  setTimeout(() => {
    try {
      initializeCalendar()
      console.log("Calendario inicializado")
    } catch (error) {
      console.error("Error al inicializar el calendario:", error)
    }

    // Inicializar los detalles de la asesoría
    const appointmentDetailsContent = document.getElementById("appointment-details-content")
    if (appointmentDetailsContent) {
      appointmentDetailsContent.innerHTML = `
        <div class="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
          <p class="text-center">Seleccione un asesor, fecha y hora para ver los detalles de la asesoría</p>
        </div>
      `
    }
  }, 100)
}

// Función para cerrar el modal de nueva asesoría
function closeNewAdvisoryModal() {
  const modal = document.getElementById("newAdvisoryModal")
  if (!modal) return

  modal.classList.remove("flex")
  modal.classList.add("hidden")

  // Resetear selecciones
  selectedAsesorId = null
  selectedAsesorName = null
  selectedAsesorEspecialidad = null
  selectedDate = null
  selectedTime = null

  const selectedDateInput = document.getElementById("selected_date")
  const selectedAsesorIdInput = document.getElementById("selected_asesor_id")
  const selectedAsesorNameInput = document.getElementById("selected_asesor_name")
  const selectedAsesorEspecialidadInput = document.getElementById("selected_asesor_especialidad")
  const asesorSelector = document.getElementById("asesor_selector")
  const submitBtn = document.getElementById("submitAdvisoryBtn")

  if (selectedDateInput) selectedDateInput.value = ""
  if (selectedAsesorIdInput) selectedAsesorIdInput.value = ""
  if (selectedAsesorNameInput) selectedAsesorNameInput.value = ""
  if (selectedAsesorEspecialidadInput) selectedAsesorEspecialidadInput.value = ""
  if (asesorSelector) asesorSelector.value = ""
  if (submitBtn) {
    submitBtn.disabled = true
    submitBtn.classList.add("opacity-50")
  }

  // Limpiar los horarios disponibles
  const timeSlotsContainer = document.getElementById("time-slots-container")
  if (timeSlotsContainer) {
    timeSlotsContainer.innerHTML = ""
  }

  // Limpiar los detalles de la asesoría
  const appointmentDetailsContent = document.getElementById("appointment-details-content")
  if (appointmentDetailsContent) {
    appointmentDetailsContent.innerHTML = `
      <div class="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
        <p class="text-center">Seleccione un asesor, fecha y hora para ver los detalles de la asesoría</p>
      </div>
    `
  }

  // Cancelar cualquier reserva temporal
  if (reservationId) {
    cancelTemporaryReservation()
  }

  // Detener cualquier temporizador de pago
  if (paymentTimer) {
    clearInterval(paymentTimer)
    paymentTimer = null
  }
}

// Función para cargar los asesores disponibles
async function loadAsesores() {
  const asesorSelector = document.getElementById("asesor_selector")
  if (!asesorSelector) return

  try {
    // Limpiar opciones existentes excepto la primera
    while (asesorSelector.options.length > 1) {
      asesorSelector.remove(1)
    }

    // Mostrar indicador de carga
    asesorSelector.innerHTML = '<option value="">Cargando asesores...</option>'

    // Obtener asesores del servidor
    const response = await fetch("/obtener_asesores")
    if (!response.ok) {
      throw new Error("Error al cargar asesores")
    }

    const data = await response.json()

    // Limpiar opciones existentes
    asesorSelector.innerHTML = '<option value="">Seleccione un asesor</option>'

    // Agregar opciones para cada asesor
    if (data.asesores && data.asesores.length > 0) {
      data.asesores.forEach((asesor) => {
        const option = document.createElement("option")
        option.value = asesor.id_asesor
        option.setAttribute("data-name", `${asesor.nombre} ${asesor.apellidos}`)
        option.setAttribute("data-especialidad", asesor.especialidad)
        option.textContent = `${asesor.nombre} ${asesor.apellidos} - ${asesor.especialidad}`
        asesorSelector.appendChild(option)
      })
    }

    // Agregar event listener para el selector de asesor
    asesorSelector.addEventListener("change", function () {
      selectedAsesorId = this.value
      selectedAsesorName = this.options[this.selectedIndex].getAttribute("data-name")
      selectedAsesorEspecialidad = this.options[this.selectedIndex].getAttribute("data-especialidad")

      if (selectedAsesorId) {
        // Guardar el asesor seleccionado
        const selectedAsesorIdInput = document.getElementById("selected_asesor_id")
        const selectedAsesorNameInput = document.getElementById("selected_asesor_name")
        const selectedAsesorEspecialidadInput = document.getElementById("selected_asesor_especialidad")

        if (selectedAsesorIdInput) selectedAsesorIdInput.value = selectedAsesorId
        if (selectedAsesorNameInput) selectedAsesorNameInput.value = selectedAsesorName
        if (selectedAsesorEspecialidadInput) selectedAsesorEspecialidadInput.value = selectedAsesorEspecialidad

        // Si ya hay una fecha seleccionada, cargar los horarios disponibles
        if (selectedDate) {
          loadAvailableTimeSlots(selectedDate)
        }

        // Actualizar los detalles de la asesoría
        updateAppointmentDetails()

        // Habilitar el botón si se ha seleccionado fecha y hora
        checkFormCompletion()
      }
    })
  } catch (error) {
    console.error("Error al cargar asesores:", error)
    asesorSelector.innerHTML = '<option value="">Error al cargar asesores</option>'
  }
}

// Verificar si el formulario está completo
function checkFormCompletion() {
  const submitButton = document.getElementById("submitAdvisoryBtn")

  if (!submitButton) return

  if (selectedAsesorId && selectedDate) {
    submitButton.disabled = false
    submitButton.classList.remove("opacity-50")
  } else {
    submitButton.disabled = true
    submitButton.classList.add("opacity-50")
  }
}

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

// Modificar la función para el envío del formulario
const advisoryFormSubmit = (event) => {
  if (event) {
    event.preventDefault()
  }

  const form = document.getElementById("advisoryForm")
  if (!form) return

  // Recopilar los datos del formulario
  const formData = new FormData(form)
  const formDataObj = {}
  formData.forEach((value, key) => {
    formDataObj[key] = value
  })

  // Mostrar el contenedor del temporizador antes de enviar la solicitud
  const timerContainer = document.getElementById("payment-timer-container")
  if (timerContainer) {
    timerContainer.classList.remove("hidden")
  }

  // Enviar la solicitud al servidor
  fetch("/nueva_asesoria", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formDataObj),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.error || "Error al solicitar la asesoría")
        })
      }
      return response.json()
    })
    .then((data) => {
      // Mostrar notificación de éxito
      showNotification(data.message || "Asesoría solicitada con éxito", "success")

      // Iniciar el temporizador de pago después de solicitar la asesoría
      startPaymentTimerAfterRequest(data.codigo_asesoria)

      // Cerrar el modal
      closeNewAdvisoryModal()

      // Recargar la página para mostrar la nueva asesoría
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    })
    .catch((error) => {
      console.error("Error al solicitar la asesoría:", error)
      showNotification(error.message, "error")

      // Ocultar el contenedor del temporizador en caso de error
      if (timerContainer) {
        timerContainer.classList.add("hidden")
      }
    })
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

// Función para manejar el cambio de fecha en el calendario
function handleDateChange(date) {
  selectedDate = date

  // Guardar la fecha seleccionada
  const selectedDateInput = document.getElementById("selected_date")
  if (selectedDateInput) selectedDateInput.value = date

  // Cargar los horarios disponibles para la fecha seleccionada
  loadAvailableTimeSlots(date)

  // Actualizar los detalles de la asesoría
  updateAppointmentDetails()

  // Habilitar el botón si se ha seleccionado fecha y hora
  checkFormCompletion()
}

// Exportar funciones para uso global
window.formatDate = formatDate
window.isAsesoriaVigente = isAsesoriaVigente
window.getRandomColor = getRandomColor
window.generateAvatar = generateAvatar
window.showNotification = showNotification
window.initializeCalendar = initializeCalendar
window.selectDate = selectDate
window.selectTimeSlot = selectTimeSlot
window.createTemporaryReservation = createTemporaryReservation
window.cancelTemporaryReservation = cancelTemporaryReservation
window.openNewAdvisoryModal = openNewAdvisoryModal
window.closeNewAdvisoryModal = closeNewAdvisoryModal
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
window.handleDateChange = handleDateChange
window.loadAvailableTimeSlots = loadAvailableTimeSlots
window.updateAppointmentDetails = updateAppointmentDetails
window.updateAppointmentPrice = updateAppointmentPrice
window.advisoryFormSubmit = advisoryFormSubmit

