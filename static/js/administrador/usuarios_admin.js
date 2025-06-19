// Administrador - Gestión de Usuarios
let currentUserId = null
let currentAction = null

document.addEventListener("DOMContentLoaded", () => {
  initializeEventListeners()
  initializeFilters()
  initUserActions()
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

  // Formulario de edición de usuario
  const editUserForm = document.getElementById("editUserForm")
  if (editUserForm) {
    editUserForm.addEventListener("submit", handleEditUserSubmit)
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

// Inicializar acciones de usuario
function initUserActions() {
  console.log("Acciones de usuario inicializadas")
}

// Inicializar modales
function initModals() {
  const modal = document.getElementById("confirmModal")
  const editModal = document.getElementById("editUserModal")

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

// Función para editar usuario - ahora abre modal
function editarUsuario(userId) {
  if (!userId) {
    showNotification("Error: ID de usuario no válido", "error")
    return
  }

  // Cargar datos del usuario
  cargarDatosUsuario(userId)
}

// Cargar datos del usuario para edición
async function cargarDatosUsuario(userId) {
  try {
    const response = await fetch(`/admin/usuarios/${userId}/datos`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    })

    if (!response.ok) {
      throw new Error("Error al cargar datos del usuario")
    }

    const data = await response.json()

    if (data.success) {
      // Llenar el formulario del modal
      document.getElementById("editUserId").value = data.usuario.id_usuario
      document.getElementById("editNombres").value = data.usuario.nombres || ""
      document.getElementById("editApellidos").value = data.usuario.apellidos || ""
      document.getElementById("editCorreo").value = data.usuario.correo || ""
      document.getElementById("editCelular").value = data.usuario.celular || ""
      document.getElementById("editFechaNacimiento").value = data.usuario.fecha_nacimiento || ""

      // Mostrar modal
      showEditModal()
    } else {
      showNotification(data.error || "Error al cargar datos del usuario", "error")
    }
  } catch (error) {
    console.error("Error:", error)
    showNotification("Error de conexión al cargar datos del usuario", "error")
  }
}

// Mostrar modal de edición
function showEditModal() {
  const modal = document.getElementById("editUserModal")
  if (modal) {
    modal.classList.remove("hidden")
    modal.classList.add("flex")
    document.body.style.overflow = "hidden"

    // Enfocar el primer campo
    const firstInput = document.getElementById("editNombres")
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 300)
    }
  }
}

// Ocultar modal de edición
function hideEditModal() {
  const modal = document.getElementById("editUserModal")
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
      document.getElementById("editUserForm").reset()

      if (modalContent) {
        modalContent.classList.remove("opacity-0", "scale-95", "transition-all", "duration-300")
      }
    }, 300)
  }
}

// Función para eliminar usuario
function deleteUser(userId) {
  if (!userId) {
    showNotification("Error: ID de usuario no válido", "error")
    return
  }

  currentUserId = userId
  currentAction = "delete"

  showModal(
    "Eliminar Usuario",
    "¿Estás seguro de que quieres eliminar permanentemente este usuario? Esta acción no se puede deshacer.",
  )
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
  currentUserId = null
  currentAction = null
}

// Manejar envío del formulario de edición
async function handleEditUserSubmit(e) {
  e.preventDefault()

  const saveBtn = document.getElementById("saveUserBtn")
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
    const userId = formData.get("user_id")

    const userData = {
      nombres: formData.get("nombres"),
      apellidos: formData.get("apellidos"),
      correo: formData.get("correo"),
      celular: formData.get("celular"),
      fecha_nacimiento: formData.get("fecha_nacimiento"),
    }

    const response = await fetch(`/admin/usuarios/${userId}/editar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(userData),
    })

    const data = await response.json()

    if (data.success) {
      showNotification(data.mensaje, "success")
      hideEditModal()

      // Actualizar la fila en la tabla
      updateUserRowInTable(userId, userData)
    } else {
      showNotification(data.error || "Error al actualizar usuario", "error")
    }
  } catch (error) {
    console.error("Error:", error)
    showNotification("Error de conexión al actualizar usuario", "error")
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false
      saveBtn.innerHTML = originalButtonContent
    }
  }
}

// Actualizar fila del usuario en la tabla
function updateUserRowInTable(userId, userData) {
  const row = document.querySelector(`tr[data-usuario-id="${userId}"]`)
  if (row) {
    // Actualizar nombre y correo
    const nameCell = row.querySelector(".text-sm.font-medium.text-gray-900")
    const emailCell = row.querySelector(".text-sm.text-gray-500")

    if (nameCell) {
      nameCell.textContent = `${userData.nombres} ${userData.apellidos}`
    }

    if (emailCell) {
      emailCell.textContent = userData.correo
    }

    // Actualizar iniciales en el avatar
    const avatar = row.querySelector(".h-10.w-10")
    if (avatar && userData.nombres && userData.apellidos) {
      avatar.textContent = userData.nombres[0] + userData.apellidos[0]
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
  if (!currentUserId || !currentAction) {
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
    if (currentAction === "delete") {
      const response = await fetch(`/admin/usuarios/${currentUserId}/eliminar`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      })

      const data = await response.json()

      if (data.success) {
        showNotification(data.mensaje, "success")
        removeUserFromTable(currentUserId)
      } else {
        showNotification(data.error || "Error al eliminar usuario", "error")
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

// Remover usuario de la tabla
function removeUserFromTable(userId) {
  const row = document.querySelector(`tr[data-usuario-id="${userId}"]`)
  if (row) {
    row.style.transition = "opacity 0.3s ease, transform 0.3s ease"
    row.style.opacity = "0"
    row.style.transform = "translateX(-20px)"

    setTimeout(() => {
      row.remove()

      // Verificar si quedan usuarios en la tabla
      const tbody = document.getElementById("usuariosTableBody")
      if (tbody && tbody.children.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No hay usuarios registrados</td></tr>'
      }
    }, 300)
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
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>'
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
