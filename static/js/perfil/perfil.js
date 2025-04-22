// Archivo principal que carga todos los módulos y contiene funcionalidades compartidas
document.addEventListener("DOMContentLoaded", () => {
  // Navegación de pestañas
  const tabButtons = document.querySelectorAll(".tab-button")
  const tabContents = document.querySelectorAll(".tab-content")

  // Mejora 1: Añadir animaciones más suaves para las transiciones de pestañas
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = button.getAttribute("data-tab")

      // Actualizar botones con transiciones más suaves y efectos mejorados
      tabButtons.forEach((btn) => {
        btn.classList.remove("bg-primary-50", "text-primary-700", "border", "shadow-sm", "scale-105")
        btn.classList.add("text-gray-600", "hover:bg-gray-50", "hover:text-gray-900", "transition-all", "duration-300")

        // Reducir el tamaño de los iconos en las pestañas inactivas
        const icon = btn.querySelector("svg")
        if (icon) {
          icon.classList.remove("text-primary-600")
          icon.classList.add("text-gray-500")
        }
      })

      button.classList.remove("text-gray-600", "hover:bg-gray-50", "hover:text-gray-900")
      button.classList.add(
        "bg-primary-50",
        "text-primary-700",
        "border",
        "shadow-sm",
        "transition-all",
        "duration-300",
        "scale-105",
      )

      // Destacar el icono en la pestaña activa
      const activeIcon = button.querySelector("svg")
      if (activeIcon) {
        activeIcon.classList.remove("text-gray-500")
        activeIcon.classList.add("text-primary-600")
      }

      // Actualizar contenidos con animación de fade
      tabContents.forEach((content) => {
        content.classList.add("hidden")
        content.classList.remove("animate-fade-in")
      })
      const activeContent = document.getElementById(`${tabId}-content`)
      activeContent.classList.remove("hidden")
      // Forzar un reflow para que la animación se ejecute
      void activeContent.offsetWidth
      activeContent.classList.add("animate-fade-in")

      // Guardar la pestaña activa en localStorage
      localStorage.setItem("activeTab", tabId)
    })
  })

  // Añadir efectos de hover mejorados a las pestañas
  tabButtons.forEach((button) => {
    button.addEventListener("mouseenter", () => {
      if (!button.classList.contains("bg-primary-50")) {
        button.classList.add("bg-gray-50", "scale-105", "shadow-sm")

        const icon = button.querySelector("svg")
        if (icon) {
          icon.classList.add("text-gray-700")
        }
      }
    })

    button.addEventListener("mouseleave", () => {
      if (!button.classList.contains("bg-primary-50")) {
        button.classList.remove("bg-gray-50", "scale-105", "shadow-sm")

        const icon = button.querySelector("svg")
        if (icon) {
          icon.classList.remove("text-gray-700")
        }
      }
    })
  })

  // Restaurar la pestaña activa desde localStorage
  const activeTab = localStorage.getItem("activeTab")
  if (activeTab) {
    const activeButton = document.querySelector(`.tab-button[data-tab="${activeTab}"]`)
    if (activeButton) {
      activeButton.click()
    }
  }

  // Función para mostrar alertas (compartida por todos los módulos)
  window.showAlert = (message, type = "success") => {
    // Crear el elemento de notificación
    const notification = document.createElement("div")
    notification.className = `fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 transform transition-all duration-500 translate-x-full`

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

  // Cargar los módulos específicos
  // Estos scripts se cargarán automáticamente si están incluidos en el HTML
})
