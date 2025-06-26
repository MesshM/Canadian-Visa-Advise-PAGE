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
    btn,
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

// Sistema de notificaciones mejorado y más estético
function showNotification(message, type = "info") {
  const container = document.getElementById("toast-container")
  if (!container) {
    console.warn("Toast container not found")
    return
  }

  const notification = document.createElement("div")

  // Configuración de estilos según el tipo
  let bgGradient, iconColor, icon, borderColor, shadowColor

  switch (type) {
    case "success":
      bgGradient = "bg-gradient-to-r from-green-50 to-emerald-50"
      iconColor = "text-green-600"
      borderColor = "border-l-4 border-green-500"
      shadowColor = "shadow-green-200/50"
      icon = `
        <div class="relative">
          <div class="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
          <div class="relative bg-green-500 rounded-full p-2">
            <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        </div>
      `
      break
    case "error":
      bgGradient = "bg-gradient-to-r from-red-50 to-rose-50"
      iconColor = "text-red-600"
      borderColor = "border-l-4 border-red-500"
      shadowColor = "shadow-red-200/50"
      icon = `
        <div class="relative">
          <div class="absolute inset-0 bg-red-500 rounded-full animate-pulse opacity-20"></div>
          <div class="relative bg-red-500 rounded-full p-2">
            <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
        </div>
      `
      break
    case "info":
      bgGradient = "bg-gradient-to-r from-blue-50 to-indigo-50"
      iconColor = "text-blue-600"
      borderColor = "border-l-4 border-blue-500"
      shadowColor = "shadow-blue-200/50"
      icon = `
        <div class="relative">
          <div class="absolute inset-0 bg-blue-500 rounded-full animate-pulse opacity-20"></div>
          <div class="relative bg-blue-500 rounded-full p-2">
            <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
        </div>
      `
      break
    default:
      bgGradient = "bg-gradient-to-r from-gray-50 to-slate-50"
      iconColor = "text-gray-600"
      borderColor = "border-l-4 border-gray-500"
      shadowColor = "shadow-gray-200/50"
      icon = `
        <div class="relative bg-gray-500 rounded-full p-2">
          <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
      `
  }

  // Estructura de la notificación mejorada
  notification.className = `
    max-w-sm w-full fixed right-4 top-4 z-[100] transform transition-all duration-700 ease-out
    translate-x-full opacity-0 scale-95 pointer-events-auto
    ${type === "error" ? "animate-shake" : ""}
  `.replace(/\s+/g, " ")

  notification.innerHTML = `
    <div class="relative overflow-hidden rounded-2xl ${bgGradient} ${borderColor} ${shadowColor} shadow-2xl backdrop-blur-sm">
      <!-- Efecto de brillo animado -->
      <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-shimmer"></div>
      
      <div class="relative p-4">
        <div class="flex items-start space-x-4">
          <!-- Icono animado -->
          <div class="flex-shrink-0 mt-0.5">
            ${icon}
          </div>
          
          <!-- Contenido -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <p class="text-sm font-semibold text-gray-900 leading-5 mb-1">
                  ${type === "success" ? "¡Éxito!" : type === "error" ? "¡Error!" : "Información"}
                </p>
                <p class="text-sm text-gray-700 leading-relaxed">${message}</p>
              </div>
              
              <!-- Botón cerrar mejorado -->
              <button class="ml-4 flex-shrink-0 rounded-full p-1.5 hover:bg-white/20 transition-colors duration-200 group" 
                      onclick="this.closest('.max-w-sm').remove()">
                <svg class="h-4 w-4 text-gray-500 group-hover:text-gray-700 transition-colors duration-200" 
                     fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414z" clip-rule="evenodd"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Barra de progreso para auto-cierre -->
        <div class="absolute bottom-0 left-0 h-1 bg-gradient-to-r ${type === "success" ? "from-green-400 to-emerald-500" : type === "error" ? "from-red-400 to-rose-500" : "from-blue-400 to-indigo-500"} rounded-full animate-progress"></div>
      </div>
    </div>
    
    <style>
      @keyframes shake {
        10%, 90% { transform: translateX(-2px); }
        20%, 80% { transform: translateX(4px); }
        30%, 50%, 70% { transform: translateX(-8px); }
        40%, 60% { transform: translateX(8px); }
      }
      
      @keyframes shimmer {
        0% { transform: translateX(-100%) skewX(-12deg); }
        100% { transform: translateX(200%) skewX(-12deg); }
      }
      
      @keyframes progress {
        0% { width: 100%; }
        100% { width: 0%; }
      }
      
      .animate-shake { 
        animation: shake 0.6s ease-in-out; 
      }
      
      .animate-shimmer { 
        animation: shimmer 2s ease-in-out infinite; 
      }
      
      .animate-progress { 
        animation: progress ${type === "error" ? "4s" : "5s"} linear forwards; 
      }
    </style>
  `

  container.appendChild(notification)

  // Animación de entrada mejorada
  setTimeout(() => {
    notification.classList.remove("translate-x-full", "opacity-0", "scale-95")
    notification.classList.add("translate-x-0", "opacity-100", "scale-100")
  }, 100)

  // Auto-ocultar con animación de salida
  const hideTimeout = setTimeout(
    () => {
      notification.classList.remove("translate-x-0", "opacity-100", "scale-100")
      notification.classList.add("translate-x-full", "opacity-0", "scale-95")

      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove()
        }
      }, 500)
    },
    type === "error" ? 4500 : 5500,
  )

  // Pausar auto-cierre al hacer hover
  notification.addEventListener("mouseenter", () => {
    clearTimeout(hideTimeout)
    const progressBar = notification.querySelector(".animate-progress")
    if (progressBar) {
      progressBar.style.animationPlayState = "paused"
    }
  })

  // Reanudar auto-cierre al quitar hover
  notification.addEventListener("mouseleave", () => {
    const progressBar = notification.querySelector(".animate-progress")
    if (progressBar) {
      progressBar.style.animationPlayState = "running"
    }

    setTimeout(() => {
      if (notification.parentNode) {
        notification.classList.remove("translate-x-0", "opacity-100", "scale-100")
        notification.classList.add("translate-x-full", "opacity-0", "scale-95")

        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove()
          }
        }, 500)
      }
    }, 2000)
  })
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
