document.addEventListener("DOMContentLoaded", () => {
  // ===== VARIABLES GLOBALES =====
  let codigoAsesoriaACancelar = null
  let fechaSeleccionadaEdit = null
  let horaSeleccionadaEdit = null
  let asesorSeleccionadoEdit = null
  let horariosOcupadosEdit = []
  let mesMostradoEdit = null // <-- NUEVA VARIABLE GLOBAL

  // Guardar los valores originales para detectar cambios
  let originalEditarAsesoria = {}

  // ===== ELEMENTOS DEL DOM =====
  const btnAbrirCrear = document.getElementById("btnAbrirCrearAsesoria")
  const modalCrear = document.getElementById("modalCrearAsesoria")
  const formCrear = document.getElementById("formCrearAsesoria")
  const modalVer = document.getElementById("modalVerAsesoria")
  const modalEditar = document.getElementById("modalEditarAsesoria")
  const modalCancelar = document.getElementById("modalCancelarAsesoria")
  const formEditar = document.getElementById("formEditarAsesoria")

  // ===== ELEMENTOS CAPTCHA =====
  const refreshButton = document.getElementById("refreshCaptcha")
  const captchaText = document.getElementById("captchaText")
  const captchaInput = document.getElementById("captcha")

  // ===== FUNCIONES AUXILIARES =====

  // Toast notification helper
  function showToast(message, type = "success") {
    const container = document.getElementById("toast-container")
    if (!container) return

    const toast = document.createElement("div")
    toast.className = `flex items-center px-4 py-3 rounded shadow text-white transition-opacity duration-500 ${
      type === "success"
        ? "bg-green-600"
        : type === "error"
          ? "bg-red-600"
          : type === "info"
            ? "bg-blue-600"
            : "bg-gray-800"
    }`

    toast.innerHTML = `
      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        ${
          type === "success"
            ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />'
            : type === "error"
              ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />'
              : type === "info"
                ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />'
                : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />'
        }
      </svg>
      <span>${message}</span>
    `

    container.appendChild(toast)

    setTimeout(() => {
      toast.classList.add("opacity-0")
      setTimeout(() => {
        if (container.contains(toast)) {
          container.removeChild(toast)
        }
      }, 500)
    }, 3000)
  }

  // Función para mostrar loading en botón
  function setButtonLoading(button, loading, loadingText = "Cargando...") {
    if (!button) return

    if (loading) {
      button.dataset.originalText = button.innerHTML
      button.innerHTML = `
        <div class="flex items-center justify-center">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ${loadingText}
        </div>
      `
      button.disabled = true
    } else {
      button.innerHTML = button.dataset.originalText || button.innerHTML
      button.disabled = false
    }
  }

  // Función para cerrar todos los modales
  function cerrarTodosLosModales() {
    const modales = [modalCrear, modalVer, modalEditar, modalCancelar]
    modales.forEach((modal) => {
      if (modal) {
        modal.classList.remove("flex")
        modal.classList.add("hidden")
      }
    })
    document.body.style.overflow = "auto"
  }

  // ===== FUNCIONES PARA CALENDARIO Y HORARIOS =====

  // Función para obtener la fecha actual en Colombia
  function getFechaActualColombia() {
    const now = new Date()
    // Ajustar a zona horaria de Colombia (UTC-5)
    const colombiaTime = new Date(now.getTime() - 5 * 60 * 60 * 1000)
    return colombiaTime
  }

  // Función para verificar si una fecha es día laboral (Lunes a Viernes)
  function esDiaLaboral(fecha) {
    const dia = fecha.getDay()
    return dia >= 1 && dia <= 5 // 1=Lunes, 5=Viernes
  }

  // Función para generar el calendario
  function generarCalendario(containerId, fechaActual = null) {
    const container = document.getElementById(containerId)
    if (!container) return

    // Usar mesMostradoEdit si existe, sino usar fechaActual o hoy
    let fechaBase = mesMostradoEdit || fechaActual || getFechaActualColombia()
    // Si se pasa fechaActual explícitamente (por cambio de mes), actualizar mesMostradoEdit
    if (fechaActual) mesMostradoEdit = new Date(fechaBase)

    const hoy = getFechaActualColombia()
    const primerDia = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), 1)
    const ultimoDia = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + 1, 0)

    const meses = [
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

    const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

    let html = `
      <div class="flex justify-between items-center mb-4">
        <button type="button" onclick="cambiarMes('${containerId}', -1)" class="p-2 hover:bg-gray-200 rounded">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>
        <h3 class="text-lg font-semibold">${meses[fechaBase.getMonth()]} ${fechaBase.getFullYear()}</h3>
        <button type="button" onclick="cambiarMes('${containerId}', 1)" class="p-2 hover:bg-gray-200 rounded">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </button>
      </div>
      
      <div class="grid grid-cols-7 gap-1 mb-2">
        ${diasSemana.map((dia) => `<div class="text-center text-sm font-medium text-gray-500 py-2">${dia}</div>`).join("")}
      </div>
      
      <div class="grid grid-cols-7 gap-1">
    `

    // Días vacíos al inicio
    const primerDiaSemana = primerDia.getDay()
    for (let i = 0; i < primerDiaSemana; i++) {
      html += "<div></div>"
    }

    // Días del mes
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      const fechaDia = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), dia)
      const esHoy = fechaDia.toDateString() === hoy.toDateString()
      const esLaboral = esDiaLaboral(fechaDia)
      const esPasado = fechaDia < hoy
      const esSeleccionado = fechaSeleccionadaEdit && fechaDia.toDateString() === fechaSeleccionadaEdit.toDateString()

      let clases = "calendar-day"
      if (esHoy) clases += " today"
      if (esSeleccionado) clases += " selected"
      if (!esLaboral || esPasado) clases += " disabled"

      const onclick =
        esLaboral && !esPasado ? `onclick="seleccionarFecha('${fechaDia.toISOString().split("T")[0]}')"` : ""

      html += `<div class="${clases}" ${onclick}>${dia}</div>`
    }

    html += "</div>"
    container.innerHTML = html
  }

  // Función para cambiar mes en el calendario
  window.cambiarMes = (containerId, direccion) => {
    // Si no hay mesMostradoEdit, usar hoy
    let base = mesMostradoEdit || getFechaActualColombia()
    // Cambiar el mes mostrado
    const nuevaFecha = new Date(base.getFullYear(), base.getMonth() + direccion, 1)
    mesMostradoEdit = nuevaFecha
    generarCalendario(containerId, nuevaFecha)
  }

  // Función para seleccionar fecha
  window.seleccionarFecha = async (fechaStr) => {
    fechaSeleccionadaEdit = new Date(fechaStr + "T00:00:00")
    horaSeleccionadaEdit = null
    mesMostradoEdit = new Date(fechaSeleccionadaEdit) // <-- Actualiza el mes mostrado

    // Regenerar calendario para mostrar selección
    generarCalendario("calendar-container-edit")

    // Cargar horarios disponibles
    await cargarHorariosDisponibles(fechaStr)

    // Actualizar campo oculto y detectar cambios
    actualizarCampoFechaHora()
    window.detectarCambiosFormulario()
  }

  // Función para cargar horarios disponibles
  async function cargarHorariosDisponibles(fecha) {
    const container = document.getElementById("horarios-container-edit")
    if (!container || !asesorSeleccionadoEdit) {
      container.innerHTML =
        '<p class="text-gray-500 text-center py-8">Seleccione un asesor para ver los horarios disponibles</p>'
      return
    }

    try {
      container.innerHTML =
        '<div class="text-center py-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div><p class="mt-2 text-gray-600">Cargando horarios...</p></div>'

      const response = await fetch(`/admin/asesores/${asesorSeleccionadoEdit}/horarios-disponibles?fecha=${fecha}`)
      const data = await response.json()

      if (data.success && data.horarios) {
        // Obtener horarios ocupados para esta fecha
        const responseOcupados = await fetch(
          `/admin/asesorias/horarios-ocupados?fecha=${fecha}&asesor=${asesorSeleccionadoEdit}`,
        )
        const dataOcupados = await responseOcupados.json()
        horariosOcupadosEdit = dataOcupados.success ? dataOcupados.horarios : []

        mostrarHorarios(data.horarios)
      } else {
        container.innerHTML =
          '<p class="text-gray-500 text-center py-8">No hay horarios disponibles para esta fecha</p>'
      }
    } catch (error) {
      console.error("Error al cargar horarios:", error)
      container.innerHTML = '<p class="text-red-500 text-center py-8">Error al cargar horarios</p>'
    }
  }

  // Función para mostrar horarios
  function mostrarHorarios(horarios) {
    const container = document.getElementById("horarios-container-edit")
    if (!container) return

    if (horarios.length === 0) {
      container.innerHTML = '<p class="text-gray-500 text-center py-8">No hay horarios disponibles para esta fecha</p>'
      return
    }

    let html = '<div class="grid grid-cols-2 gap-2">'

    horarios.forEach((hora) => {
      const estaOcupado = horariosOcupadosEdit.includes(hora)
      const esSeleccionado = horaSeleccionadaEdit === hora

      let clases = "horario-btn"
      if (estaOcupado) clases += " ocupado"
      else if (esSeleccionado) clases += " selected"

      const onclick = !estaOcupado ? `onclick="seleccionarHora('${hora}')"` : ""
      const titulo = estaOcupado ? "Horario ocupado" : "Seleccionar horario"

      html += `<button type="button" class="${clases}" ${onclick} title="${titulo}">${hora}</button>`
    })

    html += "</div>"
    container.innerHTML = html
  }

  // Función para seleccionar hora
  window.seleccionarHora = (hora) => {
    horaSeleccionadaEdit = hora

    // Actualizar visualización de horarios
    const horarios = document.querySelectorAll("#horarios-container-edit .horario-btn")
    horarios.forEach((btn) => {
      btn.classList.remove("selected")
      if (btn.textContent === hora) {
        btn.classList.add("selected")
      }
    })

    // Actualizar campo oculto y detectar cambios
    actualizarCampoFechaHora()
    window.detectarCambiosFormulario() // Use window.detectarCambiosFormulario instead of detectarCambiosFormulario
  }

  // Función para actualizar el campo oculto de fecha/hora
  function actualizarCampoFechaHora() {
    const campoFecha = document.getElementById("fecha_asesoria_edit")
    const infoSeleccion = document.getElementById("seleccion-actual-edit")
    const textoSeleccion = document.getElementById("fecha-hora-seleccionada-edit")

    if (fechaSeleccionadaEdit && horaSeleccionadaEdit && campoFecha) {
      const fechaHora = `${fechaSeleccionadaEdit.toISOString().split("T")[0]}T${horaSeleccionadaEdit}`
      campoFecha.value = fechaHora

      // Mostrar información de selección
      if (infoSeleccion && textoSeleccion) {
        const fechaFormateada = fechaSeleccionadaEdit.toLocaleDateString("es-CO", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
        textoSeleccion.textContent = `${fechaFormateada} a las ${horaSeleccionadaEdit}`
        infoSeleccion.classList.remove("hidden")
      }
    } else {
      if (campoFecha) campoFecha.value = ""
      if (infoSeleccion) infoSeleccion.classList.add("hidden")
    }
  }

  // ===== FUNCIONES CAPTCHA (COPIADAS DE forgot_password.js) =====

  // Función para refrescar el captcha
  function refreshCaptcha() {
    if (captchaText) {
      captchaText.textContent = "Cargando..."

      // Cambia esta URL para incluir el prefijo del blueprint
      fetch("/auth/refresh_captcha") // Cambiado de '/refresh_captcha' a '/auth/refresh_captcha'
        .then((response) => {
          if (!response.ok) {
            throw new Error("Error en la respuesta del servidor")
          }
          return response.json()
        })
        .then((data) => {
          captchaText.textContent = data.captcha_text
          // Limpiar el campo de entrada del captcha cuando se refresca
          if (captchaInput) {
            captchaInput.value = ""
            captchaInput.focus()
          }
        })
        .catch((error) => {
          console.error("Error al cargar el captcha:", error)
          captchaText.textContent = "Error - Clic para reintentar"
          captchaText.style.cursor = "pointer"
          // Hacer que el texto de error sea clickeable para reintentar
          captchaText.addEventListener("click", refreshCaptcha, { once: true })
        })
    }
  }

  // Event listener para el botón de refresh del captcha
  if (refreshButton) {
    refreshButton.addEventListener("click", refreshCaptcha)
  }

  // También refrescar el captcha cuando hay un error en el formulario
  const errorMessages = document.querySelectorAll(".error")
  if (errorMessages.length > 0 && captchaText) {
    refreshCaptcha()
  }

  // ===== FUNCIONES PARA MODAL CREAR ASESORÍA =====

  if (btnAbrirCrear && modalCrear) {
    btnAbrirCrear.onclick = () => {
      modalCrear.classList.remove("hidden")
      modalCrear.classList.add("flex")
      document.body.style.overflow = "hidden"
      if (formCrear) formCrear.reset()

      // Refrescar captcha al abrir el modal
      if (captchaText) {
        refreshCaptcha()
      }
    }
  }

  window.cerrarModalCrearAsesoria = () => {
    if (modalCrear) {
      modalCrear.classList.remove("flex")
      modalCrear.classList.add("hidden")
      document.body.style.overflow = "auto"
      if (formCrear) formCrear.reset()

      // Limpiar captcha al cerrar
      if (captchaInput) {
        captchaInput.value = ""
      }
    }
  }

  // ===== FUNCIONES PARA VER ASESORÍA =====

  window.abrirModalVerAsesoria = async (codigo) => {
    try {
      showToast("Cargando detalles...", "info")

      const response = await fetch(`/admin/asesorias/${codigo}/ver`)

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        const asesoria = data.asesoria
        const pagos = data.pagos || []

        // Llenar el contenido del modal
        const contenido = document.getElementById("contenidoVerAsesoria")
        contenido.innerHTML = `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Código de Asesoría</label>
              <p class="text-sm text-gray-900 font-semibold">${asesoria.codigo_asesoria || "N/A"}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Asesoría</label>
              <p class="text-sm text-gray-900">${asesoria.tipo_asesoria || "N/A"}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <p class="text-sm text-gray-900 font-medium">${asesoria.cliente_nombre || "N/A"}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Correo del Cliente</label>
              <p class="text-sm text-gray-900">${asesoria.cliente_correo || "N/A"}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <p class="text-sm text-gray-900">${asesoria.cliente_telefono || "N/A"}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de Asesoría</label>
              <p class="text-sm text-gray-900">${asesoria.fecha_asesoria_formatted || "Por programar"}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Lugar</label>
              <p class="text-sm text-gray-900">${asesoria.lugar || "N/A"}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Asesor Asignado</label>
              <p class="text-sm text-gray-900">${asesoria.asesor_asignado || asesoria.asesor_nombre || "Sin asignar"}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
              <p class="text-sm text-gray-900">${asesoria.especialidad || "N/A"}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <p class="text-sm text-gray-900">${asesoria.estado || "N/A"}</p>
            </div>
            <div class="md:col-span-2 flex flex-col items-center justify-center">
              <label class="block text-sm font-medium text-gray-700 mb-1">Estado del Proceso</label>
              <span class="inline-flex items-center justify-center px-4 py-1 rounded-full text-base font-semibold ${getEstadoProcesoClass(asesoria.estado_proceso)}">
                ${asesoria.estado_proceso || "N/A"}
              </span>
            </div>
            ${
              asesoria.descripcion
                ? `
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <p class="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">${asesoria.descripcion}</p>
            </div>
            `
                : ""
            }
            ${
              pagos.length > 0
                ? `
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-2">Historial de Pagos</label>
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    ${pagos
                      .map(
                        (pago) => `
                      <tr>
                        <td class="px-4 py-2 text-sm text-gray-900 font-medium">$${pago.monto || "N/A"}</td>
                        <td class="px-4 py-2 text-sm text-gray-900">${pago.metodo_pago || "N/A"}</td>
                        <td class="px-4 py-2 text-sm text-gray-900">
                          <span class="px-2 py-1 text-xs rounded-full ${pago.estado_pago === "Completado" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}">
                            ${pago.estado_pago || "N/A"}
                          </span>
                        </td>
                        <td class="px-4 py-2 text-sm text-gray-900">${pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleDateString() : "N/A"}</td>
                      </tr>
                    `,
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            </div>
            `
                : ""
            }
          </div>
        `

        // Mostrar modal
        if (modalVer) {
          modalVer.classList.remove("hidden")
          modalVer.classList.add("flex")
          document.body.style.overflow = "hidden"
        }
      } else {
        showToast(data.error || "Error al cargar la asesoría", "error")
      }
    } catch (error) {
      console.error("Error:", error)
      showToast("Error al cargar los detalles de la asesoría", "error")
    }
  }

  window.cerrarModalVerAsesoria = () => {
    if (modalVer) {
      modalVer.classList.remove("flex")
      modalVer.classList.add("hidden")
      document.body.style.overflow = "auto"
    }
  }

  // ===== FUNCIONES PARA EDITAR ASESORÍA =====

  window.abrirModalEditarAsesoria = async (codigo) => {
    try {
      showToast("Cargando datos para editar...", "info")
      const response = await fetch(`/admin/asesorias/${codigo}/ver`)
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`)
      const data = await response.json()
      if (data.success) {
        const asesoria = data.asesoria
        const contenido = document.getElementById("contenidoEditarAsesoria")

        // Guardar valores originales para comparación
        originalEditarAsesoria = {
          tipo_asesoria: asesoria.tipo_asesoria || "",
          lugar: asesoria.lugar || "",
          estado_proceso: asesoria.estado_proceso || "",
          id_asesor: asesoria.id_asesor || "",
          especialidad: asesoria.especialidad || "",
          tipo_documento: asesoria.tipo_documento || "",
          numero_documento: asesoria.numero_documento || "",
          descripcion: asesoria.descripcion || "",
          fecha_asesoria: asesoria.fecha_asesoria ? new Date(asesoria.fecha_asesoria).toISOString().slice(0, 16) : "",
        }

        // Renderizar select de asesores
        const asesores = window.LISTA_ASESORES || []
        let selectAsesorHtml = `<select name="id_asesor" id="id_asesor_admin_edit" class="w-full py-3 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">`
        selectAsesorHtml += `<option value="">Seleccione un asesor</option>`
        asesores.forEach((asesor) => {
          const selected = String(asesor.id_asesor) === String(asesoria.id_asesor) ? "selected" : ""
          selectAsesorHtml += `<option value="${asesor.id_asesor}" ${selected}>${asesor.nombre} ${asesor.apellidos}</option>`
        })
        selectAsesorHtml += `</select>`

        contenido.innerHTML = `
          <input type="hidden" name="codigo_asesoria" value="${asesoria.codigo_asesoria}">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Asesoría *</label>
              <select name="tipo_asesoria" required class="w-full py-3 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="Turismo" ${asesoria.tipo_asesoria === "Turismo" ? "selected" : ""}>Turismo</option>
                <option value="Estudios" ${asesoria.tipo_asesoria === "Estudios" ? "selected" : ""}>Estudios</option>
                <option value="Trabajo Temporal" ${asesoria.tipo_asesoria === "Trabajo Temporal" ? "selected" : ""}>Trabajo Temporal</option>
                <option value="Negocios" ${asesoria.tipo_asesoria === "Negocios" ? "selected" : ""}>Negocios</option>
                <option value="Residencia Permanente" ${asesoria.tipo_asesoria === "Residencia Permanente" ? "selected" : ""}>Residencia Permanente</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Asesor</label>
              ${selectAsesorHtml}
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Lugar</label>
              <select name="lugar" class="w-full py-3 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="Presencial" ${asesoria.lugar === "Presencial" ? "selected" : ""}>Presencial</option>
                <option value="Virtual (Teams)" ${asesoria.lugar === "Virtual (Teams)" ? "selected" : ""}>Virtual (Teams)</option>
                <option value="Virtual (Zoom)" ${asesoria.lugar === "Virtual (Zoom)" ? "selected" : ""}>Virtual (Zoom)</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Estado Proceso</label>
              <select name="estado_proceso" class="w-full py-3 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="Pendiente" ${asesoria.estado_proceso === "Pendiente" ? "selected" : ""}>Pendiente</option>
                <option value="Proceso activo" ${asesoria.estado_proceso === "Proceso activo" ? "selected" : ""}>Proceso activo</option>
                <option value="Terminado" ${asesoria.estado_proceso === "Terminado" ? "selected" : ""}>Terminado</option>
                <option value="Cancelado" ${asesoria.estado_proceso === "Cancelado" ? "selected" : ""}>Cancelado</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Especialidad</label>
              <select name="especialidad" class="w-full py-3 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="Inmigración Canadiense" ${asesoria.especialidad === "Inmigración Canadiense" ? "selected" : ""}>Inmigración Canadiense</option>
                <option value="Especialista en Visas de Trabajo" ${asesoria.especialidad === "Especialista en Visas de Trabajo" ? "selected" : ""}>Especialista en Visas de Trabajo</option>
                <option value="Especialista en Residencia Permanente" ${asesoria.especialidad === "Especialista en Residencia Permanente" ? "selected" : ""}>Especialista en Residencia Permanente</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Documento</label>
              <select name="tipo_documento" class="w-full py-3 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="C.C" ${asesoria.tipo_documento === "C.C" ? "selected" : ""}>Cédula de Ciudadanía</option>
                <option value="C.E" ${asesoria.tipo_documento === "C.E" ? "selected" : ""}>Cédula de Extranjería</option>
                <option value="Pasaporte" ${asesoria.tipo_documento === "Pasaporte" ? "selected" : ""}>Pasaporte</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Número de Documento</label>
              <input type="text" name="numero_documento" value="${asesoria.numero_documento || ""}"
                     class="w-full py-3 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                     placeholder="Número de documento">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
            <textarea name="descripcion" rows="3" 
                      class="w-full py-3 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Descripción adicional de la asesoría...">${asesoria.descripcion || ""}</textarea>
          </div>
        `

        // Configurar asesor seleccionado para el calendario
        if (asesoria.id_asesor) {
          asesorSeleccionadoEdit = asesoria.id_asesor
        }

        // Configurar fecha actual si existe
        if (asesoria.fecha_asesoria) {
          const fechaAsesoria = new Date(asesoria.fecha_asesoria)
          fechaSeleccionadaEdit = fechaAsesoria
          horaSeleccionadaEdit = fechaAsesoria.toTimeString().slice(0, 5)
          mesMostradoEdit = new Date(fechaAsesoria) // <-- REINICIA EL MES MOSTRADO AL ABRIR MODAL
        } else {
          mesMostradoEdit = null // <-- REINICIA EL MES MOSTRADO SI NO HAY FECHA
        }

        // Inicializar calendario
        setTimeout(() => {
          generarCalendario("calendar-container-edit")
          if (fechaSeleccionadaEdit) {
            cargarHorariosDisponibles(fechaSeleccionadaEdit.toISOString().split("T")[0])
          }
        }, 100)

        // Configurar event listener para cambio de asesor
        setTimeout(() => {
          const selectAsesor = document.getElementById("id_asesor_admin_edit")
          if (selectAsesor) {
            selectAsesor.addEventListener("change", function () {
              asesorSeleccionadoEdit = this.value
              fechaSeleccionadaEdit = null
              horaSeleccionadaEdit = null
              mesMostradoEdit = null // <-- REINICIA EL MES MOSTRADO AL CAMBIAR ASESOR

              // Limpiar selecciones
              document.getElementById("fecha_asesoria_edit").value = ""
              document.getElementById("seleccion-actual-edit").classList.add("hidden")

              // Regenerar calendario y limpiar horarios
              generarCalendario("calendar-container-edit")
              document.getElementById("horarios-container-edit").innerHTML =
                '<p class="text-gray-500 text-center py-8">Seleccione una fecha para ver los horarios disponibles</p>'

              window.detectarCambiosFormulario()
            })
          }
        }, 200)

        setTimeout(() => {
          setupDetectarCambiosEditarAsesoria()
        }, 300)

        if (modalEditar) {
          modalEditar.classList.remove("hidden")
          modalEditar.classList.add("flex")
          document.body.style.overflow = "hidden"
        }
      } else {
        showToast(data.error || "Error al cargar la asesoría", "error")
      }
    } catch (error) {
      console.error("Error:", error)
      showToast("Error al cargar los datos de la asesoría", "error")
    }
  }

  // Detectar cambios en el formulario de edición y habilitar el botón solo si hay cambios
  function setupDetectarCambiosEditarAsesoria() {
    const formEditar = document.getElementById("formEditarAsesoria")
    if (!formEditar) return
    const btnSubmit = formEditar.querySelector('button[type="submit"]')
    if (!btnSubmit) return

    function getCurrentValues() {
      const fd = new FormData(formEditar)
      const obj = {}
      fd.forEach((v, k) => (obj[k] = v))
      const fechaInput = document.getElementById("fecha_asesoria_edit")
      obj.fecha_asesoria = fechaInput ? fechaInput.value : ""
      return obj
    }

    function hayCambios() {
      const current = getCurrentValues()
      for (const key in originalEditarAsesoria) {
        if ((originalEditarAsesoria[key] || "") !== (current[key] || "")) {
          return true
        }
      }
      return false
    }

    window.detectarCambiosFormulario = function detectarCambiosFormulario() {
      if (hayCambios()) {
        btnSubmit.disabled = false
        btnSubmit.classList.remove("opacity-50", "cursor-not-allowed")
      } else {
        btnSubmit.disabled = true
        btnSubmit.classList.add("opacity-50", "cursor-not-allowed")
      }
    }

    btnSubmit.disabled = true
    btnSubmit.classList.add("opacity-50", "cursor-not-allowed")

    formEditar.querySelectorAll("input, select, textarea").forEach((el) => {
      el.removeEventListener("input", window.detectarCambiosFormulario)
      el.removeEventListener("change", window.detectarCambiosFormulario)
      el.addEventListener("input", window.detectarCambiosFormulario)
      el.addEventListener("change", window.detectarCambiosFormulario)
    })
  }

  window.cerrarModalEditarAsesoria = () => {
    if (modalEditar) {
      modalEditar.classList.remove("flex")
      modalEditar.classList.add("hidden")
      document.body.style.overflow = "auto"
      if (formEditar) formEditar.reset()

      // Limpiar variables de selección
      fechaSeleccionadaEdit = null
      horaSeleccionadaEdit = null
      asesorSeleccionadoEdit = null
      horariosOcupadosEdit = []
      mesMostradoEdit = null // <-- LIMPIA EL MES MOSTRADO AL CERRAR MODAL
    }
  }

  // ===== FUNCIONES PARA CANCELAR/ELIMINAR ASESORÍA =====

  window.abrirModalCancelarAsesoria = (codigo) => {
    codigoAsesoriaACancelar = codigo
    if (modalCancelar) {
      modalCancelar.classList.remove("hidden")
      modalCancelar.classList.add("flex")
      document.body.style.overflow = "hidden"
    }
  }

  window.cerrarModalCancelarAsesoria = () => {
    if (modalCancelar) {
      modalCancelar.classList.remove("flex")
      modalCancelar.classList.add("hidden")
      document.body.style.overflow = "auto"
    }
    codigoAsesoriaACancelar = null
  }

  // ===== PAGINACIÓN =====
  let paginaActual = 1
  let totalPaginas = 1
  const paginacionContainer = document.getElementById("paginacion-asesorias")
  const POR_PAGINA = 10

  function renderPaginacion() {
    if (!paginacionContainer) return
    paginacionContainer.innerHTML = ""
    if (totalPaginas <= 1) return
    // Mostrar máximo 5 páginas a la vez
    let inicio = Math.max(1, paginaActual - 2)
    let fin = Math.min(totalPaginas, inicio + 4)
    if (fin - inicio < 4) inicio = Math.max(1, fin - 4)
    // Botón anterior
    const btnPrev = document.createElement("button")
    btnPrev.textContent = "<"
    btnPrev.className = `px-2 py-1 rounded ${paginaActual === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}`
    btnPrev.disabled = paginaActual === 1
    btnPrev.onclick = () => cambiarPagina(paginaActual - 1)
    paginacionContainer.appendChild(btnPrev)
    // Números de página
    for (let i = inicio; i <= fin; i++) {
      const btn = document.createElement("button")
      btn.textContent = i
      btn.className = `px-3 py-1 rounded ${i === paginaActual ? 'bg-primary-600 text-white font-bold' : 'bg-white text-gray-700 hover:bg-gray-100'}`
      btn.disabled = i === paginaActual
      btn.onclick = () => cambiarPagina(i)
      paginacionContainer.appendChild(btn)
    }
    // Botón siguiente
    const btnNext = document.createElement("button")
    btnNext.textContent = ">"
    btnNext.className = `px-2 py-1 rounded ${paginaActual === totalPaginas ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}`
    btnNext.disabled = paginaActual === totalPaginas
    btnNext.onclick = () => cambiarPagina(paginaActual + 1)
    paginacionContainer.appendChild(btnNext)
  }

  function cambiarPagina(nuevaPagina) {
    if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return
    paginaActual = nuevaPagina
    filtrarAsesoriasAdmin()
  }

  async function filtrarAsesoriasAdmin() {
    if (loadingIndicator) loadingIndicator.classList.remove("hidden")
    const buscar = searchClienteInput ? searchClienteInput.value.trim() : ""
    const asesor = filterAsesor ? filterAsesor.value : ""
    const estado_proceso = filterEstadoProceso ? filterEstadoProceso.value : ""
    const fecha = filterFecha ? filterFecha.value : ""

    try {
      const params = new URLSearchParams()
      if (buscar) params.append("buscar", buscar)
      if (asesor) params.append("asesor", asesor)
      if (estado_proceso) params.append("estado_proceso", estado_proceso)
      if (fecha) params.append("fecha", fecha)
      params.append("page", paginaActual)
      params.append("per_page", POR_PAGINA)

      const response = await fetch(`/admin/asesorias/filtrar?${params.toString()}`)
      const data = await response.json()
      if (data.success) {
        renderAsesoriasTable(data.asesorias)
        totalPaginas = data.total_paginas || 1
        paginaActual = data.pagina_actual || 1
        renderPaginacion()
      } else {
        renderAsesoriasTable([])
        totalPaginas = 1
        renderPaginacion()
      }
    } catch (e) {
      renderAsesoriasTable([])
      totalPaginas = 1
      renderPaginacion()
    } finally {
      if (loadingIndicator) loadingIndicator.classList.add("hidden")
    }
  }

  // Inicializar paginación al cargar
  filtrarAsesoriasAdmin()

  // ===== EVENT LISTENERS PARA FORMULARIOS =====

  // Formulario crear asesoría
  if (formCrear) {
    formCrear.onsubmit = async (e) => {
      e.preventDefault()

      const formData = new FormData(formCrear)
      const data = {}
      formData.forEach((v, k) => (data[k] = v))

      // Validaciones del lado del cliente
      if (!data.cliente_correo || !data.cliente_correo.trim()) {
        showToast("El correo del cliente es requerido", "error")
        return
      }

      if (!data.tipo_asesoria || !data.tipo_asesoria.trim()) {
        showToast("El tipo de asesoría es requerido", "error")
        return
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.cliente_correo.trim())) {
        showToast("Por favor ingrese un correo electrónico válido", "error")
        return
      }

      // Validación del captcha
      if (captchaInput && captchaInput.value.trim() === "") {
        showToast("Por favor complete el captcha", "error")
        captchaInput.focus()
        return
      }

      if (data.fecha_asesoria) {
        const fechaSeleccionada = new Date(data.fecha_asesoria)
        const ahora = new Date()

        if (fechaSeleccionada < ahora) {
          showToast("La fecha de la asesoría no puede ser en el pasado", "error")
          return
        }
      }

      if (data.monto_pago && data.monto_pago.trim()) {
        const monto = Number.parseFloat(data.monto_pago)
        if (isNaN(monto) || monto < 0) {
          showToast("El monto debe ser un número válido mayor o igual a 0", "error")
          return
        }
      }

      const btnSubmit = formCrear.querySelector('button[type="submit"]')

      try {
        setButtonLoading(btnSubmit, true, "Creando asesoría...")

        const response = await fetch("/admin/asesorias/crear", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        })

        if (response.ok) {
          const result = await response.json()
          showToast(result.message, "success")
          window.cerrarModalCrearAsesoria()
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        } else {
          const error = await response.json()
          showToast(error.message, "error")

          // Refrescar captcha en caso de error
          if (captchaText) {
            refreshCaptcha()
          }
        }
      } catch (error) {
        console.error("Error al crear la asesoría:", error)
        showToast("Error al crear la asesoría", "error")

        // Refrescar captcha en caso de error
        if (captchaText) {
          refreshCaptcha()
        }
      } finally {
        setButtonLoading(btnSubmit, false)
      }
    }
  }

  // Formulario editar asesoría
  if (formEditar) {
    formEditar.onsubmit = async (e) => {
      e.preventDefault()

      const formData = new FormData(formEditar)
      const data = {}
      formData.forEach((v, k) => (data[k] = v))

      const codigo = data.codigo_asesoria
      delete data.codigo_asesoria

      // Validar que se haya seleccionado fecha y hora si se cambió el asesor
      if (data.id_asesor && !data.fecha_asesoria) {
        showToast("Por favor seleccione una fecha y hora para la asesoría", "error")
        return
      }

      // Validar que la fecha no sea en el pasado
      if (data.fecha_asesoria) {
        const fechaSeleccionada = new Date(data.fecha_asesoria)
        const ahora = getFechaActualColombia()

        if (fechaSeleccionada < ahora) {
          showToast("La fecha de la asesoría no puede ser en el pasado", "error")
          return
        }
      }

      const btnSubmit = formEditar.querySelector('button[type="submit"]')

      try {
        setButtonLoading(btnSubmit, true, "Guardando cambios...")

        const response = await fetch(`/admin/asesorias/${codigo}/editar`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        })

        if (response.ok) {
          const result = await response.json()
          showToast(result.mensaje || "Asesoría actualizada exitosamente", "success")
          window.cerrarModalEditarAsesoria()
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        } else {
          const error = await response.json()
          showToast(error.error || "Error al actualizar la asesoría", "error")
        }
      } catch (error) {
        console.error("Error al actualizar la asesoría:", error)
        showToast("Error al actualizar la asesoría", "error")
      } finally {
        setButtonLoading(btnSubmit, false)
      }
    }
  }

  // Botón confirmar cancelación
  const btnConfirmarCancelar = document.getElementById("btnConfirmarCancelarAsesoria")
  if (btnConfirmarCancelar) {
    btnConfirmarCancelar.onclick = async () => {
      if (!codigoAsesoriaACancelar) return

      try {
        setButtonLoading(btnConfirmarCancelar, true, "Cancelando...")

        const response = await fetch(`/admin/asesorias/${codigoAsesoriaACancelar}/eliminar`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            motivo: "Cancelada por administrador",
          }),
        })

        if (response.ok) {
          const result = await response.json()
          showToast(result.mensaje || "Asesoría cancelada exitosamente", "success")
          window.cerrarModalCancelarAsesoria()
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        } else {
          const error = await response.json()
          showToast(error.error || "Error al cancelar la asesoría", "error")
        }
      } catch (error) {
        console.error("Error al cancelar la asesoría:", error)
        showToast("Error al cancelar la asesoría", "error")
      } finally {
        setButtonLoading(btnConfirmarCancelar, false)
      }
    }
  }

  // ===== EVENT LISTENERS PARA CERRAR MODALES CON ESC =====
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      cerrarTodosLosModales()
    }
  })

  // ===== HACER FUNCIONES GLOBALES =====
  window.showToast = showToast
  window.refreshCaptcha = refreshCaptcha
  window.codigoAsesoriaACancelar = codigoAsesoriaACancelar
  window.getEstadoProcesoClass = getEstadoProcesoClass
})
