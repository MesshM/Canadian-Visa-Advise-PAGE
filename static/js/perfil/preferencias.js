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
        if (toggle.checked) {
          toggleDiv.classList.add("peer-checked:bg-primary-600")
          toggleDiv.classList.add("peer-checked:after:translate-x-full")
        } else {
          toggleDiv.classList.remove("peer-checked:bg-primary-600")
          toggleDiv.classList.remove("peer-checked:after:translate-x-full")
        }
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
  function showAlert(message, type) {
    const alertContainer = document.getElementById("alert-container")
    const alert = document.getElementById("alert")

    if (alertContainer && alert) {
      // Configurar el estilo según el tipo
      if (type === "success") {
        alert.className = "p-4 rounded-xl border animate-fade-in shadow-md bg-green-50 border-green-200 text-green-700"
        alert.innerHTML = `
                <div class="flex items-start">
                    <svg class="w-5 h-5 mr-3 mt-0.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>${message}</span>
                </div>
            `
      } else if (type === "warning") {
        alert.className =
          "p-4 rounded-xl border animate-fade-in shadow-md bg-yellow-50 border-yellow-200 text-yellow-700"
        alert.innerHTML = `
                <div class="flex items-start">
                    <svg class="w-5 h-5 mr-3 mt-0.5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>${message}</span>
                </div>
            `
      } else {
        alert.className = "p-4 rounded-xl border animate-fade-in shadow-md bg-red-50 border-red-200 text-red-700"
        alert.innerHTML = `
                <div class="flex items-start">
                    <svg class="w-5 h-5 mr-3 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>${message}</span>
                </div>
            `
      }

      // Mostrar la alerta
      alertContainer.classList.remove("hidden")
      alertContainer.classList.add("flex")

      // Ocultar después de 5 segundos
      setTimeout(() => {
        alertContainer.classList.add("hidden")
        alertContainer.classList.remove("flex")
      }, 5000)
    }
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
