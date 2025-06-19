// Administrador - Gestión de Asesores
let currentAsesorId = null
let currentAction = null

document.addEventListener("DOMContentLoaded", () => {
  initializeEventListeners()
  initializeFilters()
  initAsesorActions()
  initModals()
  loadAsesorStats()
})

// Inicializar event listeners
function initializeEventListeners() {
  // Formulario de filtros
  const filtrosForm = document.getElementById("filtrosForm")
  if (filtrosForm) {
    filtrosForm.addEventListener("submit", handleFilterSubmit)
  }

  // Búsqueda en tiempo real
  const searchInput = document.getElementById("searchName")
  if (searchInput) {
    let searchTimeout
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimeout)
      searchTimeout = setTimeout(() => {
        handleFilterSubmit()
      }, 500)
    })
  }

  // Botón limpiar filtros
  const btnLimpiar = document.getElementById("btnLimpiar")
  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", limpiarFiltros)
  }

  // Modal de confirmación
  const confirmBtn = document.getElementById("confirmBtn")
  const cancelBtn = document.getElementById("cancelBtn")

  if (confirmBtn) {
    confirmBtn.addEventListener("click", handleConfirmAction)
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", hideModal)
  }

  // Formulario de edición de asesor
  const editAsesorForm = document.getElementById("editAsesorForm")
  if (editAsesorForm) {
    editAsesorForm.addEventListener("submit", handleEditAsesorSubmit)
  }
}

// Inicializar filtros
function initializeFilters() {
  const urlParams = new URLSearchParams(window.location.search)

  // Restaurar valor de búsqueda desde URL
  const searchInput = document.getElementById("searchName")
  if (searchInput && urlParams.get("buscar")) {
    searchInput.value = urlParams.get("buscar")
  }

  // Restaurar filtro de estado
  const statusFilter = document.getElementById("filterStatus")
  if (statusFilter && urlParams.get("estado")) {
    statusFilter.value = urlParams.get("estado")
  }
}

// Manejar envío de filtros
function handleFilterSubmit(e) {
  if (e && e.preventDefault) {
    e.preventDefault()
  }

  const searchInput = document.getElementById("searchName")
  const statusFilter = document.getElementById("filterStatus")
  const params = new URLSearchParams()

  // Agregar parámetro de búsqueda si no está vacío
  if (searchInput && searchInput.value.trim() !== "") {
    params.append("buscar", searchInput.value.trim())
  }

  // Agregar filtro de estado si no está vacío
  if (statusFilter && statusFilter.value !== "") {
    params.append("estado", statusFilter.value)
  }

  // Redirigir con filtros
  const newUrl = window.location.pathname + (params.toString() ? "?" + params.toString() : "")
  window.location.href = newUrl
}

// Limpiar filtros
function limpiarFiltros() {
  const searchInput = document.getElementById("searchName")
  const statusFilter = document.getElementById("filterStatus")

  if (searchInput) searchInput.value = ""
  if (statusFilter) statusFilter.value = ""

  // Redirigir sin parámetros
  window.location.href = window.location.pathname
}

// Inicializar acciones de asesor
function initAsesorActions() {
  console.log("Acciones de asesor inicializadas")
}

// Inicializar modales
function initModals() {
  const modal = document.getElementById("confirmModal")
  const editModal = document.getElementById("editAsesorModal")

  if (modal) {
    // Cerrar modal al hacer clic fuera
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        hideModal()
      }
    })
  }

  if (editModal) {
    // Cerrar modal de edición al hacer clic fuera
    editModal.addEventListener("click", (e) => {
      if (e.target === editModal) {
        hideEditModal()
      }
    })
  }
}

// Función para editar asesor - ahora abre modal
function editarAsesor(asesorId) {
  if (!asesorId) {
    showNotification("Error: ID de asesor no válido", "error")
    return
  }

  // Cargar datos del asesor
  cargarDatosAsesor(asesorId)
}

// Cargar datos del asesor para edición
async function cargarDatosAsesor(asesorId) {
  try {
    const response = await fetch(`/admin/asesores/${asesorId}/datos`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    })

    if (!response.ok) {
      throw new Error("Error al cargar datos del asesor")
    }

    const data = await response.json()

    if (data.success) {
      // Llenar el formulario del modal
      document.getElementById("editAsesorId").value = data.asesor.id_asesor
      document.getElementById("editNombre").value = data.asesor.nombre || ""
      document.getElementById("editApellidos").value = data.asesor.apellidos || ""
      document.getElementById("editCorreo").value = data.asesor.correo || ""
      document.getElementById("editEspecialidad").value = data.asesor.especialidad || ""
      document.getElementById("editTelefono").value = data.asesor.telefono || ""

      // Mostrar modal
      showEditModal()
    } else {
      showNotification(data.error || "Error al cargar datos del asesor", "error")
    }
  } catch (error) {
    console.error("Error:", error)
    showNotification("Error de conexión al cargar datos del asesor", "error")
  }
}

// Mostrar modal de edición
function showEditModal() {
  const modal = document.getElementById("editAsesorModal")
  if (modal) {
    modal.classList.remove("hidden")
    modal.classList.add("flex")
    document.body.style.overflow = "hidden"

    // Enfocar el primer campo
    const firstInput = document.getElementById("editNombre")
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 300)
    }
  }
}

// Ocultar modal de edición
function hideEditModal() {
  const modal = document.getElementById("editAsesorModal")
  if (modal) {
    const modalContent = modal.querySelector(".bg-white")
    if (modalContent) {
      modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
    }

    setTimeout(() => {
      modal.classList.remove("flex")
      modal.classList.add("hidden")
      document.body.style.overflow = "auto"

      // Limpiar formulario
      document.getElementById("editAsesorForm").reset()

      if (modalContent) {
        modalContent.classList.remove("opacity-0", "scale-95", "transition-all", "duration-300")
      }
    }, 300)
  }
}

// Ver detalles del asesor
function verDetallesAsesor(asesorId) {
  if (!asesorId) {
    showNotification("Error: ID de asesor no válido", "error")
    return
  }

  // Redirigir a página de detalles o abrir modal
  window.location.href = `/admin/asesores/${asesorId}/detalles`
}

// Cambiar estado del asesor
function toggleAsesorStatus(asesorId) {
  if (!asesorId) {
    showNotification("Error: ID de asesor no válido", "error")
    return
  }

  currentAsesorId = asesorId
  currentAction = "toggle_status"

  showModal("Cambiar Estado del Asesor", "¿Estás seguro de que quieres cambiar el estado de este asesor?")
}

// Mostrar modal de confirmación
function showModal(title, message) {
  const modal = document.getElementById("confirmModal")
  const modalTitle = document.getElementById("modalTitle")
  const modalMessage = document.getElementById("modalMessage")

  if (modal && modalTitle && modalMessage) {
    modalTitle.textContent = title
    modalMessage.textContent = message
    modal.classList.remove("hidden")
    modal.classList.add("flex")
    document.body.style.overflow = "hidden"

    // Enfocar el botón de cancelar por defecto
    const cancelBtn = document.getElementById("cancelBtn")
    if (cancelBtn) {
      setTimeout(() => cancelBtn.focus(), 300)
    }
  }
}

// Ocultar modal
function hideModal() {
  const modal = document.getElementById("confirmModal")
  if (modal) {
    const modalContent = modal.querySelector(".bg-white")
    if (modalContent) {
      modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
    }

    setTimeout(() => {
      modal.classList.remove("flex")
      modal.classList.add("hidden")
      document.body.style.overflow = "auto"

      if (modalContent) {
        modalContent.classList.remove("opacity-0", "scale-95", "transition-all", "duration-300")
      }
    }, 300)
  }

  // Limpiar variables
  currentAsesorId = null
  currentAction = null
}

// Manejar envío del formulario de edición
async function handleEditAsesorSubmit(e) {
  e.preventDefault()

  const saveBtn = document.getElementById("saveAsesorBtn")
  const originalButtonContent = saveBtn.innerHTML

  if (saveBtn) {
    saveBtn.disabled = true
    saveBtn.innerHTML = `
      <div class="relative flex items-center justify-center">
        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
        <span>Guardando...</span>
      </div>
    `
  }

  try {
    const formData = new FormData(e.target)
    const asesorId = formData.get("asesor_id")

    const asesorData = {
      nombre: formData.get("nombre"),
      apellidos: formData.get("apellidos"),
      correo: formData.get("correo"),
      especialidad: formData.get("especialidad"),
      telefono: formData.get("telefono"),
    }

    const response = await fetch(`/admin/asesores/${asesorId}/editar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(asesorData),
    })

    const data = await response.json()

    if (data.success) {
      showNotification(data.mensaje, "success")
      hideEditModal()

      // Actualizar la fila en la tabla
      updateAsesorRowInTable(asesorId, asesorData)
    } else {
      showNotification(data.error || "Error al actualizar asesor", "error")
    }
  } catch (error) {
    console.error("Error:", error)
    showNotification("Error de conexión al actualizar asesor", "error")
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false
      saveBtn.innerHTML = originalButtonContent
    }
  }
}

// Actualizar fila del asesor en la tabla
function updateAsesorRowInTable(asesorId, asesorData) {
  const row = document.querySelector(`tr[data-asesor-id="${asesorId}"]`)
  if (row) {
    // Actualizar nombre y correo
    const nameCell = row.querySelector(".text-sm.font-medium.text-gray-900")
    const emailCell = row.querySelector(".text-sm.text-gray-500")

    if (nameCell) {
      nameCell.textContent = `${asesorData.nombre} ${asesorData.apellidos}`
    }

    if (emailCell) {
      emailCell.textContent = asesorData.correo
    }

    // Actualizar iniciales en el avatar
    const avatar = row.querySelector(".h-10.w-10")
    if (avatar && asesorData.nombre && asesorData.apellidos) {
      avatar.textContent = asesorData.nombre[0] + asesorData.apellidos[0]
    }

    // Añadir animación de actualización
    row.classList.add("animate-fade-in")
    setTimeout(() => {
      row.classList.remove("animate-fade-in")
    }, 500)
  }
}

// Manejar confirmación de acción
async function handleConfirmAction() {
  if (!currentAsesorId || !currentAction) {
    hideModal()
    return
  }

  const confirmBtn = document.getElementById("confirmBtn")
  const originalButtonContent = confirmBtn.innerHTML

  if (confirmBtn) {
    confirmBtn.disabled = true
    confirmBtn.innerHTML = `
      <div class="flex items-center justify-center">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
        <span>Procesando...</span>
      </div>
    `
  }

  try {
    if (currentAction === "toggle_status") {
      const response = await fetch(`/admin/asesores/${currentAsesorId}/toggle-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      })

      const data = await response.json()

      if (data.success) {
        showNotification(data.mensaje, "success")
        // Recargar página para actualizar estado
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        showNotification(data.error || "Error al cambiar estado del asesor", "error")
      }
    }
  } catch (error) {
    console.error("Error:", error)
    showNotification("Error de conexión. Inténtalo de nuevo.", "error")
  } finally {
    hideModal()

    // Restaurar botón
    if (confirmBtn) {
      confirmBtn.disabled = false
      confirmBtn.innerHTML = originalButtonContent
    }
  }
}

// Sistema de notificaciones mejorado
function showNotification(message, type = "info") {
  const container = document.getElementById("toast-container")
  if (!container) return

  const notification = document.createElement("div")
  notification.className = `max-w-sm w-full bg-white shadow-lg rounded-2xl pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transform transition-all duration-500 translate-x-full animate-scale-in`

  let bgColor, iconColor, icon, borderColor

  switch (type) {
    case "success":
      bgColor = "bg-green-50"
      iconColor = "text-green-400"
      borderColor = "border-l-4 border-green-500"
      icon = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>'
      break
    case "error":
      bgColor = "bg-red-50"
      iconColor = "text-red-400"
      borderColor = "border-l-4 border-red-500"
      icon = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>'
      break
    case "warning":
      bgColor = "bg-yellow-50"
      iconColor = "text-yellow-400"
      borderColor = "border-l-4 border-yellow-500"
      icon =
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>'
      break
    default:
      bgColor = "bg-blue-50"
      iconColor = "text-blue-400"
      borderColor = "border-l-4 border-blue-500"
      icon =
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
  }

  notification.innerHTML = `
    <div class="p-4 ${bgColor} ${borderColor}">
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <svg class="h-6 w-6 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${icon}
          </svg>
        </div>
        <div class="ml-3 w-0 flex-1 pt-0.5">
          <p class="text-sm font-medium text-gray-900">${message}</p>
        </div>
        <div class="ml-4 flex-shrink-0 flex">
          <button class="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200" onclick="this.closest('.max-w-sm').remove()">
            <span class="sr-only">Cerrar</span>
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `

  container.appendChild(notification)

  // Animar entrada
  setTimeout(() => {
    notification.classList.remove("translate-x-full")
    notification.classList.add("translate-x-0")
  }, 100)

  // Auto-remover después de 5 segundos
  setTimeout(() => {
    notification.classList.remove("translate-x-0")
    notification.classList.add("translate-x-full")

    // Eliminar del DOM después de la animación
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove()
      }
    }, 500)
  }, 5000)
}

// Manejar tecla Escape para cerrar modales
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    hideModal()
    hideEditModal()
  }
})

// Actualizar tabla de asesores
function updateAsesoresTable(asesores) {
  const tbody = document.querySelector("tbody")
  if (!tbody) return

  if (asesores.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">No hay asesores que coincidan con los filtros</td></tr>'
    return
  }

  tbody.innerHTML = asesores
    .map(
      (asesor) => `
        <tr class="hover:bg-gray-50" data-asesor-id="${asesor.id_asesor}">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="h-10 w-10 flex-shrink-0 bg-gray-200 rounded-full text-gray-500 flex items-center justify-center">
                        ${asesor.nombre?.[0] || "A"}${asesor.apellidos?.[0] || ""}
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${asesor.nombre} ${asesor.apellidos}</div>
                        <div class="text-sm text-gray-500">${asesor.correo}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${asesor.especialidad || "Inmigración Canadiense"}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${asesor.clientes_asignados || 0}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${asesor.total_asesorias || 0}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    ${generateStarRating(asesor.calificacion || 4.5)}
                    <span class="ml-2 text-sm text-gray-600">${asesor.calificacion || "4.5"}</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(asesor.estado)}">
                    ${asesor.estado || "Activo"}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end space-x-2">
                    <button onclick="editarAsesor(${asesor.id_asesor})" class="text-primary-600 hover:text-primary-900">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    <button onclick="verDetallesAsesor(${asesor.id_asesor})" class="text-blue-600 hover:text-blue-900">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                    </button>
                    <button onclick="toggleAsesorStatus(${asesor.id_asesor})" class="text-yellow-600 hover:text-yellow-900">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18L5.636 5.636M18.364 5.636L5.636 18.364M5.636 18.364l12.728-12.728"></path>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `,
    )
    .join("")
}

// Cargar estadísticas de asesores
async function loadAsesorStats() {
  try {
    const response = await fetch("/admin/asesores/estadisticas")
    const data = await response.json()

    if (data.success) {
      updateStatsCards(data.estadisticas)
    }
  } catch (error) {
    console.error("Error cargando estadísticas:", error)
  }
}

// Actualizar tarjetas de estadísticas
function updateStatsCards(stats) {
  const elementos = {
    total_asesores: stats.total_asesores || 0,
    asesores_activos: stats.asesores_activos || 0,
    asesorias_mes: stats.asesorias_mes || 0,
    promedio_calificacion: stats.promedio_calificacion || "4.8",
  }

  Object.keys(elementos).forEach((key) => {
    const elemento = document.querySelector(`[data-stat="${key}"]`)
    if (elemento) {
      elemento.textContent = elementos[key]
    }
  })
}

// Funciones de utilidad
function generateStarRating(rating) {
  const stars = []
  const fullStars = Math.floor(rating)

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        '<svg class="w-4 h-4 fill-current text-yellow-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>',
      )
    } else {
      stars.push(
        '<svg class="w-4 h-4 text-gray-300 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>',
      )
    }
  }

  return `<div class="flex text-yellow-400">${stars.join("")}</div>`
}

function getStatusBadgeClass(estado) {
  switch (estado) {
    case "Activo":
      return "bg-green-100 text-green-800"
    case "Inactivo":
      return "bg-gray-100 text-gray-800"
    default:
      return "bg-red-100 text-red-800"
  }
}

function updatePagination(pagination) {
  // Implementar actualización de paginación
}
