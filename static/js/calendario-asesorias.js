// Calendario de Asesorías - Funciones principales
let selectedDate = null
let selectedTime = null
let selectedAdvisorId = null
let reservationId = null
let paymentTimer = null
let paymentTimeLeft = 300 // 5 minutos en segundos

// Modificar la función initializeCalendar para mejorar el diseño
function initializeCalendar() {
  const calendarContainer = document.getElementById("calendar-container")
  if (!calendarContainer) return

  // Limpiar cualquier contenido previo
  calendarContainer.innerHTML = ""

  // Crear el calendario con mejor diseño
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  // Crear el encabezado del mes con mejor diseño
  const monthHeader = document.createElement("div")
  monthHeader.className = "flex justify-between items-center mb-4 bg-primary-50 p-3 rounded-lg"
  monthHeader.innerHTML = `
    <button id="prev-month" class="p-2 rounded-lg text-primary-600 hover:bg-primary-100 transition-all duration-200">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
      </svg>
    </button>
    <h3 class="text-lg font-semibold text-primary-700 capitalize" id="month-year">
      ${new Date(currentYear, currentMonth).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
    </h3>
    <button id="next-month" class="p-2 rounded-lg text-primary-600 hover:bg-primary-100 transition-all duration-200">
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

  // Renderizar el mes actual
  renderMonth(currentYear, currentMonth)

  // Agregar event listeners para los botones de navegación
  document.getElementById("prev-month").addEventListener("click", () => {
    const [year, month] = document.getElementById("month-year").dataset.current.split("-").map(Number)
    let newMonth = month - 1
    let newYear = year
    if (newMonth < 0) {
      newMonth = 11
      newYear--
    }
    renderMonth(newYear, newMonth)
  })

  document.getElementById("next-month").addEventListener("click", () => {
    const [year, month] = document.getElementById("month-year").dataset.current.split("-").map(Number)
    let newMonth = month + 1
    let newYear = year
    if (newMonth > 11) {
      newMonth = 0
      newYear++
    }
    renderMonth(newYear, newMonth)
  })

  // Inicializar la sección de horarios disponibles
  const timeSlotContainer = document.createElement("div")
  timeSlotContainer.id = "time-slots-container"
  timeSlotContainer.className = "mt-6 hidden"
  timeSlotContainer.innerHTML = `
    <h4 class="text-md font-semibold text-gray-800 mb-3">Horarios Disponibles</h4>
    <div id="time-slots" class="grid grid-cols-4 gap-2"></div>
    <div id="no-slots-message" class="text-center text-gray-500 py-4 hidden">
      No hay horarios disponibles para esta fecha
    </div>
  `
  calendarContainer.appendChild(timeSlotContainer)

  // Inicializar la sección de detalles de la cita
  const appointmentDetails = document.createElement("div")
  appointmentDetails.id = "appointment-details"
  appointmentDetails.className = "mt-6 p-4 bg-gray-50 rounded-lg hidden"
  calendarContainer.appendChild(appointmentDetails)
}

// Modificar la función renderMonth para mejorar el diseño
function renderMonth(year, month) {
  const daysGrid = document.getElementById("days-grid")
  if (!daysGrid) return

  // Limpiar la cuadrícula
  daysGrid.innerHTML = ""

  // Actualizar el encabezado del mes
  const monthYearHeader = document.getElementById("month-year")
  monthYearHeader.textContent = new Date(year, month).toLocaleDateString("es-ES", { month: "long", year: "numeric" })
  monthYearHeader.dataset.current = `${year}-${month}`

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
        "h-12 flex items-center justify-center rounded-lg text-gray-400 bg-gray-100 cursor-not-allowed"
    } else {
      dayElement.className =
        "h-12 flex items-center justify-center rounded-lg hover:bg-primary-100 hover:text-primary-600 cursor-pointer transition-all duration-200 border border-transparent hover:border-primary-200"
      dayElement.classList.add("day-selectable")

      // Agregar evento de clic para seleccionar el día
      dayElement.addEventListener("click", () => selectDate(date))
    }

    // Resaltar el día actual con mejor diseño
    if (day === currentDay && month === currentMonth && year === currentYear) {
      dayElement.classList.add("bg-primary-50", "text-primary-600", "font-semibold", "border", "border-primary-300")
    }

    dayElement.textContent = day
    dayElement.dataset.date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    daysGrid.appendChild(dayElement)
  }
}

// Modificar la función selectDate para mejorar el diseño
function selectDate(date) {
  // Limpiar selección anterior
  document.querySelectorAll(".day-selected").forEach((el) => {
    el.classList.remove("day-selected", "bg-primary-600", "text-white", "border-primary-600")
    el.classList.add("hover:bg-primary-100", "hover:text-primary-600", "border-transparent")
  })

  // Resaltar el día seleccionado con mejor diseño
  const dateString = date.toISOString().split("T")[0]
  const dayElement = document.querySelector(`[data-date="${dateString}"]`)
  if (dayElement) {
    dayElement.classList.add("day-selected", "bg-primary-600", "text-white", "border-primary-600")
    dayElement.classList.remove("hover:bg-primary-100", "hover:text-primary-600", "border-transparent")
  }

  // Guardar la fecha seleccionada
  selectedDate = dateString

  // Limpiar la selección de hora
  selectedTime = null

  // Mostrar los horarios disponibles para esta fecha
  loadAvailableTimeSlots(selectedDate)
}

// Modificar la función loadAvailableTimeSlots para mejorar el diseño
function loadAvailableTimeSlots(date) {
  const timeSlotContainer = document.getElementById("time-slots-container")
  const timeSlots = document.getElementById("time-slots")
  const noSlotsMessage = document.getElementById("no-slots-message")

  if (!timeSlotContainer || !timeSlots || !noSlotsMessage) return

  // Mostrar el contenedor de horarios
  timeSlotContainer.classList.remove("hidden")

  // Mostrar un indicador de carga con mejor diseño
  timeSlots.innerHTML = `
    <div class="col-span-4 flex justify-center py-6">
      <svg class="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  `

  // Ocultar el mensaje de no hay horarios
  noSlotsMessage.classList.add("hidden")

  // Obtener el asesor seleccionado
  const asesorSelector = document.getElementById("asesor_selector")
  if (!asesorSelector || !asesorSelector.value) {
    timeSlots.innerHTML = `
      <div class="col-span-4 text-center text-gray-500 py-6 bg-gray-50 rounded-lg">
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
      timeSlots.innerHTML = ""

      if (data.horarios && data.horarios.length > 0) {
        // Mostrar los horarios disponibles con mejor diseño
        data.horarios.forEach((hora) => {
          const timeSlot = document.createElement("div")
          timeSlot.className =
            "time-slot p-3 text-center border border-gray-200 rounded-lg hover:bg-primary-50 hover:border-primary-300 cursor-pointer transition-all duration-200 text-gray-700 hover:text-primary-700 font-medium"
          timeSlot.textContent = hora
          timeSlot.dataset.time = hora

          // Agregar evento de clic para seleccionar la hora
          timeSlot.addEventListener("click", () => selectTimeSlot(hora))

          timeSlots.appendChild(timeSlot)
        })
      } else {
        // Mostrar mensaje de no hay horarios disponibles con mejor diseño
        noSlotsMessage.classList.remove("hidden")
        noSlotsMessage.innerHTML = `
          <div class="flex flex-col items-center justify-center py-6">
            <svg class="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p>No hay horarios disponibles para esta fecha</p>
            <p class="text-xs text-gray-400 mt-1">Por favor, seleccione otra fecha</p>
          </div>
        `
      }
    })
    .catch((error) => {
      console.error("Error:", error)
      timeSlots.innerHTML = `
        <div class="col-span-4 text-center text-red-500 py-6 bg-red-50 rounded-lg">
          <svg class="w-10 h-10 mx-auto mb-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p>Error al cargar los horarios disponibles</p>
        </div>
      `
    })
}

// Modificar la función selectTimeSlot para mejorar el diseño
function selectTimeSlot(time) {
  // Limpiar selección anterior
  document.querySelectorAll(".time-slot-selected").forEach((el) => {
    el.classList.remove("time-slot-selected", "bg-primary-100", "border-primary-500", "text-primary-700")
  })

  // Resaltar el horario seleccionado con mejor diseño
  const timeSlot = document.querySelector(`.time-slot[data-time="${time}"]`)
  if (timeSlot) {
    timeSlot.classList.add("time-slot-selected", "bg-primary-100", "border-primary-500", "text-primary-700")
  }

  // Guardar la hora seleccionada
  selectedTime = time

  // Crear una reserva temporal para este horario
  createTemporaryReservation()

  // Actualizar los detalles de la cita
  updateAppointmentDetails()
}

// Modificar la función updateAppointmentDetails para mejorar el diseño
function updateAppointmentDetails() {
  const appointmentDetailsContent = document.getElementById("appointment-details-content")
  if (!appointmentDetailsContent) return

  if (!selectedDate || !selectedTime || !selectedAdvisorId) {
    appointmentDetailsContent.innerHTML = `
      <div class="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
        <p class="text-center">Seleccione un asesor, fecha y hora para ver los detalles de la asesoría</p>
      </div>
    `
    return
  }

  // Obtener el nombre del asesor
  const asesorSelector = document.getElementById("asesor_selector")
  const selectedOption = asesorSelector.options[asesorSelector.selectedIndex]
  const asesorName = selectedOption ? selectedOption.getAttribute("data-name") : "Asesor seleccionado"

  // Obtener la especialidad del asesor
  const asesorEspecialidad = selectedOption
    ? selectedOption.getAttribute("data-especialidad")
    : "Inmigración Canadiense"

  // Obtener el tipo de asesoría y precio
  const tipoAsesoriaSelect = document.getElementById("tipo_asesoria")
  const tipoAsesoria = tipoAsesoriaSelect
    ? tipoAsesoriaSelect.options[tipoAsesoriaSelect.selectedIndex].text
    : "Asesoría"
  const precioAsesoria = tipoAsesoriaSelect
    ? tipoAsesoriaSelect.options[tipoAsesoriaSelect.selectedIndex].getAttribute("data-precio")
    : "150"

  // Formatear la fecha
  const dateObj = new Date(selectedDate)
  const formattedDate = dateObj.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Actualizar el contenido con mejor diseño
  appointmentDetailsContent.innerHTML = `
    <div class="space-y-3 bg-white rounded-lg">
      <div class="flex items-center">
        <svg class="w-5 h-5 mr-2 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
        <div>
          <p class="text-sm"><span class="font-medium">Asesor:</span> ${asesorName}</p>
          <p class="text-xs text-gray-500">${asesorEspecialidad}</p>
        </div>
      </div>
      
      <div class="flex items-center">
        <svg class="w-5 h-5 mr-2 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <div>
          <p class="text-sm"><span class="font-medium">Tipo:</span> ${tipoAsesoria}</p>
          <p class="text-sm text-primary-600 font-medium" id="precio-asesoria">$${precioAsesoria} USD</p>
        </div>
      </div>
      
      <div class="flex items-center">
        <svg class="w-5 h-5 mr-2 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
        <p class="text-sm"><span class="font-medium">Fecha:</span> ${formattedDate}</p>
      </div>
      
      <div class="flex items-center">
        <svg class="w-5 h-5 mr-2 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <p class="text-sm"><span class="font-medium">Hora:</span> ${selectedTime}</p>
      </div>
      
      <div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
        <div class="flex items-start">
          <svg class="w-5 h-5 mr-2 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <span>Esta reserva es temporal. Tendrás 5 minutos para completar el pago una vez solicites la asesoría.</span>
        </div>
      </div>
    </div>
  `
}

// Añadir función para actualizar el precio en tiempo real
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

// Modificar la función createTemporaryReservation para que no inicie el temporizador
function createTemporaryReservation() {
  // Cancelar cualquier reserva temporal anterior
  if (reservationId) {
    cancelTemporaryReservation()
  }

  // Detener cualquier temporizador de pago anterior
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
      id_asesor: selectedAdvisorId,
      fecha: selectedDate,
      hora: selectedTime,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.error || "Error al crear reserva temporal")
        })
      }
      return response.json()
    })
    .then((data) => {
      reservationId = data.reserva_id

      // Habilitar el botón de envío
      const submitButton = document.getElementById("submitAdvisoryBtn")
      if (submitButton) {
        submitButton.disabled = false
        submitButton.classList.remove("opacity-50")
      }

      // Actualizar el campo oculto con la fecha y hora seleccionada
      const selectedDateInput = document.getElementById("selected_date")
      if (selectedDateInput) {
        selectedDateInput.value = `${selectedDate}T${selectedTime}`
      }

      // Guardar el ID y nombre del asesor en los campos ocultos
      const selectedAsesorIdInput = document.getElementById("selected_asesor_id")
      const selectedAsesorNameInput = document.getElementById("selected_asesor_name")
      const selectedAsesorEspecialidadInput = document.getElementById("selected_asesor_especialidad")

      if (selectedAsesorIdInput) selectedAsesorIdInput.value = selectedAdvisorId

      const asesorSelector = document.getElementById("asesor_selector")
      const selectedOption = asesorSelector.options[asesorSelector.selectedIndex]

      if (selectedAsesorNameInput && selectedOption) {
        selectedAsesorNameInput.value = selectedOption.getAttribute("data-name")
      }

      if (selectedAsesorEspecialidadInput && selectedOption) {
        selectedAsesorEspecialidadInput.value = selectedOption.getAttribute("data-especialidad")
      }
    })
    .catch((error) => {
      console.error("Error al crear reserva temporal:", error)
      showNotification(error.message, "error")
    })
}

// Cancelar una reserva temporal
function cancelTemporaryReservation() {
  if (!reservationId) return

  fetch("/cancelar_reserva_temporal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reserva_id: reservationId,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((data) => {
          throw new Error(data.error || "Error al cancelar reserva temporal")
        })
      }
      return response.json()
    })
    .then(() => {
      reservationId = null
    })
    .catch((error) => {
      console.error("Error al cancelar reserva temporal:", error)
    })
}

// Iniciar el temporizador de pago
function startPaymentTimer() {
  const appointmentDetails = document.getElementById("appointment-details")
  if (!appointmentDetails) return

  // Mostrar el temporizador en los detalles de la cita
  updatePaymentTimerDisplay()

  // Iniciar el intervalo para actualizar el temporizador cada segundo
  paymentTimer = setInterval(() => {
    paymentTimeLeft--

    // Actualizar la visualización del temporizador
    updatePaymentTimerDisplay()

    // Si el tiempo se agota, cancelar la reserva
    if (paymentTimeLeft <= 0) {
      clearInterval(paymentTimer)
      paymentTimer = null

      // Cancelar la reserva temporal
      cancelTemporaryReservation()

      // Mostrar mensaje de tiempo agotado
      showNotification("El tiempo para realizar el pago ha expirado. Por favor, seleccione otro horario.", "warning")

      // Deshabilitar el botón de envío
      const submitButton = document.getElementById("submitAdvisoryBtn")
      if (submitButton) {
        submitButton.disabled = true
        submitButton.classList.add("opacity-50")
      }

      // Limpiar la selección de hora
      document.querySelectorAll(".time-slot-selected").forEach((el) => {
        el.classList.remove("time-slot-selected", "bg-primary-100", "border-primary-500", "text-primary-700")
      })

      selectedTime = null
      reservationId = null

      // Actualizar los detalles de la cita
      updateAppointmentDetails()
    }
  }, 1000)
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

// Agregar una nueva función para iniciar el temporizador después de solicitar la asesoría
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

// Modificar la función para el envío del formulario
const originalAdvisoryFormSubmit = window.advisoryFormSubmit
window.advisoryFormSubmit = (event) => {
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
    })
}

// Modificar el event listener del formulario
document.addEventListener("DOMContentLoaded", () => {
  const advisoryForm = document.getElementById("advisoryForm")
  if (advisoryForm) {
    advisoryForm.addEventListener("submit", window.advisoryFormSubmit)
  }
})

// Modificar la función openNewAdvisoryModal para inicializar el calendario
const originalOpenNewAdvisoryModal = window.openNewAdvisoryModal
window.openNewAdvisoryModal = () => {
  // Llamar a la función original
  if (originalOpenNewAdvisoryModal) {
    originalOpenNewAdvisoryModal()
  }

  // Inicializar el calendario
  initializeCalendar()

  // Inicializar los detalles de la asesoría
  const appointmentDetailsContent = document.getElementById("appointment-details-content")
  if (appointmentDetailsContent) {
    appointmentDetailsContent.innerHTML = `
      <div class="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
        <p class="text-center">Seleccione un asesor, fecha y hora para ver los detalles de la asesoría</p>
      </div>
    `
  }

  // Añadir event listener para actualizar el precio cuando cambie el tipo de asesoría
  const tipoAsesoriaSelect = document.getElementById("tipo_asesoria")
  if (tipoAsesoriaSelect) {
    tipoAsesoriaSelect.addEventListener("change", updateAppointmentPrice)
  }
}

// Modificar la función closeNewAdvisoryModal para limpiar las selecciones
const originalCloseNewAdvisoryModal = window.closeNewAdvisoryModal
window.closeNewAdvisoryModal = () => {
  // Cancelar cualquier reserva temporal
  if (reservationId) {
    cancelTemporaryReservation()
  }

  // Detener cualquier temporizador de pago
  if (paymentTimer) {
    clearInterval(paymentTimer)
    paymentTimer = null
  }

  // Limpiar las selecciones
  selectedDate = null
  selectedTime = null
  selectedAdvisorId = null
  reservationId = null

  // Llamar a la función original
  if (originalCloseNewAdvisoryModal) {
    originalCloseNewAdvisoryModal()
  }
}

// Exportar las funciones para uso global
window.initializeCalendar = initializeCalendar
window.selectDate = selectDate
window.selectTimeSlot = selectTimeSlot
window.createTemporaryReservation = createTemporaryReservation
window.cancelTemporaryReservation = cancelTemporaryReservation

// Declarar la función showNotification (asumiendo que está definida en otro lugar)
// Si la función está definida en otro archivo, asegúrate de importarla correctamente.
// Aquí se proporciona una implementación básica para evitar el error.
function showNotification(message, type) {
  // Implementa la lógica para mostrar la notificación aquí
  // Por ejemplo, puedes usar un alert o un elemento HTML para mostrar el mensaje
  console.log(`Notification: ${message} (Type: ${type})`)
  alert(message)
}

