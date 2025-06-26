document.addEventListener("DOMContentLoaded", () => {
  // ===== VARIABLES GLOBALES =====
  let codigoAsesoriaACancelar = null
  let fechaSeleccionadaEdit = null
  let horaSeleccionadaEdit = null
  let asesorSeleccionadoEdit = null
  let horariosOcupadosEdit = []
  let mesMostradoEdit = null
  let filtroTimeout = null // Para debounce en filtros

  // Guardar los valores originales para detectar cambios
  let originalEditarAsesoria = {}

  // ===== ELEMENTOS DEL DOM =====
  const modalVer = document.getElementById("modalVerAsesoria")
  const modalEditar = document.getElementById("modalEditarAsesoria")
  const modalCancelar = document.getElementById("modalCancelarAsesoria")
  const formEditar = document.getElementById("formEditarAsesoria")
  const loadingIndicator = document.getElementById("loading-indicator")

  // Elementos de filtros
  const searchClienteInput = document.getElementById("searchCliente")
  const filterAsesor = document.getElementById("filterAsesor")
  const filterEstadoProceso = document.getElementById("filterEstadoProceso")
  const filterFecha = document.getElementById("filterFecha")

  // ===== FUNCIONES AUXILIARES MEJORADAS =====

  // Toast notification mejorado con más estilos
  function showToast(message, type = "success", duration = 4000) {
    const container = document.getElementById("toast-container")
    if (!container) return

    const toast = document.createElement("div")
    const iconMap = {
      success: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>`,
      error: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>`,
      info: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>`,
      warning: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>`,
    }

    toast.className = `toast-${type} flex items-center px-6 py-4 rounded-xl shadow-lg text-white transition-all duration-500 transform translate-x-full opacity-0 max-w-md`

    toast.innerHTML = `
      <div class="flex items-center">
        ${iconMap[type] || iconMap.info}
        <span class="ml-3 font-medium">${message}</span>
      </div>
      <button onclick="this.parentElement.remove()" class="ml-4 text-white/80 hover:text-white transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    `

    container.appendChild(toast)

    // Animación de entrada
    setTimeout(() => {
      toast.classList.remove("translate-x-full", "opacity-0")
    }, 100)

    // Auto-remove
    setTimeout(() => {
      toast.classList.add("translate-x-full", "opacity-0")
      setTimeout(() => {
        if (container.contains(toast)) {
          container.removeChild(toast)
        }
      }, 500)
    }, duration)
  }

  // Función para mostrar loading en botón mejorada
  function setButtonLoading(button, loading, loadingText = "Cargando...") {
    if (!button) return

    if (loading) {
      button.dataset.originalText = button.innerHTML
      button.innerHTML = `
        <div class="flex items-center justify-center">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
          ${loadingText}
        </div>
      `
      button.disabled = true
      button.classList.add("opacity-75", "cursor-not-allowed")
    } else {
      button.innerHTML = button.dataset.originalText || button.innerHTML
      button.disabled = false
      button.classList.remove("opacity-75", "cursor-not-allowed")
    }
  }

  // Función para cerrar todos los modales
  function cerrarTodosLosModales() {
    const modales = [modalVer, modalEditar, modalCancelar]
    modales.forEach((modal) => {
      if (modal) {
        modal.classList.remove("flex")
        modal.classList.add("hidden")
      }
    })
    document.body.style.overflow = "auto"
  }

  // ===== FUNCIONES PARA FILTRADO DINÁMICO =====

  function setupFiltrosDinamicos() {
    const elementos = [searchClienteInput, filterAsesor, filterEstadoProceso, filterFecha]

    elementos.forEach((elemento) => {
      if (elemento) {
        elemento.addEventListener("input", () => {
          clearTimeout(filtroTimeout)
          filtroTimeout = setTimeout(() => {
            filtrarAsesoriasAdmin()
          }, 300) // Debounce de 300ms
        })

        elemento.addEventListener("change", () => {
          filtrarAsesoriasAdmin()
        })
      }
    })
  }

  // Función para limpiar filtros
  window.limpiarFiltros = () => {
    if (searchClienteInput) searchClienteInput.value = ""
    if (filterAsesor) filterAsesor.value = ""
    if (filterEstadoProceso) filterEstadoProceso.value = ""
    if (filterFecha) filterFecha.value = ""
    filtrarAsesoriasAdmin()
  }

  // Función para filtrar asesorías con mejor UX
  async function filtrarAsesoriasAdmin() {
    if (loadingIndicator) {
      loadingIndicator.classList.remove("hidden")
    }

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

      const response = await fetch(`/admin/asesorias/filtrar?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        renderAsesoriasTable(data.asesorias)
        if (data.asesorias.length === 0) {
          showToast("No se encontraron asesorías con los filtros aplicados", "info", 2000)
        }
      } else {
        renderAsesoriasTable([])
        showToast("Error al filtrar asesorías", "error")
      }
    } catch (error) {
      console.error("Error al filtrar:", error)
      renderAsesoriasTable([])
      showToast("Error de conexión al filtrar", "error")
    } finally {
      if (loadingIndicator) {
        loadingIndicator.classList.add("hidden")
      }
    }
  }

  // Función para renderizar la tabla de asesorías
  function renderAsesoriasTable(asesorias) {
    const tbody = document.getElementById("tablaAsesorias-body")
    if (!tbody) return

    if (asesorias.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="px-6 py-12 text-center text-gray-500">
            <div class="flex flex-col items-center">
              <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <p class="text-lg font-medium mb-2">No se encontraron asesorías</p>
              <p class="text-sm">Intenta ajustar los filtros o crear una nueva asesoría</p>
            </div>
          </td>
        </tr>
      `
      return
    }

    tbody.innerHTML = asesorias
      .map((asesoria) => {
        const fechaFormateada = asesoria.fecha_asesoria
          ? new Date(asesoria.fecha_asesoria).toLocaleDateString("es-CO", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Por programar"

        return `
        <tr class="hover:bg-gray-50 transition-colors duration-200">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
              <div class="h-10 w-10 flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full text-white flex items-center justify-center font-semibold">
                ${asesoria.cliente_nombre ? asesoria.cliente_nombre[0] : "C"}
              </div>
              <div class="ml-4">
                <div class="text-sm font-medium text-gray-900">${asesoria.cliente_nombre || "N/A"}</div>
                <div class="text-sm text-gray-500">${asesoria.cliente_correo || "N/A"}</div>
              </div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-gray-900">${asesoria.asesor_asignado || "Sin asignar"}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            ${asesoria.tipo_asesoria || "Visa de Trabajo"}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            ${fechaFormateada}
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoPagoClass(asesoria.estado_pago)}">
              ${asesoria.estado_pago || "Pendiente"}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-center">
            <span class="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold ${window.getEstadoProcesoClass(asesoria.estado_proceso)}">
              ${asesoria.estado_proceso || "Pendiente"}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <div class="flex justify-end space-x-2">
              <button class="btn-action text-blue-600 hover:bg-blue-50" title="Ver detalles"
                  onclick="abrirModalVerAsesoria('${asesoria.codigo_asesoria}')">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
              </button>
              <button class="btn-action text-primary-600 hover:bg-primary-50" title="Editar"
                  onclick="abrirModalEditarAsesoria('${asesoria.codigo_asesoria}')">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button class="btn-action text-red-600 hover:bg-red-50" title="Cancelar"
                  onclick="abrirModalCancelarAsesoria('${asesoria.codigo_asesoria}')">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
              <button class="btn-action text-green-600 hover:bg-green-50" title="Exportar PDF"
                  onclick="exportarAsesoriaPDF('${asesoria.codigo_asesoria}')">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `
      })
      .join("")
  }

  // Funciones auxiliares para clases CSS
  function getEstadoPagoClass(estado) {
    switch (estado) {
      case "Completado":
        return "bg-green-100 text-green-800"
      case "Pendiente":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-red-100 text-red-800"
    }
  }

  window.getEstadoProcesoClass = (estado) => {
    switch (estado) {
      case "Terminado":
        return "bg-green-100 text-green-800"
      case "Proceso activo":
        return "bg-blue-100 text-blue-800"
      case "Cancelado":
        return "bg-red-100 text-red-800"
      default:
        return "bg-yellow-100 text-yellow-800"
    }
  }

  // ===== FUNCIONES PARA CALENDARIO Y HORARIOS =====

  function getFechaActualColombia() {
    const now = new Date()
    const colombiaTime = new Date(now.getTime() - 5 * 60 * 60 * 1000)
    return colombiaTime
  }

  function esDiaLaboral(fecha) {
    const dia = fecha.getDay()
    return dia >= 1 && dia <= 5
  }

  function generarCalendario(containerId, fechaActual = null) {
    const container = document.getElementById(containerId)
    if (!container) return

    const fechaBase = mesMostradoEdit || fechaActual || getFechaActualColombia()
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
        <button type="button" onclick="cambiarMes('${containerId}', -1)" class="p-2 hover:bg-gray-200 rounded-lg transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>
        <h3 class="text-lg font-semibold">${meses[fechaBase.getMonth()]} ${fechaBase.getFullYear()}</h3>
        <button type="button" onclick="cambiarMes('${containerId}', 1)" class="p-2 hover:bg-gray-200 rounded-lg transition-colors">
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

    const primerDiaSemana = primerDia.getDay()
    for (let i = 0; i < primerDiaSemana; i++) {
      html += "<div></div>"
    }

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

  window.cambiarMes = (containerId, direccion) => {
    const base = mesMostradoEdit || getFechaActualColombia()
    const nuevaFecha = new Date(base.getFullYear(), base.getMonth() + direccion, 1)
    mesMostradoEdit = nuevaFecha
    generarCalendario(containerId, nuevaFecha)
  }

  window.seleccionarFecha = async (fechaStr) => {
    fechaSeleccionadaEdit = new Date(fechaStr + "T00:00:00")
    horaSeleccionadaEdit = null
    mesMostradoEdit = new Date(fechaSeleccionadaEdit)

    generarCalendario("calendar-container-edit")
    await cargarHorariosDisponibles(fechaStr)
    actualizarCampoFechaHora()
    if (window.detectarCambiosFormulario) {
      window.detectarCambiosFormulario()
    }
  }

  async function cargarHorariosDisponibles(fecha) {
    const container = document.getElementById("horarios-container-edit")
    if (!container || !asesorSeleccionadoEdit) {
      container.innerHTML =
        '<p class="text-gray-500 text-center py-8">Seleccione un asesor para ver los horarios disponibles</p>'
      return
    }

    try {
      container.innerHTML = `
        <div class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p class="mt-2 text-gray-600">Cargando horarios...</p>
        </div>
      `

      const response = await fetch(`/admin/asesores/${asesorSeleccionadoEdit}/horarios-disponibles?fecha=${fecha}`)
      const data = await response.json()

      if (data.success && data.horarios) {
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

  window.seleccionarHora = (hora) => {
    horaSeleccionadaEdit = hora

    const horarios = document.querySelectorAll("#horarios-container-edit .horario-btn")
    horarios.forEach((btn) => {
      btn.classList.remove("selected")
      if (btn.textContent === hora) {
        btn.classList.add("selected")
      }
    })

    actualizarCampoFechaHora()
    if (window.detectarCambiosFormulario) {
      window.detectarCambiosFormulario()
    }
  }

  function actualizarCampoFechaHora() {
    const campoFecha = document.getElementById("fecha_asesoria_edit")
    const infoSeleccion = document.getElementById("seleccion-actual-edit")
    const textoSeleccion = document.getElementById("fecha-hora-seleccionada-edit")

    if (fechaSeleccionadaEdit && horaSeleccionadaEdit && campoFecha) {
      const fechaHora = `${fechaSeleccionadaEdit.toISOString().split("T")[0]}T${horaSeleccionadaEdit}`
      campoFecha.value = fechaHora

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

  // ===== FUNCIONES PARA VER ASESORÍA MEJORADA =====

  window.abrirModalVerAsesoria = async (codigo) => {
    try {
      showToast("Cargando detalles...", "info", 2000)

      const response = await fetch(`/admin/asesorias/${codigo}/ver`)
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success) {
        const asesoria = data.asesoria
        const pagos = data.pagos || []

        const contenido = document.getElementById("contenidoVerAsesoria")
        contenido.innerHTML = `
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Información Principal -->
            <div class="lg:col-span-2 space-y-6">
              <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <h3 class="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                  Información del Cliente
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                    <p class="text-sm text-gray-900 font-semibold bg-white px-3 py-2 rounded-lg">${asesoria.cliente_nombre || "N/A"}</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                    <p class="text-sm text-gray-900 bg-white px-3 py-2 rounded-lg">${asesoria.cliente_correo || "N/A"}</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <p class="text-sm text-gray-900 bg-white px-3 py-2 rounded-lg">${asesoria.cliente_telefono || "N/A"}</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Código de Asesoría</label>
                    <p class="text-sm text-gray-900 bg-white px-3 py-2 rounded-lg font-mono">#${asesoria.codigo_asesoria || "N/A"}</p>
                  </div>
                </div>
              </div>

              <div class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                <h3 class="text-lg font-semibold text-green-900 mb-4 flex items-center">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Detalles de la Asesoría
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Asesoría</label>
                    <p class="text-sm text-gray-900 bg-white px-3 py-2 rounded-lg">${asesoria.tipo_asesoria || "N/A"}</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Fecha y Hora</label>
                    <p class="text-sm text-gray-900 bg-white px-3 py-2 rounded-lg">${asesoria.fecha_asesoria_formatted || "Por programar"}</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Lugar</label>
                    <p class="text-sm text-gray-900 bg-white px-3 py-2 rounded-lg">${asesoria.lugar || "N/A"}</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
                    <p class="text-sm text-gray-900 bg-white px-3 py-2 rounded-lg">${asesoria.especialidad || "N/A"}</p>
                  </div>
                </div>
              </div>

              <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                <h3 class="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                  Información del Asesor
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Asesor Asignado</label>
                    <p class="text-sm text-gray-900 bg-white px-3 py-2 rounded-lg">${asesoria.asesor_asignado || asesoria.asesor_nombre || "Sin asignar"}</p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Correo del Asesor</label>
                    <p class="text-sm text-gray-900 bg-white px-3 py-2 rounded-lg">${asesoria.asesor_correo || "N/A"}</p>
                  </div>
                </div>
              </div>

              ${
                asesoria.descripcion
                  ? `
              <div class="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  Descripción
                </h3>
                <p class="text-sm text-gray-900 bg-white p-4 rounded-lg leading-relaxed">${asesoria.descripcion}</p>
              </div>
              `
                  : ""
              }
            </div>

            <!-- Panel Lateral -->
            <div class="space-y-6">
              <!-- Estado del Proceso -->
              <div class="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 class="text-lg font-semibold text-gray-900 mb-4 text-center">Estado del Proceso</h3>
                <div class="flex flex-col items-center">
                  <span class="inline-flex items-center justify-center px-6 py-3 rounded-full text-lg font-semibold ${window.getEstadoProcesoClass(asesoria.estado_proceso)} mb-3">
                    ${asesoria.estado_proceso || "N/A"}
                  </span>
                  <div class="text-center">
                    <p class="text-sm text-gray-600">Estado actual</p>
                    <p class="text-xs text-gray-500 mt-1">Última actualización: ${new Date().toLocaleDateString("es-CO")}</p>
                  </div>
                </div>
              </div>

              <!-- Estado General -->
              <div class="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Estado General</h3>
                <div class="space-y-3">
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">Estado:</span>
                    <span class="text-sm font-medium text-gray-900">${asesoria.estado || "N/A"}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">Documento:</span>
                    <span class="text-sm font-medium text-gray-900">${asesoria.tipo_documento || "N/A"}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">Número:</span>
                    <span class="text-sm font-medium text-gray-900">${asesoria.numero_documento || "N/A"}</span>
                  </div>
                </div>
              </div>

              ${
                pagos.length > 0
                  ? `
              <!-- Historial de Pagos -->
              <div class="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                  </svg>
                  Historial de Pagos
                </h3>
                <div class="space-y-3">
                  ${pagos
                    .map(
                      (pago) => `
                    <div class="bg-gray-50 rounded-lg p-3">
                      <div class="flex justify-between items-start mb-2">
                        <span class="text-sm font-medium text-gray-900">$${pago.monto || "N/A"}</span>
                        <span class="px-2 py-1 text-xs rounded-full ${pago.estado_pago === "Completado" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}">
                          ${pago.estado_pago || "N/A"}
                        </span>
                      </div>
                      <div class="text-xs text-gray-600">
                        <p>Método: ${pago.metodo_pago || "N/A"}</p>
                        <p>Fecha: ${pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleDateString("es-CO") : "N/A"}</p>
                      </div>
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              </div>
              `
                  : ""
              }
            </div>
          </div>
        `

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
      showToast("Cargando datos para editar...", "info", 2000)
      const response = await fetch(`/admin/asesorias/${codigo}/ver`)
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`)
      const data = await response.json()
      if (data.success) {
        const asesoria = data.asesoria
        const contenido = document.getElementById("contenidoEditarAsesoria")

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

        if (asesoria.id_asesor) {
          asesorSeleccionadoEdit = asesoria.id_asesor
        }

        if (asesoria.fecha_asesoria) {
          const fechaAsesoria = new Date(asesoria.fecha_asesoria)
          fechaSeleccionadaEdit = fechaAsesoria
          horaSeleccionadaEdit = fechaAsesoria.toTimeString().slice(0, 5)
          mesMostradoEdit = new Date(fechaAsesoria)
        } else {
          mesMostradoEdit = null
        }

        setTimeout(() => {
          generarCalendario("calendar-container-edit")
          if (fechaSeleccionadaEdit) {
            cargarHorariosDisponibles(fechaSeleccionadaEdit.toISOString().split("T")[0])
          }
        }, 100)

        setTimeout(() => {
          const selectAsesor = document.getElementById("id_asesor_admin_edit")
          if (selectAsesor) {
            selectAsesor.addEventListener("change", function () {
              asesorSeleccionadoEdit = this.value
              fechaSeleccionadaEdit = null
              horaSeleccionadaEdit = null
              mesMostradoEdit = null

              document.getElementById("fecha_asesoria_edit").value = ""
              document.getElementById("seleccion-actual-edit").classList.add("hidden")

              generarCalendario("calendar-container-edit")
              document.getElementById("horarios-container-edit").innerHTML =
                '<p class="text-gray-500 text-center py-8">Seleccione una fecha para ver los horarios disponibles</p>'

              if (window.detectarCambiosFormulario) {
                window.detectarCambiosFormulario()
              }
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

      fechaSeleccionadaEdit = null
      horaSeleccionadaEdit = null
      asesorSeleccionadoEdit = null
      horariosOcupadosEdit = []
      mesMostradoEdit = null
    }
  }

  // ===== FUNCIONES PARA CANCELAR ASESORÍA =====

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

  // ===== FUNCIONES PARA EXPORTAR PDF =====

  window.exportarAsesoriaPDF = async (codigo) => {
    try {
      showToast("Generando PDF...", "info", 2000)
      const response = await fetch(`/admin/asesorias/${codigo}/exportar-pdf`)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.style.display = "none"
        a.href = url
        a.download = `asesoria_${codigo}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        showToast("PDF descargado exitosamente", "success")
      } else {
        throw new Error("Error al generar PDF")
      }
    } catch (error) {
      console.error("Error:", error)
      showToast("Error al generar el PDF", "error")
    }
  }

  window.exportarTodasAsesoriasPDF = async () => {
    try {
      showToast("Generando reporte PDF...", "info", 3000)
      const response = await fetch("/admin/asesorias/exportar-todas-pdf")

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.style.display = "none"
        a.href = url
        a.download = "reporte_asesorias.pdf"
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        showToast("Reporte PDF descargado exitosamente", "success")
      } else {
        throw new Error("Error al generar reporte PDF")
      }
    } catch (error) {
      console.error("Error:", error)
      showToast("Error al generar el reporte PDF", "error")
    }
  }

  // ===== EVENT LISTENERS =====

  // Formulario editar asesoría
  if (formEditar) {
    formEditar.onsubmit = async (e) => {
      e.preventDefault()

      const formData = new FormData(formEditar)
      const data = {}
      formData.forEach((v, k) => (data[k] = v))

      const codigo = data.codigo_asesoria
      delete data.codigo_asesoria

      if (data.id_asesor && !data.fecha_asesoria) {
        showToast("Por favor seleccione una fecha y hora para la asesoría", "error")
        return
      }

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
            filtrarAsesoriasAdmin()
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
            filtrarAsesoriasAdmin()
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

  // Event listeners para cerrar modales con ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      cerrarTodosLosModales()
    }
  })

  // Configurar filtros dinámicos
  setupFiltrosDinamicos()

  // Cargar asesorías inicialmente
  filtrarAsesoriasAdmin()

  // Hacer funciones globales
  window.showToast = showToast
  window.codigoAsesoriaACancelar = codigoAsesoriaACancelar
})
