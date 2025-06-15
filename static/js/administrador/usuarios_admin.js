// Administrador - Gestión de Usuarios
document.addEventListener("DOMContentLoaded", () => {
    initFilters()
    initSearch()
    initUserActions()
    initPagination()
  })
  
  // Inicializar filtros
  function initFilters() {
    const filterRole = document.getElementById("filterRole")
    const filterStatus = document.getElementById("filterStatus")
    const searchName = document.getElementById("searchName")
    ;[filterRole, filterStatus, searchName].forEach((element) => {
      if (element) {
        element.addEventListener("change", applyFilters)
      }
    })
  
    // Botón de filtrar
    const filterBtn = document.querySelector('button[type="button"]')
    if (filterBtn) {
      filterBtn.addEventListener("click", applyFilters)
    }
  }
  
  // Inicializar búsqueda
  function initSearch() {
    const searchInput = document.getElementById("searchName")
    if (searchInput) {
      let searchTimeout
      searchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout)
        searchTimeout = setTimeout(() => {
          applyFilters()
        }, 500)
      })
    }
  }
  
  // Aplicar filtros
  async function applyFilters() {
    const filters = {
      nombre: document.getElementById("searchName")?.value || "",
      rol: document.getElementById("filterRole")?.value || "",
      estado: document.getElementById("filterStatus")?.value || "",
    }
  
    try {
      const params = new URLSearchParams(filters)
      const response = await fetch(`/admin/usuarios/buscar?${params}`)
      const data = await response.json()
  
      if (data.success) {
        updateUsersTable(data.usuarios)
        updatePagination(data.pagination)
      }
    } catch (error) {
      console.error("Error aplicando filtros:", error)
      showToast("Error al filtrar usuarios", "error")
    }
  }
  
  // Actualizar tabla de usuarios
  function updateUsersTable(usuarios) {
    const tbody = document.querySelector("tbody")
    if (!tbody) return
  
    if (usuarios.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No hay usuarios que coincidan con los filtros</td></tr>'
      return
    }
  
    tbody.innerHTML = usuarios
      .map(
        (usuario) => `
          <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                      <div class="h-10 w-10 flex-shrink-0 bg-gray-200 rounded-full text-gray-500 flex items-center justify-center">
                          ${usuario.nombres?.[0] || "U"}${usuario.apellidos?.[0] || ""}
                      </div>
                      <div class="ml-4">
                          <div class="text-sm font-medium text-gray-900">${usuario.nombres} ${usuario.apellidos}</div>
                          <div class="text-sm text-gray-500">${usuario.correo}</div>
                      </div>
                  </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(usuario.rol)}">
                      ${usuario.rol || "Cliente"}
                  </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${formatDate(usuario.fecha_registro)}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(usuario.estado)}">
                      ${usuario.estado || "Activo"}
                  </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${formatDate(usuario.ultimo_acceso) || "Nunca"}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex justify-end space-x-2">
                      <a href="/admin/usuarios/${usuario.id_usuario}/editar" class="text-primary-600 hover:text-primary-900">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                          </svg>
                      </a>
                      <button onclick="toggleUserStatus(${usuario.id_usuario})" class="text-yellow-600 hover:text-yellow-900">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"></path>
                          </svg>
                      </button>
                      <button onclick="deleteUser(${usuario.id_usuario})" class="text-red-600 hover:text-red-900">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                      </button>
                  </div>
              </td>
          </tr>
      `,
      )
      .join("")
  }
  
  // Inicializar acciones de usuario
  function initUserActions() {
    // Las funciones se definen globalmente para ser llamadas desde los botones
  }
  
  // Cambiar estado de usuario
  async function toggleUserStatus(userId) {
    if (!confirm("¿Estás seguro de que quieres cambiar el estado de este usuario?")) {
      return
    }
  
    try {
      const response = await fetch(`/admin/usuarios/${userId}/toggle-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
  
      const data = await response.json()
  
      if (data.success) {
        showToast("Estado del usuario actualizado correctamente")
        applyFilters() // Recargar tabla
      } else {
        showToast(data.message || "Error al cambiar estado", "error")
      }
    } catch (error) {
      console.error("Error:", error)
      showToast("Error al cambiar estado del usuario", "error")
    }
  }
  
  // Eliminar usuario
  async function deleteUser(userId) {
    if (!confirm("¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.")) {
      return
    }
  
    try {
      const response = await fetch(`/admin/usuarios/${userId}/eliminar`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })
  
      const data = await response.json()
  
      if (data.success) {
        showToast("Usuario eliminado correctamente")
        applyFilters() // Recargar tabla
      } else {
        showToast(data.message || "Error al eliminar usuario", "error")
      }
    } catch (error) {
      console.error("Error:", error)
      showToast("Error al eliminar usuario", "error")
    }
  }
  
  // Funciones de utilidad
  function getRoleBadgeClass(rol) {
    switch (rol) {
      case "Administrador":
        return "bg-red-100 text-red-800"
      case "Asesor":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-green-100 text-green-800"
    }
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
  
  function formatDate(dateString) {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES")
  }
  
  function initPagination() {
    // Implementar paginación si es necesario
  }
  
  function updatePagination(pagination) {
    // Actualizar controles de paginación
  }
  
  function showToast(message, type = "success") {
    const toast = document.createElement("div")
    toast.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
      type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
    }`
    toast.textContent = message
  
    document.body.appendChild(toast)
  
    setTimeout(() => {
      toast.remove()
    }, 3000)
  }
  