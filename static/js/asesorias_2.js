// Modificar la función para cargar disponibilidad del asesor incluyendo lunes
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

    // Excluir fines de semana (sábado y domingo)
    // Modificado para incluir lunes (1) como día disponible
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      const dateString = formatDateString(date)
      availableDates[dateString] = true
    }
  }

  // Actualizar el calendario
  renderCalendar()
}

// Modificar la función para verificar disponibilidad incluyendo lunes
function checkAvailability(dateString) {
  // Si no hay asesor seleccionado, no hay disponibilidad
  if (!selectedAsesorId) return false

  // Verificar si es fin de semana (solo domingo)
  const date = new Date(dateString)
  const dayOfWeek = date.getDay() // 0 = Domingo, 1 = Lunes, 6 = Sábado

  // Modificado para permitir lunes (1) y excluir solo domingo (0) y sábado (6)
  if (dayOfWeek === 0 || dayOfWeek === 6) return false

  // Verificar si es una fecha pasada
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (date < today) return false

  // Si llegamos aquí, la fecha podría estar disponible
  return availableDates[dateString] === true
}

