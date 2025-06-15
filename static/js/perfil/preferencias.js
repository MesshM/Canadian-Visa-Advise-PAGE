document.addEventListener("DOMContentLoaded", () => {
  // Referencias a elementos del DOM
  const notificationToggles = document.querySelectorAll(".notification-toggle")
  const languageSelector = document.getElementById("language-selector")
  const themeSelector = document.getElementById("theme-selector")
  const savePreferencesBtn = document.getElementById("save-preferences-btn")
  const preferencesContainer = document.querySelector(".tab-content#preferences-content")

  // Añadir clase de carga y deshabilitar toggles inicialmente
  if (preferencesContainer) {
    preferencesContainer.classList.add("preferences-loading")
  }

  // Deshabilitar todos los toggles y selectores durante la carga
  notificationToggles.forEach((toggle) => {
    toggle.disabled = true
    // Ocultar el estado visual del toggle durante la carga
    const toggleParent = toggle.closest("label")
    if (toggleParent) {
      toggleParent.classList.add("opacity-60")
    }
  })

  if (languageSelector) languageSelector.disabled = true
  if (themeSelector) themeSelector.disabled = true
  if (savePreferencesBtn) savePreferencesBtn.disabled = true

  // Estado inicial de las preferencias
  let preferences = {
    notifications: {
      visa_updates: true,
      document_reminders: true,
      news: true,
      appointments: true,
    },
    channels: {
      email: true,
      sms: true,
      app: true,
    },
    language: "es",
    theme: "light",
  }

  // Cargar preferencias del usuario
  function loadUserPreferences() {
    // Mostrar indicador de carga
    if (savePreferencesBtn) {
      savePreferencesBtn.innerHTML =
        '<div class="flex items-center justify-center"><div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div><span>Cargando...</span></div>'
    }

    fetch("/perfil/obtener_preferencias")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          // Si hay preferencias guardadas, usarlas
          preferences = data.preferences
        } else {
          // Si no hay preferencias guardadas, usar los valores predeterminados (todas las notificaciones activas)
          preferences = {
            notifications: {
              visa_updates: true,
              document_reminders: true,
              news: true,
              appointments: true,
            },
            channels: {
              email: true,
              sms: true,
              app: true,
            },
            language: "es",
            theme: "light",
          }
        }
        // Pequeño retraso para asegurar que el DOM esté listo
        setTimeout(() => {
          updateUIFromPreferences()
          // Habilitar la interacción después de cargar
          enableInteraction()
        }, 100)
      })
      .catch((error) => {
        console.error("Error al cargar preferencias:", error)
        showAlert("No se pudieron cargar tus preferencias. Por favor, intenta de nuevo más tarde.", "error")
        // Habilitar la interacción incluso si hay error, usando valores predeterminados
        setTimeout(() => {
          updateUIFromPreferences()
          enableInteraction()
        }, 100)
      })
  }

  // Habilitar la interacción con los controles
  function enableInteraction() {
    // Quitar clase de carga
    if (preferencesContainer) {
      preferencesContainer.classList.remove("preferences-loading")
    }

    // Habilitar todos los toggles y selectores
    notificationToggles.forEach((toggle) => {
      toggle.disabled = false
      const toggleParent = toggle.closest("label")
      if (toggleParent) {
        toggleParent.classList.remove("opacity-60")
      }
    })

    if (languageSelector) languageSelector.disabled = false
    if (themeSelector) themeSelector.disabled = false
    if (savePreferencesBtn) {
      savePreferencesBtn.disabled = false
      savePreferencesBtn.innerHTML =
        '<div class="relative flex items-center justify-center"><svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>Guardar Cambios</span></div>'
    }
  }

  // Actualizar la interfaz con las preferencias cargadas
  function updateUIFromPreferences() {
    // Actualizar toggles de notificaciones de forma más eficiente
    notificationToggles.forEach((toggle) => {
      const type = toggle.dataset.type
      const channel = toggle.dataset.channel

      if (type && preferences.notifications[type] !== undefined) {
        toggle.checked = preferences.notifications[type]
      } else if (channel && preferences.channels[channel] !== undefined) {
        toggle.checked = preferences.channels[channel]
      }

      // Forzar actualización visual del toggle
      const toggleDiv = toggle.nextElementSibling
      if (toggleDiv) {
        // Las clases peer-checked se aplican automáticamente por Tailwind
        // Solo necesitamos asegurarnos de que el estado checked del input sea correcto
        toggle.checked = type ? preferences.notifications[type] : preferences.channels[channel]
      }
    })

    // Actualizar selectores
    if (languageSelector) {
      languageSelector.value = preferences.language
    }

    if (themeSelector) {
      themeSelector.value = preferences.theme
    }
  }

  // Guardar preferencias
  function savePreferences() {
    // Mostrar indicador de carga
    savePreferencesBtn.disabled = true
    savePreferencesBtn.innerHTML =
      '<div class="flex items-center justify-center"><div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div><span>Guardando...</span></div>'

    fetch("/perfil/actualizar_preferencias", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferences),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          showAlert("Preferencias actualizadas correctamente", "success")
        } else {
          showAlert(data.error || "Error al actualizar preferencias", "error")
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        showAlert("Error al guardar preferencias", "error")
      })
      .finally(() => {
        // Restaurar botón
        savePreferencesBtn.disabled = false
        savePreferencesBtn.innerHTML =
          '<div class="relative flex items-center justify-center"><svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>Guardar Cambios</span></div>'
      })
  }

  // Mostrar alerta
  function showAlert(message, type = "success") {
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
      notification.classList.add("bg-blue-100", "text-blue-800", "border-l-4", "border-blue-200")
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

  // Event listeners
  if (notificationToggles) {
    notificationToggles.forEach((toggle) => {
      toggle.addEventListener("change", function () {
        const type = this.dataset.type
        const channel = this.dataset.channel

        if (type) {
          preferences.notifications[type] = this.checked
        } else if (channel) {
          preferences.channels[channel] = this.checked
        }
      })
    })
  }

  // Asegurar que los toggles respondan correctamente al clic
  document.querySelectorAll(".notification-toggle").forEach((toggle) => {
    const toggleParent = toggle.closest("label")
    if (toggleParent) {
      toggleParent.addEventListener("click", (e) => {
        // Prevenir comportamiento predeterminado para manejar manualmente
        e.preventDefault()
        // Cambiar el estado del toggle
        toggle.checked = !toggle.checked

        // Actualizar las preferencias
        const type = toggle.dataset.type
        const channel = toggle.dataset.channel

        if (type) {
          preferences.notifications[type] = toggle.checked
        } else if (channel) {
          preferences.channels[channel] = toggle.checked
        }
      })
    }
  })

  if (languageSelector) {
    languageSelector.addEventListener("change", function () {
      preferences.language = this.value
      showAlert("Las opciones de idioma están en desarrollo y pueden no funcionar correctamente.", "warning")
    })
  }

  if (themeSelector) {
    themeSelector.addEventListener("change", function () {
      preferences.theme = this.value
      showAlert("Las opciones de tema están en desarrollo y pueden no funcionar correctamente.", "warning")

      // Aplicar tema inmediatamente
      document.documentElement.classList.remove("light", "dark")
      document.documentElement.classList.add(this.value)
    })
  }

  if (savePreferencesBtn) {
    savePreferencesBtn.addEventListener("click", savePreferences)
  }

  // Cargar preferencias al iniciar
  loadUserPreferences()
})
