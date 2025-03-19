// Variables globales para Stripe
let stripe
let elements
let paymentElement
let clientSecret

// Variables para el calendario
const currentDate = new Date()
let selectedDate = null
let selectedTime = null
let selectedAsesorId = null
let selectedAsesorName = null
let availableDates = {}

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

// Función para enumerar
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

// Exportar funciones para uso en otros archivos
window.formatDate = formatDate
window.isAsesoriaVigente = isAsesoriaVigente
window.getRandomColor = getRandomColor
window.generateAvatar = generateAvatar
window.showNotification = showNotification

// ==================== FUNCIONES DEL CALENDARIO ====================

// Inicializar el calendario
function initCalendar() {
  const calendarDays = document.getElementById("calendar-days")
  const currentMonthElement = document.getElementById("current-month")

  if (!calendarDays || !currentMonthElement) return

  renderCalendar()
  setupEventListeners()
}

// Renderizar el calendario
function renderCalendar() {
  const calendarDays = document.getElementById("calendar-days")
  const currentMonthElement = document.getElementById("current-month")

  if (!calendarDays || !currentMonthElement) return

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
  currentMonthElement.textContent = `${monthNames[currentMonth]} ${currentYear}`

  // Limpiar el calendario
  calendarDays.innerHTML = ""

  // Obtener el primer día del mes
  const firstDay = new Date(currentYear, currentMonth, 0)
  const startingDay = firstDay.getDay() // 0 = Domingo, 1 = Lunes, etc.

  // Obtener el número de días en el mes
  const lastDay = new Date(currentYear, currentMonth + 1, 0)
  const totalDays = lastDay.getDate()

  // Agregar celdas vacías para los días anteriores al primer día del mes
  for (let i = 0; i < startingDay; i++) {
    const emptyCell = document.createElement("div")
    emptyCell.className = "h-10 flex items-center justify-center text-sm text-gray-300"
    calendarDays.appendChild(emptyCell)
  }

  // Agregar los días del mes
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(currentYear, currentMonth, day)
    const dateString = formatDateString(date)
    const dayCell = document.createElement("div")

    // Verificar si la fecha es anterior a hoy
    const isPastDate = date < today
    // Verificar si es fin de semana (0 = Domingo, 6 = Sábado)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    // Verificar si hay disponibilidad para esta fecha
    const hasAvailability = checkAvailability(dateString)

    dayCell.className =
      "h-10 flex items-center justify-center text-sm rounded-lg transition-all duration-300 cursor-pointer"

    if (isPastDate || isWeekend || !hasAvailability) {
      // Fecha no disponible
      dayCell.className += " text-gray-300 bg-gray-50 cursor-not-allowed"
    } else {
      // Fecha disponible - Mejorado el estilo para diferenciar claramente
      dayCell.className +=
        " text-primary-600 bg-primary-50 hover:bg-primary-100 hover:text-primary-700 border border-transparent hover:border-primary-300 hover:shadow-sm"

      // Si es la fecha seleccionada
      if (selectedDate && dateString === formatDateString(selectedDate)) {
        dayCell.className += " bg-primary-200 text-primary-700 border border-primary-400 font-medium shadow-inner"
      }

      // Agregar evento click con animación
      dayCell.addEventListener("click", () => {
        // Agregar clase para animación
        dayCell.classList.add("scale-110", "bg-primary-300")

        // Quitar la animación después de completarse
        setTimeout(() => {
          dayCell.classList.remove("scale-110", "bg-primary-300")
          selectDate(date)
        }, 300)
      })
    }

    dayCell.textContent = day
    calendarDays.appendChild(dayCell)
  }
}

// Configurar event listeners
function setupEventListeners() {
  const prevMonthButton = document.getElementById("prev-month")
  const nextMonthButton = document.getElementById("next-month")
  const asesorSelector = document.getElementById("asesor_selector")
  const tipoAsesoriaSelect = document.getElementById("tipo_asesoria")

  if (prevMonthButton) {
    prevMonthButton.addEventListener("click", () => {
      currentMonth--
      if (currentMonth < 0) {
        currentMonth = 11
        currentYear--
      }
      renderCalendar()
    })
  }

  if (nextMonthButton) {
    nextMonthButton.addEventListener("click", () => {
      currentMonth++
      if (currentMonth > 11) {
        currentMonth = 0
        currentYear++
      }
      renderCalendar()
    })
  }

  if (asesorSelector) {
    asesorSelector.addEventListener("change", function () {
      selectedAsesorId = this.value
      selectedAsesorName = this.options[this.selectedIndex].getAttribute("data-name")

      if (selectedAsesorId) {
        // Guardar el asesor seleccionado
        const selectedAsesorIdInput = document.getElementById("selected_asesor_id")
        const selectedAsesorNameInput = document.getElementById("selected_asesor_name")

        if (selectedAsesorIdInput) selectedAsesorIdInput.value = selectedAsesorId
        if (selectedAsesorNameInput) selectedAsesorNameInput.value = selectedAsesorName

        // Cargar disponibilidad del asesor
        loadAsesorAvailability(selectedAsesorId)

        // Actualizar resumen
        updateSummary()

        // Habilitar el botón si se ha seleccionado fecha y hora
        checkFormCompletion()
      }
    })
  }

  if (tipoAsesoriaSelect) {
    tipoAsesoriaSelect.addEventListener("change", updateSummary)
  }
}

// Seleccionar una fecha
function selectDate(date) {
  selectedDate = date
  const dateString = formatDateString(date)

  // Actualizar la UI del calendario
  renderCalendar()

  // Mostrar selector de hora con animación mejorada
  showTimeSelector(dateString)

  // Actualizar resumen
  updateSummary()
}

// Añadir función para obtener horarios disponibles del servidor
async function obtenerHorariosDisponibles(asesorId, fecha) {
  if (!asesorId || !fecha) return []

  try {
    const response = await fetch(`/obtener_horarios_disponibles?id_asesor=${asesorId}&fecha=${fecha}`)

    if (!response.ok) {
      throw new Error("Error al obtener horarios disponibles")
    }

    const data = await response.json()
    return data.horarios || []
  } catch (error) {
    console.error("Error al obtener horarios disponibles:", error)
    return []
  }
}

// Modificar la función getAvailableHours para usar la API
async function getAvailableHoursFromAPI(dateString) {
  // Si no hay asesor seleccionado, devolver un array vacío
  if (!selectedAsesorId) return []

  // Verificar si tenemos horarios disponibles en caché
  if (window.cachedAvailableHours && window.cachedAvailableHours[dateString]) {
    return window.cachedAvailableHours[dateString]
  }

  // Obtener horarios disponibles del servidor
  const horarios = await obtenerHorariosDisponibles(selectedAsesorId, dateString)

  // Guardar en caché para futuras consultas
  if (!window.cachedAvailableHours) window.cachedAvailableHours = {}
  window.cachedAvailableHours[dateString] = horarios

  return horarios
}

// Modificar la función showTimeSelector para usar la API
async function showTimeSelector(dateString) {
  const timeSelector = document.getElementById("time-selector")
  const timeSlots = document.getElementById("time-slots")

  if (!timeSelector || !timeSlots) return

  // Limpiar slots de tiempo
  timeSlots.innerHTML = ""

  // Mostrar indicador de carga
  timeSlots.innerHTML = `
  <div class="col-span-3 flex items-center justify-center py-4">
    <div class="inline-block animate-spin h-6 w-6 border-4 border-primary-600 border-t-transparent rounded-full mr-2"></div>
    <p class="text-gray-500">Cargando horarios disponibles...</p>
  </div>
`

  // Ocultar primero para la animación
  timeSelector.style.opacity = "0"
  timeSelector.style.transform = "translateY(20px)"
  timeSelector.classList.remove("hidden")

  // Forzar reflow para que la animación funcione
  void timeSelector.offsetWidth

  // Mostrar con animación
  timeSelector.style.transition = "opacity 0.4s ease, transform 0.4s ease"
  timeSelector.style.opacity = "1"
  timeSelector.style.transform = "translateY(0)"

  // Obtener horarios disponibles para esta fecha
  try {
    const availableHours = await getAvailableHoursFromAPI(dateString)

    // Limpiar slots de tiempo nuevamente
    timeSlots.innerHTML = ""

    if (availableHours.length === 0) {
      timeSlots.innerHTML =
        '<p class="text-center text-gray-500 col-span-3">No hay horarios disponibles para esta fecha</p>'
    } else {
      // Crear botones para cada hora disponible
      availableHours.forEach((hour) => {
        const timeButton = document.createElement("button")
        timeButton.type = "button"
        timeButton.className =
          "py-2 px-3 text-sm font-medium rounded-lg transition-all duration-300 border border-gray-200 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 hover:shadow-sm"

        // Si es la hora seleccionada
        if (selectedTime === hour) {
          timeButton.className =
            "py-2 px-3 text-sm font-medium rounded-lg transition-all duration-300 bg-primary-200 text-primary-700 border border-primary-400 shadow-inner"
        }

        timeButton.textContent = formatHour(hour)

        // Agregar animación al hacer clic
        timeButton.addEventListener("click", () => {
          // Agregar clase para animación
          timeButton.classList.add("scale-110", "bg-primary-300")

          // Quitar la animación después de completarse
          setTimeout(() => {
            timeButton.classList.remove("scale-110", "bg-primary-300")
            selectTime(hour)
          }, 300)
        })

        timeSlots.appendChild(timeButton)
      })
    }
  } catch (error) {
    console.error("Error al cargar horarios:", error)
    timeSlots.innerHTML = `
    <p class="text-center text-red-500 col-span-3">
      Error al cargar horarios. 
      <button class="text-primary-600 underline" onclick="showTimeSelector('${dateString}')">
        Reintentar
      </button>
    </p>
  `
  }
}

// Seleccionar una hora
function selectTime(hour) {
  selectedTime = hour
  const timeSlots = document.getElementById("time-slots")
  const selectedDateInput = document.getElementById("selected_date")
  const appointmentSummary = document.getElementById("appointment-summary")
  const submitButton = document.getElementById("submitAdvisoryBtn")

  // Actualizar UI del selector de hora
  if (timeSlots) {
    const timeButtons = timeSlots.querySelectorAll("button")
    timeButtons.forEach((button) => {
      if (button.textContent === formatHour(hour)) {
        button.className =
          "py-2 px-3 text-sm font-medium rounded-lg transition-all duration-300 bg-primary-200 text-primary-700 border border-primary-400 shadow-inner"
      } else {
        button.className =
          "py-2 px-3 text-sm font-medium rounded-lg transition-all duration-300 border border-gray-200 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
      }
    })
  }

  // Actualizar el campo oculto con fecha y hora
  if (selectedDateInput && selectedDate) {
    const dateTime = new Date(selectedDate)
    const [hours, minutes] = hour.split(":")
    dateTime.setHours(Number.parseInt(hours), Number.parseInt(minutes), 0, 0)
    selectedDateInput.value = formatDateTimeForInput(dateTime)

    // Reservar temporalmente el horario
    reservarHorarioTemporal(selectedAsesorId, formatDateString(selectedDate), hour)
  }

  // Actualizar resumen
  updateSummary()

  // Mostrar resumen de la cita
  if (appointmentSummary) {
    // Ocultar primero para la animación
    appointmentSummary.style.opacity = "0"
    appointmentSummary.style.transform = "translateY(20px)"
    appointmentSummary.classList.remove("hidden")

    // Forzar reflow para que la animación funcione
    void appointmentSummary.offsetWidth

    // Mostrar con animación
    appointmentSummary.style.transition = "opacity 0.4s ease, transform 0.4s ease"
    appointmentSummary.style.opacity = "1"
    appointmentSummary.style.transform = "translateY(0)"
  }

  // Habilitar el botón si se ha seleccionado asesor, fecha y hora
  checkFormCompletion()
}

// Función para reservar temporalmente un horario
async function reservarHorarioTemporal(asesorId, fecha, hora) {
  if (!asesorId || !fecha || !hora) return

  try {
    const response = await fetch("/reservar_horario_temporal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id_asesor: asesorId,
        fecha: fecha,
        hora: hora,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Error al reservar horario temporal:", errorData.error)
      // No mostramos notificación para no interrumpir el flujo del usuario
    } else {
      console.log("Horario reservado temporalmente por 10 minutos")

      // Obtener el ID de reserva temporal para poder cancelarla si el usuario cambia de opinión
      const data = await response.json()
      if (data.reserva_id) {
        window.reservaTemporalId = data.reserva_id
      }
    }
  } catch (error) {
    console.error("Error al reservar horario temporal:", error)
  }
}

// Actualizar el resumen de la cita
function updateSummary() {
  const appointmentSummary = document.getElementById("appointment-summary")
  const summaryAsesor = document.getElementById("summary-asesor")
  const summaryDate = document.getElementById("summary-date")
  const summaryTime = document.getElementById("summary-time")
  const summaryType = document.getElementById("summary-type")
  const tipoAsesoriaSelect = document.getElementById("tipo_asesoria")

  if (!appointmentSummary) return

  // Actualizar asesor
  if (summaryAsesor && selectedAsesorName) {
    summaryAsesor.textContent = selectedAsesorName
  }

  // Actualizar fecha
  if (summaryDate && selectedDate) {
    summaryDate.textContent = formatDateForDisplay(selectedDate)
  }

  // Actualizar hora
  if (summaryTime && selectedTime) {
    summaryTime.textContent = formatHour(selectedTime)
  }

  // Actualizar tipo de asesoría
  if (summaryType && tipoAsesoriaSelect) {
    const selectedOption = tipoAsesoriaSelect.options[tipoAsesoriaSelect.selectedIndex]
    summaryType.textContent = selectedOption ? selectedOption.text : "-"
  }
}

// Verificar si el formulario está completo
function checkFormCompletion() {
  const submitButton = document.getElementById("submitAdvisoryBtn")

  if (!submitButton) return

  if (selectedAsesorId && selectedDate && selectedTime) {
    submitButton.disabled = false
    submitButton.classList.remove("opacity-50")
  } else {
    submitButton.disabled = true
    submitButton.classList.add("opacity-50")
  }
}

// Cargar disponibilidad del asesor
function loadAsesorAvailability(asesorId) {
  // Reiniciar selección de fecha y hora
  selectedDate = null
  selectedTime = null

  // Ocultar selector de hora y resumen
  const timeSelector = document.getElementById("time-selector")
  const appointmentSummary = document.getElementById("appointment-summary")

  if (timeSelector) timeSelector.classList.add("hidden")
  if (appointmentSummary) appointmentSummary.classList.add("hidden")

  // Limpiar caché de horarios disponibles
  window.cachedAvailableHours = {}

  // Simular disponibilidad para los próximos 30 días
  availableDates = {}
  const today = new Date()

  for (let i = 0; i < 30; i++) {
    const date = new Date()
    date.setDate(today.getDate() + i)

    // Verificar si el día de la semana es de lunes (1) a viernes (5)
    const dayOfWeek = date.getDay()
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const dateString = formatDateString(date)
      availableDates[dateString] = true
    }
  }

  // Actualizar el calendario
  renderCalendar()
}

// Verificar disponibilidad para una fecha
function checkAvailability(dateString) {
  // If no hay asesor seleccionado, no hay disponibilidad
  if (!selectedAsesorId) return false

  // Verificar si es fin de semana
  // Solo excluir domingos (0) y sábados (6)
  const date = new Date(dateString)
  const dayOfWeek = date.getDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) return false

  // Verificar si es una fecha pasada
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (date < today) return false

  // Si llegamos aquí, la fecha podría estar disponible
  // La disponibilidad real de horarios se verificará en getAvailableHoursFromAPI
  return availableDates[dateString] === true
}

// Función para obtener horas disponibles para una fecha
function getAvailableHours(dateString) {
  // Verificar si tenemos horarios disponibles en caché
  if (window.cachedAvailableHours && window.cachedAvailableHours[dateString]) {
    return window.cachedAvailableHours[dateString]
  }

  // Si no hay caché, hacer la petición al servidor (simulado por ahora)
  // En una implementación real, esto sería una llamada AJAX

  // Horario de 7am a 4pm con descanso de 1pm a 2pm
  const hours = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00"]

  // Simular algunas horas ya ocupadas
  const date = new Date(dateString)
  const dayOfWeek = date.getDay()

  // Diferentes patrones de disponibilidad según el día de la semana
  let availableHours = [...hours]

  // Simular algunas horas ocupadas según el día
  if (dayOfWeek === 1) {
    // Lunes
    availableHours = availableHours.filter((h) => h !== "09:00" && h !== "14:00")
  } else if (dayOfWeek === 2) {
    // Martes
    availableHours = availableHours.filter((h) => h !== "11:00" && h !== "15:00")
  } else if (dayOfWeek === 3) {
    // Miércoles
    availableHours = availableHours.filter((h) => h !== "10:00" && h !== "16:00")
  } else if (dayOfWeek === 4) {
    // Jueves
    availableHours = availableHours.filter((h) => h !== "08:00" && h !== "12:00")
  } else if (dayOfWeek === 5) {
    // Viernes
    availableHours = availableHours.filter((h) => h !== "07:00" && h !== "15:00")
  }

  // En una implementación real, aquí se consultaría al servidor por los horarios disponibles
  // fetch(`/obtener_horarios_disponibles?fecha=${dateString}&id_asesor=${selectedAsesorId}`)
  //   .then(response => response.json())
  //   .then(data => {
  //     // Guardar en caché
  //     if (!window.cachedAvailableHours) window.cachedAvailableHours = {};
  //     window.cachedAvailableHours[dateString] = data.horarios;
  //     return data.horarios;
  //   });

  // Guardar en caché para futuras consultas
  if (!window.cachedAvailableHours) window.cachedAvailableHours = {}
  window.cachedAvailableHours[dateString] = availableHours

  return availableHours
}

// Formatear fecha para mostrar
function formatDateForDisplay(date) {
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  return date.toLocaleDateString("es-ES", options)
}

// Formatear hora para mostrar
function formatHour(hourString) {
  const [hours, minutes] = hourString.split(":")
  return `${hours}:${minutes}`
}

// Formatear fecha como string YYYY-MM-DD
function formatDateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Formatear fecha y hora para input datetime-local
function formatDateTimeForInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// Función para formatear fecha y hora para mostrar en el listado
function formatDateTimeForDisplay(date) {
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
  return date.toLocaleDateString("es-ES", options)
}

// Función para procesar el formulario de nueva asesoría
document.addEventListener("DOMContentLoaded", () => {
  const advisoryForm = document.getElementById("advisoryForm")
  if (advisoryForm) {
    advisoryForm.addEventListener("submit", async (e) => {
      e.preventDefault() // Prevenir el envío normal del formulario

      // Asegurarse de que la fecha y hora seleccionadas se guarden correctamente
      const selectedDateInput = document.getElementById("selected_date")
      if (selectedDateInput && selectedDate && selectedTime) {
        const dateTime = new Date(selectedDate)
        const [hours, minutes] = selectedTime.split(":")
        dateTime.setHours(Number.parseInt(hours), Number.parseInt(minutes), 0, 0)
        selectedDateInput.value = formatDateTimeForInput(dateTime)
      }

      // Recopilar los datos del formulario
      const formData = new FormData(advisoryForm)
      const formDataObj = {}
      formData.forEach((value, key) => {
        formDataObj[key] = value
      })

      try {
        // Enviar los datos al servidor
        const response = await fetch("/nueva_asesoria", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formDataObj),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Error al crear la asesoría")
        }

        const data = await response.json()

        // Mostrar notificación de éxito
        showNotification("Asesoría creada exitosamente. Tienes 10 minutos para realizar el pago.", "success")

        // Cerrar el modal
        closeNewAdvisoryModal()

        // Redirigir a la página de pago o actualizar la lista de asesorías
        if (data.codigo_asesoria) {
          // Opción 1: Abrir modal de pago directamente
          abrirModalPago(data.codigo_asesoria, formDataObj.tipo_asesoria)

          // Opción 2: Recargar la página para mostrar la nueva asesoría
          // setTimeout(() => {
          //   window.location.reload();
          // }, 1500);
        } else {
          // Recargar la página para mostrar la nueva asesoría
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        }
      } catch (error) {
        console.error("Error al crear la asesoría:", error)
        showNotification("Error al crear la asesoría: " + error.message, "error")
      }
    })
  }

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
  
  /* Mejorar transiciones para elementos del calendario */
  #calendar-days > div {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  #calendar-days > div:hover {
    transform: translateY(-2px);
  }
  
  /* Mejorar transiciones para botones de hora */
  #time-slots button {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  #time-slots button:hover {
    transform: translateY(-2px);
  }
`
  document.head.appendChild(styleElement)

  // Inicializar numeración de asesorías
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
        closeEditAdvisoryModalFunc()

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
})

// Modificar la función para cerrar el modal de nueva asesoría
function closeNewAdvisoryModal() {
  const modal = document.getElementById("newAdvisoryModal")
  if (!modal) return

  // Cancelar la reserva temporal si existe
  if (window.reservaTemporalId) {
    cancelarReservaTemporal(window.reservaTemporalId)
    window.reservaTemporalId = null
  }

  modal.classList.remove("flex")
  modal.classList.add("hidden")

  // Resetear selecciones
  selectedDate = null
  selectedTime = null
  selectedAsesorId = null
  selectedAsesorName = null

  const selectedDateInput = document.getElementById("selected_date")
  const selectedAsesorIdInput = document.getElementById("selected_asesor_id")
  const selectedAsesorNameInput = document.getElementById("selected_asesor_name")
  const asesorSelector = document.getElementById("asesor_selector")
  const submitBtn = document.getElementById("submitAdvisoryBtn")
  const timeSelector = document.getElementById("time-selector")
  const appointmentSummary = document.getElementById("appointment-summary")

  if (selectedDateInput) selectedDateInput.value = ""
  if (selectedAsesorIdInput) selectedAsesorIdInput.value = ""
  if (selectedAsesorNameInput) selectedAsesorNameInput.value = ""
  if (asesorSelector) asesorSelector.value = ""
  if (submitBtn) {
    submitBtn.disabled = true
    submitBtn.classList.add("opacity-50")
  }

  // Ocultar selector de hora y resumen
  if (timeSelector) timeSelector.classList.add("hidden")
  if (appointmentSummary) appointmentSummary.classList.add("hidden")
}

// Función para cancelar una reserva temporal
async function cancelarReservaTemporal(reservaId) {
  if (!reservaId) return

  try {
    const response = await fetch("/cancelar_reserva_temporal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reserva_id: reservaId,
      }),
    })

    if (!response.ok) {
      console.error("Error al cancelar reserva temporal")
    } else {
      console.log("Reserva temporal cancelada correctamente")
    }
  } catch (error) {
    console.error("Error al cancelar reserva temporal:", error)
  }
}

// Modificar la función para procesar el pago y actualizar la UI
async function procesarPago(id) {
  try {
    const montoInput = document.getElementById("monto")
    const monto = montoInput ? Number.parseFloat(montoInput.value) : 0

    // Obtener la fecha y hora seleccionada
    const selectedDateInput = document.getElementById("selected_date")
    const selectedDate = selectedDateInput ? selectedDateInput.value : null
    const selectedAsesorId = document.getElementById("selected_asesor_id")?.value

    // Enviar solicitud al servidor para registrar el pago
    const response = await fetch("/procesar_pago", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        codigo_asesoria: id,
        monto: monto,
        metodo_pago: "Tarjeta de Crédito (Stripe)",
        datos_adicionales: {
          payment_intent: clientSecret ? clientSecret.split("_secret_")[0] : null,
        },
        fecha_asesoria: selectedDate,
        id_asesor: selectedAsesorId,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al registrar el pago en el servidor")
    }

    // Buscar el botón de pago correspondiente
    const row = document.querySelector(`tr[data-asesoria-id="${id}"]`)
    if (row) {
      const pagoBtn = row.querySelector(".pago-btn")
      if (pagoBtn) {
        // Cambiar el estilo y texto del botón
        pagoBtn.classList.remove(
          "bg-gradient-to-r",
          "from-green-600",
          "to-green-500",
          "hover:from-green-500",
          "hover:to-green-600",
          "to-green-500",
          "hover:from-green-500",
          "hover:to-green-600",
          "hover:shadow-green-500/30",
        )
        pagoBtn.classList.add(
          "bg-gradient-to-r",
          "from-blue-600",
          "to-blue-500",
          "hover:from-blue-500",
          "hover:to-blue-600",
          "hover:shadow-blue-500/30",
        )

        // Actualizar el contenido del botón
        pagoBtn.innerHTML = `
                  <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
                  <div class="relative flex items-center justify-center">
                      <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                      <span>Pagado</span>
                  </div>
              `

        // Deshabilitar el botón
        pagoBtn.onclick = null
        pagoBtn.style.cursor = "default"
        pagoBtn.classList.remove("pago-btn")

        // Actualizar el estado de la asesoría
        row.setAttribute("data-pago-estado", "Pagada")

        // Actualizar el estado en la tabla
        const estadoCell = row.querySelector("td:nth-child(5)")
        if (estadoCell) {
          estadoCell.innerHTML = `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-600">En Proceso Activo</span>`
        }

        // Actualizar el ícono de verificación en los detalles
        const detailsRow = document.getElementById(`details-${id}`)
        if (detailsRow) {
          // Buscar todos los párrafos en los detalles
          const paragraphs = detailsRow.querySelectorAll("p")

          // Buscar el párrafo que contiene "Precio:"
          for (const p of paragraphs) {
            if (p.textContent.includes("Precio:")) {
              const spanElement = p.querySelector("span:last-child")
              if (spanElement && !spanElement.querySelector("svg")) {
                spanElement.innerHTML = `
                $${monto.toFixed(2)} USD
                <svg class="w-4 h-4 ml-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              `
              }
              break
            }
          }

          // Actualizar el estado en los detalles
          for (const p of paragraphs) {
            if (p.textContent.includes("Estado:")) {
              const spanElement = p.querySelector("span:last-child")
              if (spanElement) {
                spanElement.className = "text-blue-600"
                spanElement.textContent = "En Proceso Activo"
              }
              break
            }
          }
        }

        // Ocultar el botón de cancelar
        const cancelarBtn = row.querySelector('button[title="Cancelar"]')
        if (cancelarBtn) {
          cancelarBtn.style.display = "none"
        }
      }
    }

    // Mostrar notificación de éxito
    showNotification("Pago procesado exitosamente", "success")

    // Cerrar el modal de pago
    closePagoModal()
  } catch (error) {
    console.error("Error al procesar el pago:", error)
    showNotification("Error al procesar el pago: " + error.message, "error")
  }
}

// Variables globales para el calendario
let currentMonth = new Date().getMonth()
let currentYear = new Date().getFullYear()

// Declaración de funciones faltantes
let openNewAdvisoryModal = () => {}
let filterAsesorias = () => {}
function enviarMensaje() {}
const closePagoModal = () => {}
let editAsesoriaFunc = () => {}
let closeEditAdvisoryModalFunc = () => {}
let toggleDetails = () => {}
function resetFilters() {}
let verHistorialChatFunc = () => {}
const closeChatHistorialModal = () => {}
function cancelarAsesoriaModal() {}
function closeCancelarAsesoriaModalFunc() {}
function reiniciarPasarelaPago() {}

// Exportar funciones para uso global
window.openNewAdvisoryModal = openNewAdvisoryModal
window.closeNewAdvisoryModal = closeNewAdvisoryModal
window.editAsesoria = editAsesoriaFunc
window.closeEditAdvisoryModal = closeEditAdvisoryModalFunc
window.toggleDetails = toggleDetails
window.resetFilters = resetFilters
window.verHistorialChat = verHistorialChatFunc
window.closeChatHistorialModal = closeChatHistorialModal
window.enviarMensaje = enviarMensaje
window.abrirModalPago = abrirModalPago
window.closePagoModal = closePagoModal
window.cancelarAsesoria = cancelarAsesoriaModal
window.closeCancelarAsesoriaModal = closeCancelarAsesoriaModalFunc
window.reiniciarPasarelaPago = reiniciarPasarelaPago
window.showTimeSelector = showTimeSelector

// Modificar la función para abrir el modal de nueva asesoría
openNewAdvisoryModal = () => {
  const modal = document.getElementById("newAdvisoryModal")
  if (!modal) return

  // Mostrar el modal con animación
  modal.classList.remove("hidden")
  modal.classList.add("flex")

  // Cargar los asesores disponibles
  loadAsesores()

  // Inicializar el calendario
  initCalendar()
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
        option.textContent = `${asesor.nombre} ${asesor.apellidos} - ${asesor.especialidad}`
        asesorSelector.appendChild(option)
      })
    }
  } catch (error) {
    console.error("Error al cargar asesores:", error)
    asesorSelector.innerHTML = '<option value="">Error al cargar asesores</option>'
  }
}

// Función para filtrar asesorías
filterAsesorias = () => {
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
toggleDetails = (asesoriaId) => {
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
editAsesoriaFunc = (asesoriaId) => {
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
closeEditAdvisoryModalFunc = () => {
  const modal = document.getElementById("editAdvisoryModal")
  if (!modal) return

  modal.classList.remove("flex")
  modal.classList.add("hidden")
}

// Agregar event listener para el formulario de edición
document.addEventListener("DOMContentLoaded", () => {
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
        closeEditAdvisoryModalFunc()

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
})

// Función para ver historial de chat
verHistorialChatFunc = (asesoriaId) => {
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
closeChatHistorialModalFunc = () => {
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

// Función para procesar el pago de una asesoría
function abrirModalPago(asesoriaId, tipoAsesoria) {
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

  // Inicializar Stripe (simulado)
  reiniciarPasarelaPago()
}

// Función para cerrar el modal de pago
function closePagoModalFunc() {
  const modal = document.getElementById("pagoModal")
  if (!modal) return

  modal.classList.remove("flex")
  modal.classList.add("hidden")
}

// Modificar la función para reiniciar la pasarela de pago con Stripe
function reiniciarPasarelaPago() {
  // Obtener la clave pública de Stripe del meta tag
  const stripePublicKey = document.querySelector('meta[name="stripe-public-key"]').content

  // Inicializar Stripe con la clave pública
  stripe = Stripe(stripePublicKey)

  const asesoriaId = document.getElementById("pago_codigo_asesoria").value
  const monto = document.getElementById("monto").value

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

// Add the cancelarAsesoria function to delete the appointment
function cancelarAsesoriaModal(asesoriaId) {
  const modal = document.getElementById("cancelarAsesoriaModal")
  if (!modal) return

  // Show the modal
  modal.classList.remove("hidden")
  modal.classList.add("flex")

  // Set the confirmation button's action
  const confirmBtn = document.getElementById("confirmarCancelarBtn")
  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      try {
        // Send request to delete the appointment
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

        // Show success notification
        showNotification("Asesoría cancelada exitosamente", "success")

        // Close the modal
        closeCancelarAsesoriaModalFunc()

        // Remove the appointment from the DOM
        const row = document.querySelector(`tr[data-asesoria-id="${asesoriaId}"]`)
        if (row) {
          row.remove()
        }

        // Also remove the details row if it exists
        const detailsRow = document.getElementById(`details-${asesoriaId}`)
        if (detailsRow) {
          detailsRow.remove()
        }

        // Check if there are no more appointments and show the no results message
        const visibleRows = document.querySelectorAll("#asesorias-table-body tr[data-asesoria-id]:not(.hidden)")
        if (visibleRows.length === 0) {
          const noResults = document.getElementById("no-results")
          if (noResults) {
            noResults.classList.remove("hidden")
          }
        }

        // Re-number the remaining appointments
        ordenarYNumerarAsesorias()
      } catch (error) {
        console.error("Error al cancelar la asesoría:", error)
        showNotification("Error al cancelar la asesoría: " + error.message, "error")
      }
    }
  }
}

// Add the closeCancelarAsesoriaModal function
function closeCancelarAsesoriaModalFunc() {
  const modal = document.getElementById("cancelarAsesoriaModal")
  if (!modal) return

  modal.classList.remove("flex")
  modal.classList.add("hidden")
}

