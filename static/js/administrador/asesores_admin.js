// Administrador - Gestión de Asesores
let currentAsesorId = null
let currentAction = null

document.addEventListener("DOMContentLoaded", () => {
  initializeEventListeners()
  initializeFilters()
  initModals()
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

  // Formulario de creación de asesor
  const createAsesorForm = document.getElementById("createAsesorForm")
  if (createAsesorForm) {
    createAsesorForm.addEventListener("submit", handleCreateAsesorSubmit)
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
}

// Manejar envío de filtros
function handleFilterSubmit(e) {
  if (e && e.preventDefault) {
    e.preventDefault()
  }

  const searchInput = document.getElementById("searchName")
  const params = new URLSearchParams()

  // Agregar parámetro de búsqueda si no está vacío
  if (searchInput && searchInput.value.trim() !== "") {
    params.append("buscar", searchInput.value.trim())
  }

  // Redirigir con filtros
  const newUrl = window.location.pathname + (params.toString() ? "?" + params.toString() : "")
  window.location.href = newUrl
}

// Limpiar filtros
function limpiarFiltros() {
  const searchInput = document.getElementById("searchName")
  if (searchInput) searchInput.value = ""

  // Redirigir sin parámetros
  window.location.href = window.location.pathname
}

// Inicializar modales
function initModals() {
  const modal = document.getElementById("confirmModal")
  const editModal = document.getElementById("editAsesorModal")

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        hideModal()
      }
    })
  }

  if (editModal) {
    editModal.addEventListener("click", (e) => {
      if (e.target === editModal) {
        hideEditModal()
      }
    })
  }
}

function showButtonSpinner(btn) {
  if (!btn) return
  btn.dataset.originalContent = btn.innerHTML
  btn.innerHTML = `
    <span class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></span>
  `
  btn.disabled = true
}

function hideButtonSpinner(btn) {
  if (!btn || !btn.dataset.originalContent) return
  btn.innerHTML = btn.dataset.originalContent
  btn.disabled = false
  delete btn.dataset.originalContent
}

// Función para editar asesor
function editarAsesor(asesorId) {
  if (!asesorId) {
    showNotification("Error: ID de asesor no válido", "error")
    return
  }
  const btn = document.getElementById(`btn-editar-${asesorId}`)
  showButtonSpinner(btn)
  cargarDatosAsesor(asesorId, btn)
}

// Cargar datos del asesor para edición
async function cargarDatosAsesor(asesorId, btn) {
  try {
    const response = await fetch(`/admin/asesores/${asesorId}/datos`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    })

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`)
    }

    const data = await response.json()

    if (data.success) {
      document.getElementById("editAsesorId").value = data.asesor.id_asesor
      document.getElementById("editNombre").value = data.asesor.nombre || ""
      document.getElementById("editApellidos").value = data.asesor.apellidos || ""
      document.getElementById("editCorreo").value = data.asesor.correo || ""

      showEditModal()
    } else {
      showNotification(data.error || "Error al cargar datos del asesor", "error")
    }
  } catch (error) {
    console.error("Error:", error)
    showNotification("Error de conexión al cargar datos del asesor", "error")
  } finally {
    // Oculta el spinner cuando el modal aparece o hay error
    if (btn) hideButtonSpinner(btn)
  }
}

// Función para eliminar asesor
function eliminarAsesor(asesorId) {
  if (!asesorId) {
    showNotification("Error: ID de asesor no válido", "error")
    return
  }
  const btn = document.getElementById(`btn-eliminar-${asesorId}`)
  showButtonSpinner(btn)
  currentAsesorId = asesorId
  currentAction = "eliminar"
  showModal(
    "Eliminar Asesor",
    "¿Estás seguro de que quieres eliminar este asesor? Esta acción no se puede deshacer y se verificará que no tenga asesorías asociadas.",
    btn
  )
}

// Mostrar modal de confirmación
function showModal(title, message, btn) {
  const modal = document.getElementById("confirmModal")
  const modalTitle = document.getElementById("modalTitle")
  const modalMessage = document.getElementById("modalMessage")

  if (modal && modalTitle && modalMessage) {
    modalTitle.textContent = title
    modalMessage.textContent = message
    modal.classList.remove("hidden")
    modal.classList.add("flex")
    document.body.style.overflow = "hidden"

    // Oculta el spinner cuando el modal aparece
    if (btn) hideButtonSpinner(btn)

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
    modal.classList.remove("flex")
    modal.classList.add("hidden")
    document.body.style.overflow = "auto"
  }

  currentAsesorId = null
  currentAction = null
}

// Mostrar modal de edición
function showEditModal() {
  const modal = document.getElementById("editAsesorModal")
  if (modal) {
    modal.classList.remove("hidden")
    modal.classList.add("flex")
    document.body.style.overflow = "hidden"

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
    modal.classList.remove("flex")
    modal.classList.add("hidden")
    document.body.style.overflow = "auto"

    // Limpiar formulario
    const form = document.getElementById("editAsesorForm")
    if (form) {
      form.reset()
    }
  }
}

// Manejar envío del formulario de edición
async function handleEditAsesorSubmit(e) {
  e.preventDefault()

  const saveBtn = document.getElementById("saveAsesorBtn")
  const originalButtonContent = saveBtn.innerHTML

  if (saveBtn) {
    saveBtn.disabled = true
    saveBtn.innerHTML = `
            <div class="flex items-center justify-center">
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
    }

    // Si se ingresa una nueva contraseña, agregarla
    const password = formData.get("password")
    if (password && password.length > 0) {
      if (password.length < 8) {
        showNotification("La contraseña debe tener al menos 8 caracteres", "error")
        return
      }
      asesorData.password = password
    }

    // Validaciones del lado del cliente
    if (!asesorData.nombre || !asesorData.apellidos || !asesorData.correo) {
      showNotification("Todos los campos son obligatorios", "error")
      return
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(asesorData.correo)) {
      showNotification("El formato del correo electrónico no es válido", "error")
      return
    }

    const response = await fetch(`/admin/asesores/${asesorId}/editar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(asesorData),
    })

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`)
    }

    const data = await response.json()

    if (data.success) {
      showNotification(data.mensaje, "success")
      hideEditModal()
      setTimeout(() => window.location.reload(), 1500)
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
    let endpoint = ""
    if (currentAction === "eliminar") {
      endpoint = `/admin/asesores/${currentAsesorId}/eliminar`
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    })

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`)
    }

    const data = await response.json()

    if (data.success) {
      showNotification(data.mensaje, "success")
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } else {
      showNotification(data.error || "Error al procesar la acción", "error")
    }
  } catch (error) {
    console.error("Error:", error)
    showNotification("Error de conexión. Inténtalo de nuevo.", "error")
  } finally {
    hideModal()

    if (confirmBtn) {
      confirmBtn.disabled = false
      confirmBtn.innerHTML = originalButtonContent
    }
  }
}

// Sistema de notificaciones mejorado
function showNotification(message, type = "info") {
  const container = document.getElementById("toast-container")
  if (!container) {
    console.warn("Toast container not found")
    return
  }

  const notification = document.createElement("div")
  notification.className = `max-w-sm w-full bg-white shadow-lg rounded-2xl pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transform transition-all duration-500 translate-x-full`

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
    case "info":
      bgColor = "bg-blue-50"
      iconColor = "text-blue-400"
      borderColor = "border-l-4 border-blue-500"
      icon =
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
      break
    default:
      bgColor = "bg-gray-50"
      iconColor = "text-gray-400"
      borderColor = "border-l-4 border-gray-500"
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
                    <button class="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500" onclick="this.closest('.max-w-sm').remove()">
                        <span class="sr-only">Cerrar</span>
                        <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414z" clip-rule="evenodd"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `

  container.appendChild(notification)

  // Mostrar notificación
  setTimeout(() => {
    notification.classList.remove("translate-x-full")
    notification.classList.add("translate-x-0")
  }, 100)

  // Auto-ocultar después de 5 segundos
  setTimeout(() => {
    notification.classList.remove("translate-x-0")
    notification.classList.add("translate-x-full")
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove()
      }
    }, 500)
  }, 5000)
}

// Función para mostrar modal de crear asesor
function mostrarModalCrearAsesor() {
  const modal = document.getElementById("createAsesorModal")
  if (modal) {
    modal.classList.remove("hidden")
    modal.classList.add("flex")
    document.body.style.overflow = "hidden"

    const firstInput = document.getElementById("createNombre")
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 300)
    }
  }
}

// Función para ocultar modal de crear asesor
function hideCreateModal() {
  const modal = document.getElementById("createAsesorModal")
  if (modal) {
    modal.classList.remove("flex")
    modal.classList.add("hidden")
    document.body.style.overflow = "auto"

    // Limpiar formulario
    const form = document.getElementById("createAsesorForm")
    if (form) {
      form.reset()
    }
  }
}

// Manejar envío del formulario de crear asesor
async function handleCreateAsesorSubmit(e) {
  e.preventDefault()

  const saveBtn = document.getElementById("createAsesorBtn")
  const originalButtonContent = saveBtn.innerHTML

  if (saveBtn) {
    saveBtn.disabled = true
    saveBtn.innerHTML = `
            <div class="flex items-center justify-center">
                <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                <span>Creando...</span>
            </div>
        `
  }

  try {
    const formData = new FormData(e.target)

    const asesorData = {
      nombre: formData.get("nombre"),
      apellidos: formData.get("apellidos"),
      correo: formData.get("correo"),
      password: formData.get("password"),
    }

    // Validaciones del lado del cliente
    if (!asesorData.nombre || !asesorData.apellidos || !asesorData.correo || !asesorData.password) {
      showNotification("Todos los campos son obligatorios", "error")
      return
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(asesorData.correo)) {
      showNotification("El formato del correo electrónico no es válido", "error")
      return
    }

    // Validar contraseña
    if (asesorData.password.length < 8) {
      showNotification("La contraseña debe tener al menos 8 caracteres", "error")
      return
    }

    const response = await fetch("/admin/asesores/crear", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(asesorData),
    })

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`)
    }

    const data = await response.json()

    if (data.success) {
      showNotification(data.mensaje, "success")
      hideCreateModal()
      setTimeout(() => window.location.reload(), 1500)
    } else {
      showNotification(data.error || "Error al crear asesor", "error")
    }
  } catch (error) {
    console.error("Error:", error)
    showNotification("Error de conexión al crear asesor", "error")
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false
      saveBtn.innerHTML = originalButtonContent
    }
  }
}

// Manejar tecla Escape para cerrar modales
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    hideModal()
    hideEditModal()
    hideCreateModal()
  }
})