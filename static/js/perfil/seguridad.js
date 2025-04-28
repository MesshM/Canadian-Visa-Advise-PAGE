// Modificar la función showAlert para que esté disponible globalmente
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

document.addEventListener("DOMContentLoaded", () => {
  // Referencias a elementos del DOM para cambio de contraseña
  const passwordForm = document.getElementById("password-form")
  const currentPasswordInput = document.getElementById("current-password")
  const newPasswordInput = document.getElementById("new-password")
  const confirmPasswordInput = document.getElementById("confirm-password")
  const passwordStrength = document.getElementById("password-strength")
  const passwordStrengthText = document.getElementById("password-strength-text")
  const passwordMatch = document.getElementById("password-match")

  // Variables para controlar el cooldown
  let passwordCooldownActive = false
  let passwordCooldownEndTime = 0

  // Botones para mostrar/ocultar contraseñas
  const togglePasswordButtons = document.querySelectorAll(".toggle-password")

  // Añadir después de la función showAlert
  function highlightFieldError(inputElement, message = "") {
    // Añadir clases de error
    inputElement.classList.add("border-red-500", "focus:border-red-500", "focus:ring-red-500")

    // Si hay un mensaje, mostrar una alerta
    if (message) {
      showAlert(message, "error")
    }

    // Enfocar el campo para facilitar la corrección
    inputElement.focus()

    // Añadir evento para quitar las clases de error cuando el usuario comience a escribir
    const clearErrorStyles = () => {
      inputElement.classList.remove("border-red-500", "focus:border-red-500", "focus:ring-red-500")
      // Eliminar este event listener después de usarlo
      inputElement.removeEventListener("input", clearErrorStyles)
    }

    inputElement.addEventListener("input", clearErrorStyles)
  }

  // Función para evaluar la fortaleza de la contraseña
  function evaluatePasswordStrength(password) {
    if (!password) {
      passwordStrength.style.width = "0%"
      passwordStrength.className = "h-full w-0 transition-all duration-300 rounded-full"
      passwordStrengthText.textContent = "Ingresa tu contraseña"
      passwordStrengthText.className = "text-xs mt-1 text-gray-500"
      return
    }

    // Criterios de evaluación
    const lengthValid = password.length >= 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /[0-9]/.test(password)
    const hasSpecialChars = /[^A-Za-z0-9]/.test(password)

    // Calcular puntuación (0-4)
    let score = 0
    if (lengthValid) score++
    if (hasUpperCase && hasLowerCase) score++
    if (hasNumbers) score++
    if (hasSpecialChars) score++

    // Actualizar indicador visual
    const percentage = (score / 4) * 100
    passwordStrength.style.width = `${percentage}%`

    // Actualizar clase y texto según puntuación
    if (score === 0) {
      passwordStrength.className = "h-full transition-all duration-300 rounded-full bg-red-500"
      passwordStrengthText.textContent = "Muy débil"
      passwordStrengthText.className = "text-xs mt-1 text-red-500"
    } else if (score === 1) {
      passwordStrength.className = "h-full transition-all duration-300 rounded-full bg-red-400"
      passwordStrengthText.textContent = "Débil"
      passwordStrengthText.className = "text-xs mt-1 text-red-400"
    } else if (score === 2) {
      passwordStrength.className = "h-full transition-all duration-300 rounded-full bg-yellow-400"
      passwordStrengthText.textContent = "Moderada"
      passwordStrengthText.className = "text-xs mt-1 text-yellow-600"
    } else if (score === 3) {
      passwordStrength.className = "h-full transition-all duration-300 rounded-full bg-green-400"
      passwordStrengthText.textContent = "Fuerte"
      passwordStrengthText.className = "text-xs mt-1 text-green-500"
    } else {
      passwordStrength.className = "h-full transition-all duration-300 rounded-full bg-green-500"
      passwordStrengthText.textContent = "Muy fuerte"
      passwordStrengthText.className = "text-xs mt-1 text-green-600"
    }
  }

  // Función para manejar la entrada de OTP para cambio de contraseña
  function setupPasswordOtpInputs() {
    const passwordOtpInputs = document.querySelectorAll(".password-otp-input")
    const verifyPasswordOtpBtn = document.getElementById("verify-password-otp-btn")

    passwordOtpInputs.forEach((input, index) => {
      // Solo permitir números
      input.addEventListener("input", function (e) {
        this.value = this.value.replace(/[^0-9]/g, "")

        // Mover al siguiente input si se completó este
        if (this.value && index < passwordOtpInputs.length - 1) {
          passwordOtpInputs[index + 1].focus()
        }
        // Si es el último campo y tiene valor, verificar automáticamente
        else if (this.value && index === passwordOtpInputs.length - 1) {
          // Verificar que todos los campos estén completos
          let allFilled = true
          let otpCode = ""

          passwordOtpInputs.forEach((input) => {
            if (!input.value) {
              allFilled = false
            }
            otpCode += input.value
          })

          // Si todos los campos están completos, iniciar verificación automáticamente
          if (allFilled && otpCode.length === passwordOtpInputs.length) {
            // Simular clic en el botón de verificación
            verifyPasswordOtpBtn.click()
          }
        }
      })

      // Manejar la tecla de retroceso
      input.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && !this.value && index > 0) {
          passwordOtpInputs[index - 1].focus()
        }
      })

      // Manejar pegar (para pegar el código completo)
      input.addEventListener("paste", (e) => {
        e.preventDefault()
        const pasteData = e.clipboardData.getData("text")
        const digits = pasteData.match(/\d/g)

        if (digits) {
          passwordOtpInputs.forEach((input, i) => {
            if (digits[i]) {
              input.value = digits[i]
            }
          })

          // Verificar si todos los campos están completos después de pegar
          let allFilled = true
          let otpCode = ""

          passwordOtpInputs.forEach((input) => {
            if (!input.value) {
              allFilled = false
            }
            otpCode += input.value
          })

          // Si todos los campos están completos, iniciar verificación automáticamente
          if (allFilled && otpCode.length === passwordOtpInputs.length) {
            // Pequeño retraso para asegurar que la UI se actualice antes de verificar
            setTimeout(() => {
              verifyPasswordOtpBtn.click()
            }, 300)
          } else {
            // Enfocar el último campo o el siguiente vacío
            for (let i = 0; i < passwordOtpInputs.length; i++) {
              if (!passwordOtpInputs[i].value) {
                passwordOtpInputs[i].focus()
                break
              }
              if (i === passwordOtpInputs.length - 1) {
                passwordOtpInputs[i].focus()
              }
            }
          }
        }
      })
    })
  }

  // Agregar después de la función setupPasswordOtpInputs()

  // Función para verificar si las contraseñas coinciden
  function checkPasswordsMatch() {
    const newPassword = newPasswordInput.value
    const confirmPassword = confirmPasswordInput.value

    if (newPassword && confirmPassword) {
      if (newPassword === confirmPassword) {
        passwordMatch.textContent = "Las contraseñas coinciden"
        passwordMatch.className = "text-xs mt-1 text-green-500"
        passwordMatch.classList.remove("hidden")
        return true
      } else {
        passwordMatch.textContent = "Las contraseñas no coinciden"
        passwordMatch.className = "text-xs mt-1 text-red-500"
        passwordMatch.classList.remove("hidden")
        return false
      }
    } else {
      passwordMatch.classList.add("hidden")
      return false
    }
  }

  // Configurar eventos para mostrar/ocultar contraseñas
  if (togglePasswordButtons) {
    togglePasswordButtons.forEach((button) => {
      button.addEventListener("click", function () {
        const targetId = this.getAttribute("data-target")
        const targetInput = document.getElementById(targetId)
        const eyeIcon = this.querySelector(".eye-icon")
        const eyeOffIcon = this.querySelector(".eye-off-icon")

        if (targetInput.type === "password") {
          targetInput.type = "text"
          eyeIcon.classList.add("hidden")
          eyeOffIcon.classList.remove("hidden")
        } else {
          targetInput.type = "password"
          eyeIcon.classList.remove("hidden")
          eyeOffIcon.classList.add("hidden")
        }
      })
    })
  }

  // Configurar eventos para evaluar la fortaleza de la contraseña
  if (newPasswordInput) {
    newPasswordInput.addEventListener("input", function () {
      evaluatePasswordStrength(this.value)
      checkPasswordsMatch()
    })
  }

  // Configurar evento para verificar si las contraseñas coinciden
  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener("input", checkPasswordsMatch)
  }

  // Modificar la función de envío del formulario de cambio de contraseña
  if (passwordForm) {
    passwordForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const currentPassword = currentPasswordInput.value
      const newPassword = newPasswordInput.value
      const confirmPassword = confirmPasswordInput.value

      // Validar que todos los campos estén completos
      if (!currentPassword || !newPassword || !confirmPassword) {
        showAlert("Por favor, completa todos los campos", "error")
        return
      }

      // Validar que la nueva contraseña tenga al menos 8 caracteres
      if (newPassword.length < 8) {
        showAlert("La nueva contraseña debe tener al menos 8 caracteres", "error")
        return
      }

      // Validar que las contraseñas coincidan
      if (newPassword !== confirmPassword) {
        showAlert("Las contraseñas no coinciden", "error")
        return
      }

      // Verificar si hay un cooldown activo
      const currentTime = Date.now()
      if (passwordCooldownActive && currentTime < passwordCooldownEndTime) {
        const remainingSeconds = Math.ceil((passwordCooldownEndTime - currentTime) / 1000)
        showAlert(`Debes esperar ${remainingSeconds} segundos antes de solicitar un nuevo código`, "warning")
        return
      }

      // Obtener el token CSRF si existe
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")

      // Configurar los headers
      const headers = {
        "Content-Type": "application/json",
      }

      // Añadir el token CSRF si existe
      if (csrfToken) {
        headers["X-CSRFToken"] = csrfToken
      }

      // Cambiar el botón a estado de verificación
      const submitButton = passwordForm.querySelector('button[type="submit"]')
      const originalButtonContent = submitButton.innerHTML
      submitButton.innerHTML = `
          <div class="flex items-center justify-center">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            <span>Verificando...</span>
          </div>
        `
      submitButton.disabled = true

      // Primero verificar la contraseña actual
      fetch("/perfil/cambiar_contrasena", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
        credentials: "same-origin", // Incluir cookies en la solicitud
      })
        .then((response) => {
          // Siempre obtener el JSON, incluso si la respuesta no es exitosa
          return response.json().then((data) => {
            // Añadir el status a los datos para poder verificarlo después
            return { ...data, status: response.status }
          })
        })
        .then((data) => {
          if (data.success) {
            // Contraseña verificada, enviar código OTP
            // Mantener el estado de verificación en el botón
            submitButton.innerHTML = `
        <div class="flex items-center justify-center">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          <span>Enviando código...</span>
        </div>
      `

            return fetch("/perfil/enviar_codigo_cambio_contrasena", {
              method: "POST",
              headers: headers,
              body: JSON.stringify({
                current_password: currentPassword,
              }),
              credentials: "same-origin",
            })
          } else {
            // Restaurar el botón a su estado original
            submitButton.innerHTML = originalButtonContent
            submitButton.disabled = false

            // Mostrar una alerta específica para contraseña incorrecta
            if (data.error && data.error.includes("contraseña")) {
              highlightFieldError(
                currentPasswordInput,
                "Contraseña actual incorrecta. Por favor, verifica e intenta nuevamente.",
              )
            } else {
              showAlert(data.error || "Error al verificar la contraseña", "error")
            }

            throw new Error("Verificación fallida")
          }
        })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`)
          }
          return response.json()
        })
        .then((data) => {
          if (data.success) {
            // Restaurar el botón a su estado original
            submitButton.innerHTML = originalButtonContent
            submitButton.disabled = false

            // Activar el cooldown
            passwordCooldownActive = true
            passwordCooldownEndTime = Date.now() + (data.cooldown_seconds || 60) * 1000

            // Mostrar el modal de OTP para cambio de contraseña
            showPasswordOtpModal(newPassword)
            showAlert("Código de verificación enviado a tu correo electrónico", "success")
          } else {
            // Si hay un error específico de cooldown
            if (data.cooldown && data.remaining_seconds) {
              passwordCooldownActive = true
              passwordCooldownEndTime = Date.now() + data.remaining_seconds * 1000
              showAlert(
                `Debes esperar ${data.remaining_seconds} segundos antes de solicitar un nuevo código`,
                "warning",
              )
            } else {
              showAlert(data.error || "Error al enviar el código de verificación", "error")
            }

            // Restaurar el botón a su estado original
            submitButton.innerHTML = originalButtonContent
            submitButton.disabled = false
          }
        })
        .catch((error) => {
          console.error("Error:", error)

          // Restaurar el botón a su estado original
          submitButton.innerHTML = originalButtonContent
          submitButton.disabled = false

          // Mensaje de error más específico
          if (error.message.includes("HTTP")) {
            showAlert(`Error del servidor: ${error.message}. Por favor, inténtalo más tarde.`, "error")
          } else if (error.message !== "Verificación fallida") {
            showAlert("Error de conexión. Verifica tu conexión a internet e inténtalo de nuevo.", "error")
          }
        })
    })
  }

  // Función para mostrar el modal de OTP para cambio de contraseña
  function showPasswordOtpModal(newPassword) {
    const passwordOtpModal = document.getElementById("password-otp-modal")
    const passwordOtpInputs = document.querySelectorAll(".password-otp-input")
    const verifyPasswordOtpBtn = document.getElementById("verify-password-otp-btn")
    const cancelPasswordOtpBtn = document.getElementById("cancel-password-otp-btn")
    const closePasswordOtpModal = document.getElementById("close-password-otp-modal")
    const resendPasswordCode = document.getElementById("resend-password-code")
    const passwordCountdown = document.getElementById("password-countdown")

    // Limpiar los campos de entrada
    passwordOtpInputs.forEach((input) => {
      input.value = ""
    })

    // Mostrar el modal con animación
    passwordOtpModal.classList.remove("hidden")
    passwordOtpModal.classList.add("flex")

    // Añadir animación de entrada al contenido del modal
    const modalContent = passwordOtpModal.querySelector(".bg-white")
    modalContent.classList.add("animate-scale-in")

    // Enfocar el primer campo de entrada
    passwordOtpInputs[0].focus()

    // Configurar el contador regresivo
    let secondsLeft = Math.ceil((passwordCooldownEndTime - Date.now()) / 1000)
    if (secondsLeft < 0) secondsLeft = 0

    // Limpiar el intervalo anterior si existe
    if (window.passwordCountdownInterval) {
      clearInterval(window.passwordCountdownInterval)
    }

    window.passwordCountdownInterval = setInterval(() => {
      secondsLeft--
      passwordCountdown.textContent = `Puedes solicitar un nuevo código en ${secondsLeft} segundos`

      if (secondsLeft <= 0) {
        clearInterval(window.passwordCountdownInterval)
        passwordCountdown.textContent = "Ya puedes solicitar un nuevo código"
        resendPasswordCode.classList.remove("cursor-not-allowed", "text-gray-400")
        resendPasswordCode.classList.add("text-primary-600", "hover:text-primary-800")
        resendPasswordCode.disabled = false
        passwordCooldownActive = false
      }
    }, 1000)

    // Deshabilitar el botón de reenvío inicialmente
    resendPasswordCode.disabled = true
    resendPasswordCode.classList.add("cursor-not-allowed", "text-gray-400")
    resendPasswordCode.classList.remove("text-primary-600", "hover:text-primary-800")

    // Configurar el evento para cerrar el modal con animación
    function closePasswordModal() {
      const modalContent = passwordOtpModal.querySelector(".bg-white")
      modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
      setTimeout(() => {
        passwordOtpModal.classList.add("hidden")
        passwordOtpModal.classList.remove("flex")
        modalContent.classList.remove("opacity-0", "scale-95")
        // Limpiar el intervalo global pero mantener el estado del cooldown
        if (window.passwordCountdownInterval) {
          clearInterval(window.passwordCountdownInterval)
        }
      }, 300)
    }

    // Asignar eventos de cierre con animación
    closePasswordOtpModal.addEventListener("click", closePasswordModal)
    cancelPasswordOtpBtn.addEventListener("click", closePasswordModal)

    // Cerrar el modal al hacer clic fuera del contenido
    passwordOtpModal.addEventListener("click", (e) => {
      if (e.target === passwordOtpModal) {
        closePasswordModal()
      }
    })

    // Configurar el evento para reenviar el código
    resendPasswordCode.addEventListener("click", function () {
      if (this.disabled) return

      // Obtener el token CSRF si existe
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")

      // Configurar los headers
      const headers = {
        "Content-Type": "application/json",
      }

      // Añadir el token CSRF si existe
      if (csrfToken) {
        headers["X-CSRFToken"] = csrfToken
      }

      // Mostrar indicador de carga
      this.innerHTML = `
        <div class="flex items-center">
            <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600 mr-1"></div>
            <span>Enviando...</span>
        </div>
    `

      // Reenviar el código
      fetch("/perfil/enviar_codigo_cambio_contrasena", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          current_password: currentPasswordInput.value,
        }),
        credentials: "same-origin",
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`)
          }
          return response.json()
        })
        .then((data) => {
          if (data.success) {
            showAlert("Código reenviado con éxito", "success")

            // Reiniciar el contador
            secondsLeft = data.cooldown_seconds || 60
            passwordCountdown.textContent = `Puedes solicitar un nuevo código en ${secondsLeft} segundos`
            resendPasswordCode.classList.add("cursor-not-allowed", "text-gray-400")
            resendPasswordCode.classList.remove("text-primary-600", "hover:text-primary-800")
            resendPasswordCode.disabled = true
            resendPasswordCode.textContent = "Reenviar"

            // Actualizar el estado del cooldown global
            passwordCooldownActive = true
            passwordCooldownEndTime = Date.now() + secondsLeft * 1000

            // Limpiar el intervalo anterior si existe
            if (window.passwordCountdownInterval) {
              clearInterval(window.passwordCountdownInterval)
            }

            // Crear un nuevo intervalo y guardarlo en una variable global para poder limpiarlo después
            window.passwordCountdownInterval = setInterval(() => {
              secondsLeft--
              passwordCountdown.textContent = `Puedes solicitar un nuevo código en ${secondsLeft} segundos`

              if (secondsLeft <= 0) {
                clearInterval(window.passwordCountdownInterval)
                passwordCountdown.textContent = "Ya puedes solicitar un nuevo código"
                resendPasswordCode.classList.remove("cursor-not-allowed", "text-gray-400")
                resendPasswordCode.classList.add("text-primary-600", "hover:text-primary-800")
                resendPasswordCode.disabled = false
                passwordCooldownActive = false
              }
            }, 1000)
          } else {
            // Si hay un error específico de cooldown
            if (data.cooldown && data.remaining_seconds) {
              secondsLeft = data.remaining_seconds
              passwordCountdown.textContent = `Puedes solicitar un nuevo código en ${secondsLeft} segundos`
              resendPasswordCode.classList.add("cursor-not-allowed", "text-gray-400")
              resendPasswordCode.classList.remove("text-primary-600", "hover:text-primary-800")
              resendPasswordCode.disabled = true
              resendPasswordCode.textContent = "Reenviar"

              // Actualizar el estado del cooldown global
              passwordCooldownActive = true
              passwordCooldownEndTime = Date.now() + secondsLeft * 1000

              // Limpiar el intervalo anterior si existe
              if (window.passwordCountdownInterval) {
                clearInterval(window.passwordCountdownInterval)
              }

              // Crear un nuevo intervalo
              window.passwordCountdownInterval = setInterval(() => {
                secondsLeft--
                passwordCountdown.textContent = `Puedes solicitar un nuevo código en ${secondsLeft} segundos`

                if (secondsLeft <= 0) {
                  clearInterval(window.passwordCountdownInterval)
                  passwordCountdown.textContent = "Ya puedes solicitar un nuevo código"
                  resendPasswordCode.classList.remove("cursor-not-allowed", "text-gray-400")
                  resendPasswordCode.classList.add("text-primary-600", "hover:text-primary-800")
                  resendPasswordCode.disabled = false
                  passwordCooldownActive = false
                }
              }, 1000)
            } else {
              showAlert(data.error || "Error al reenviar el código", "error")
              resendPasswordCode.textContent = "Reenviar"
            }
          }
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error al reenviar el código. Inténtalo de nuevo.", "error")
          resendPasswordCode.textContent = "Reenviar"
        })
    })

    // Configurar el evento para verificar el código OTP
    verifyPasswordOtpBtn.addEventListener("click", function () {
      // Obtener el código OTP completo
      let otpCode = ""
      passwordOtpInputs.forEach((input) => {
        otpCode += input.value
      })

      // Validar que el código tenga la longitud correcta
      if (otpCode.length !== passwordOtpInputs.length) {
        showAlert("Por favor, ingresa el código completo", "error")
        return
      }

      // Obtener el token CSRF si existe
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")

      // Configurar los headers
      const headers = {
        "Content-Type": "application/json",
      }

      // Añadir el token CSRF si existe
      if (csrfToken) {
        headers["X-CSRFToken"] = csrfToken
      }

      // Mostrar indicador de carga
      this.innerHTML = `
                    <div class="flex items-center justify-center">
                        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        <span>Verificando...</span>
                    </div>
                `
      this.disabled = true

      // Verificar el código OTP
      fetch("/perfil/verificar_codigo_cambio_contrasena", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          otp: otpCode,
          new_password: newPassword,
        }),
        credentials: "same-origin",
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`)
          }
          return response.json()
        })
        .then((data) => {
          if (data.success) {
            showAlert(data.message || "Contraseña actualizada con éxito", "success")
            closePasswordModal()

            // Limpiar el formulario
            passwordForm.reset()
            // Reiniciar indicadores
            evaluatePasswordStrength("")
            passwordMatch.classList.add("hidden")

            // Resetear el estado del cooldown
            passwordCooldownActive = false
          } else {
            showAlert(data.error || "Error al verificar el código", "error")

            // Restaurar el botón
            this.innerHTML = `
                            <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
                            <div class="relative flex items-center justify-center">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                <span>Verificar</span>
                            </div>
                        `
            this.disabled = false
          }
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error al verificar el código. Inténtalo de nuevo.", "error")

          // Restaurar el botón
          this.innerHTML = `
                        <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
                        <div class="relative flex items-center justify-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            <span>Verificar</span>
                        </div>
                    `
          this.disabled = false
        })
    })
  }

  // Inicializar el estado de los indicadores
  if (newPasswordInput) {
    evaluatePasswordStrength("")
  }

  // Configurar los campos OTP para cambio de contraseña
  setupPasswordOtpInputs()

  // Agregar después de todo el código existente, pero antes del cierre del evento DOMContentLoaded

  // Funcionalidad para autenticación en dos pasos
  const toggle2faBtn = document.getElementById("toggle-2fa-btn")
  const twoFactorStatus = document.getElementById("two-factor-status")
  const twoFactorModal = document.getElementById("two-factor-modal")
  const disable2faModal = document.getElementById("disable-2fa-modal")

  // Referencias a elementos del modal de activación
  const close2faModal = document.getElementById("close-2fa-modal")
  const cancel2faSetup = document.getElementById("cancel-2fa-setup")
  const continue2faSetup = document.getElementById("continue-2fa-setup")
  const backToStep1 = document.getElementById("back-to-step-1")
  const continueToVerification = document.getElementById("continue-to-verification")
  const backToStep2 = document.getElementById("back-to-step-2")
  const verify2faCode = document.getElementById("verify-2fa-code")
  const finish2faSetup = document.getElementById("finish-2fa-setup")

  // Referencias a elementos del modal de desactivación
  const closeDisable2faModal = document.getElementById("close-disable-2fa-modal")
  const cancelDisable2fa = document.getElementById("cancel-disable-2fa")
  const confirmDisable2fa = document.getElementById("confirm-disable-2fa")
  const disable2faPassword = document.getElementById("disable-2fa-password")

  // Referencias a los pasos del modal
  const step1 = document.getElementById("step-1-2fa")
  const step2 = document.getElementById("step-2-2fa")
  const step3 = document.getElementById("step-3-2fa")
  const step4 = document.getElementById("step-4-2fa")

  // Referencias a elementos específicos
  const qrCodeContainer = document.getElementById("qr-code-container")
  const secretKey = document.getElementById("secret-key")
  const verificationInputs = document.querySelectorAll(".verification-code-input")

  // Función corregida para verificar el estado de 2FA
  function check2faStatus() {
    fetch("/perfil/verificar_estado_2fa") // Corregir la ruta añadiendo el prefijo /perfil/
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`)
        }
        return response.json()
      })
      .then((data) => {
        if (data.success) {
          if (data.active) {
            twoFactorStatus.textContent = "Activada"
            twoFactorStatus.classList.add("text-green-600")
            toggle2faBtn.innerHTML = `
            <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
            <div class="relative flex items-center justify-center">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              <span>Desactivar</span>
            </div>
          `
            toggle2faBtn.classList.remove(
              "from-primary-600",
              "to-primary-500",
              "hover:from-primary-500",
              "hover:to-primary-600",
              "hover:shadow-primary-500/30",
            )
            toggle2faBtn.classList.add(
              "from-red-600",
              "to-red-500",
              "hover:from-red-500",
              "hover:to-red-600",
              "hover:shadow-red-500/30",
            )
          } else {
            twoFactorStatus.textContent = "No activada"
            twoFactorStatus.classList.remove("text-green-600")
            toggle2faBtn.innerHTML = `
            <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
            <div class="relative flex items-center justify-center">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
              <span>Activar</span>
            </div>
          `
            toggle2faBtn.classList.add(
              "from-primary-600",
              "to-primary-500",
              "hover:from-primary-500",
              "hover:to-primary-600",
              "hover:shadow-primary-500/30",
            )
            toggle2faBtn.classList.remove(
              "from-red-600",
              "to-red-500",
              "hover:from-red-500",
              "hover:to-red-600",
              "hover:shadow-red-500/30",
            )
          }
        } else {
          showAlert("Error al verificar el estado de la autenticación en dos pasos", "error")
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        showAlert("Error de conexión al verificar el estado de 2FA. Detalles: " + error.message, "error")
      })
  }

  // Verificar el estado al cargar la página
  if (toggle2faBtn) {
    check2faStatus()
  }

  // Configurar los campos de verificación
  function setupVerificationInputs() {
    verificationInputs.forEach((input, index) => {
      // Solo permitir números
      input.addEventListener("input", function (e) {
        this.value = this.value.replace(/[^0-9]/g, "")

        // Mover al siguiente input si se completó este
        if (this.value && index < verificationInputs.length - 1) {
          verificationInputs[index + 1].focus()
        }
      })

      // Manejar la tecla de retroceso
      input.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && !this.value && index > 0) {
          verificationInputs[index - 1].focus()
        }
      })

      // Manejar pegar (para pegar el código completo)
      input.addEventListener("paste", (e) => {
        e.preventDefault()
        const pasteData = e.clipboardData.getData("text")
        const digits = pasteData.match(/\d/g)

        if (digits) {
          verificationInputs.forEach((input, i) => {
            if (digits[i]) {
              input.value = digits[i]
            }
          })

          // Enfocar el último campo o el siguiente vacío
          for (let i = 0; i < verificationInputs.length; i++) {
            if (!verificationInputs[i].value) {
              verificationInputs[i].focus()
              break
            }
            if (i === verificationInputs.length - 1) {
              verificationInputs[i].focus()
            }
          }
        }
      })
    })
  }

  // Mostrar el modal de activación de 2FA
  function show2faModal() {
    // Mostrar el primer paso
    step1.classList.remove("hidden")
    step2.classList.add("hidden")
    step3.classList.add("hidden")
    step4.classList.add("hidden")

    // Mostrar el modal con animación
    twoFactorModal.classList.remove("hidden")
    twoFactorModal.classList.add("flex")

    // Añadir animación de entrada al contenido del modal
    const modalContent = twoFactorModal.querySelector(".bg-white")
    modalContent.classList.add("animate-scale-in")

    // Configurar los campos de verificación
    setupVerificationInputs()
  }

  // Mostrar el modal de desactivación de 2FA
  function showDisable2faModal() {
    // Limpiar el campo de contraseña
    disable2faPassword.value = ""

    // Mostrar el modal con animación
    disable2faModal.classList.remove("hidden")
    disable2faModal.classList.add("flex")

    // Añadir animación de entrada al contenido del modal
    const modalContent = disable2faModal.querySelector(".bg-white")
    modalContent.classList.add("animate-scale-in")
  }

  // Cerrar el modal de activación
  // Modificar la función close2faModalFunc para que cierre el modal correctamente desde cualquier paso
  function close2faModalFunc() {
    const modalContent = twoFactorModal.querySelector(".bg-white")
    modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
    setTimeout(() => {
      twoFactorModal.classList.add("hidden")
      twoFactorModal.classList.remove("flex")
      modalContent.classList.remove("opacity-0", "scale-95")
    }, 300)
  }

  // Cerrar el modal de desactivación
  function closeDisable2faModalFunc() {
    const modalContent = disable2faModal.querySelector(".bg-white")
    modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
    setTimeout(() => {
      disable2faModal.classList.add("hidden")
      disable2faModal.classList.remove("flex")
      modalContent.classList.remove("opacity-0", "scale-95")
    }, 300)
  }

  /// Generar el código QR y la clave secreta
  function generateQRCode() {
    // Cambiar el botón a estado de carga
    continue2faSetup.innerHTML = `
    <div class="flex items-center justify-center">
      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
      <span>Generando...</span>
    </div>
  `
    continue2faSetup.disabled = true

    // Mostrar indicador de carga
    qrCodeContainer.innerHTML = `
    <div class="animate-pulse flex flex-col items-center justify-center w-48 h-48">
      <div class="w-10 h-10 bg-gray-200 rounded-full mb-2"></div>
      <div class="h-2 bg-gray-200 rounded w-32 mb-2"></div>
      <div class="h-2 bg-gray-200 rounded w-24"></div>
    </div>
  `

    // Solicitar al servidor que genere la clave secreta y el código QR
    fetch("/perfil/generar_2fa", {
      // Corregir la ruta añadiendo el prefijo /perfil/
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`)
        }
        return response.json()
      })
      .then((data) => {
        if (data.success) {
          // Restaurar el botón a su estado original
          continue2faSetup.innerHTML = `
          <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
          <div class="relative flex items-center justify-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
            </svg>
            <span>Continuar</span>
          </div>
        `
          continue2faSetup.disabled = false

          // Mostrar el código QR
          qrCodeContainer.innerHTML = `<img src="data:image/png;base64,${data.qr_code}" alt="Código QR para autenticación en dos pasos" class="w-48 h-48">`

          // Mostrar la clave secreta
          secretKey.textContent = data.secret

          // Mostrar el paso 2
          step1.classList.add("hidden")
          step2.classList.remove("hidden")
        } else {
          // Restaurar el botón a su estado original
          continue2faSetup.innerHTML = `
          <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
          <div class="relative flex items-center justify-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
            </svg>
            <span>Continuar</span>
          </div>
        `
          continue2faSetup.disabled = false

          showAlert(data.error || "Error al generar el código QR", "error")
        }
      })
      .catch((error) => {
        console.error("Error:", error)

        // Restaurar el botón a su estado original
        continue2faSetup.innerHTML = `
        <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
        <div class="relative flex items-center justify-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
          </svg>
          <span>Continuar</span>
        </div>
      `
        continue2faSetup.disabled = false

        showAlert("Error de conexión al generar el código QR. Detalles: " + error.message, "error")
      })
  }

  // Modificar la función continueToVerification para añadir animación de carga al botón
  if (continueToVerification) {
    continueToVerification.addEventListener("click", () => {
      // Cambiar el botón a estado de carga
      continueToVerification.innerHTML = `
      <div class="flex items-center justify-center">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
        <span>Cargando...</span>
      </div>
    `
      continueToVerification.disabled = true

      // Pequeño retraso para mostrar la animación
      setTimeout(() => {
        // Restaurar el botón a su estado original
        continueToVerification.innerHTML = `
        <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
        <div class="relative flex items-center justify-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
          </svg>
          <span>Continuar</span>
        </div>
      `
        continueToVerification.disabled = false

        step2.classList.add("hidden")
        step3.classList.remove("hidden")
        verificationInputs[0].focus()
      }, 300)
    })
  }

  // Modificar la función disable2fa para añadir animación de carga al botón
  function disable2fa() {
    const password = disable2faPassword.value

    if (!password) {
      showAlert("Por favor, ingresa tu contraseña", "error")
      return
    }

    // Cambiar el botón a estado de carga
    confirmDisable2fa.innerHTML = `
    <div class="flex items-center justify-center">
      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
      <span>Desactivando...</span>
    </div>
  `
    confirmDisable2fa.disabled = true

    // Enviar la solicitud al servidor
    fetch("/perfil/desactivar_2fa", {
      // Corregir la ruta añadiendo el prefijo /perfil/
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
      credentials: "same-origin",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`)
        }
        return response.json()
      })
      .then((data) => {
        if (data.success) {
          showAlert("Verificación en dos pasos desactivada correctamente", "success")

          // Cerrar el modal con animación
          const modalContent = disable2faModal.querySelector(".bg-white")
          modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
          setTimeout(() => {
            disable2faModal.classList.add("hidden")
            disable2faModal.classList.remove("flex")
            modalContent.classList.remove("opacity-0", "scale-95")
          }, 300)

          // Actualizar el estado en la interfaz
          check2faStatus()
        } else {
          showAlert(data.error || "Error al desactivar la verificación en dos pasos", "error")

          // Restaurar el botón
          confirmDisable2fa.innerHTML = `
        <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
        <div class="relative flex items-center justify-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
          <span>Desactivar</span>
        </div>
      `
          confirmDisable2fa.disabled = false
        }
      })
      .catch((error) => {
        console.error("Error:", error)
        showAlert("Error de conexión al desactivar la verificación en dos pasos. Detalles: " + error.message, "error")

        // Restaurar el botón
        confirmDisable2fa.innerHTML = `
      <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
      <div class="relative flex items-center justify-center">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
        <span>Desactivar</span>
      </div>
    `
        confirmDisable2fa.disabled = false
      })
  }

  // Asignar eventos
  // Modificar el evento click del botón toggle2faBtn para añadir animación de carga
  if (toggle2faBtn) {
    toggle2faBtn.addEventListener("click", () => {
      // Guardar el contenido original del botón
      const originalButtonContent = toggle2faBtn.innerHTML

      // Cambiar el botón a estado de carga
      toggle2faBtn.innerHTML = `
        <div class="flex items-center justify-center">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          <span>Cargando...</span>
        </div>
      `
      toggle2faBtn.disabled = true

      // Verificar el estado actual
      fetch("/perfil/verificar_estado_2fa")
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`)
          }
          return response.json()
        })
        .then((data) => {
          if (data.success) {
            // Mostrar el modal correspondiente inmediatamente cuando los datos estén listos
            toggle2faBtn.innerHTML = originalButtonContent
            toggle2faBtn.disabled = false

            if (data.active) {
              // Si está activado, mostrar el modal de desactivación
              showDisable2faModal()
            } else {
              // Si no está activado, mostrar el modal de activación
              show2faModal()
            }
          } else {
            // Restaurar el botón a su estado original
            toggle2faBtn.innerHTML = originalButtonContent
            toggle2faBtn.disabled = false
            showAlert("Error al verificar el estado de la autenticación en dos pasos", "error")
          }
        })
        .catch((error) => {
          console.error("Error:", error)

          // Restaurar el botón a su estado original
          toggle2faBtn.innerHTML = originalButtonContent
          toggle2faBtn.disabled = false
          showAlert("Error de conexión al verificar el estado de 2FA. Detalles: " + error.message, "error")
        })
    })
  }

  // Eventos para el modal de activación
  if (close2faModal) {
    document.querySelectorAll("#close-2fa-modal").forEach((button) => {
      button.addEventListener("click", close2faModalFunc)
    })
  }
  if (cancel2faSetup) cancel2faSetup.addEventListener("click", close2faModalFunc)
  if (continue2faSetup) continue2faSetup.addEventListener("click", generateQRCode)
  if (backToStep1)
    backToStep1.addEventListener("click", () => {
      step2.classList.add("hidden")
      step1.classList.remove("hidden")
    })
  if (continueToVerification)
    continueToVerification.addEventListener("click", () => {
      step2.classList.add("hidden")
      step3.classList.remove("hidden")
      verificationInputs[0].focus()
    })
  if (backToStep2)
    backToStep2.addEventListener("click", () => {
      step3.classList.add("hidden")
      step2.classList.remove("hidden")
    })
  if (verify2faCode) {
    verify2faCode.addEventListener("click", () => {
      // Obtener el código completo
      let code = ""
      verificationInputs.forEach((input) => {
        code += input.value
      })

      // Verificar que el código tenga 6 dígitos
      if (code.length !== 6) {
        showAlert("Por favor, ingresa un código de 6 dígitos", "error")
        return
      }

      // Cambiar el botón a estado de carga
      verify2faCode.innerHTML = `
      <div class="flex items-center justify-center">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
        <span>Verificando...</span>
      </div>
    `
      verify2faCode.disabled = true

      // Enviar el código al servidor para verificación
      fetch("/perfil/verificar_2fa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
        credentials: "same-origin",
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`)
          }
          return response.json()
        })
        .then((data) => {
          if (data.success) {
            // Mostrar el paso de éxito
            step3.classList.add("hidden")
            step4.classList.remove("hidden")

            // Actualizar el estado en la interfaz
            check2faStatus()
          } else {
            showAlert(data.error || "Código incorrecto. Inténtalo de nuevo.", "error")

            // Restaurar el botón
            verify2faCode.innerHTML = `
          <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
          <div class="relative flex items-center justify-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>Verificar</span>
          </div>
        `
            verify2faCode.disabled = false

            // Limpiar los campos de entrada
            verificationInputs.forEach((input) => {
              input.value = ""
            })
            verificationInputs[0].focus()
          }
        })
        .catch((error) => {
          console.error("Error:", error)
          showAlert("Error de conexión al verificar el código. Detalles: " + error.message, "error")

          // Restaurar el botón
          verify2faCode.innerHTML = `
        <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
        <div class="relative flex items-center justify-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>Verificar</span>
        </div>
      `
          verify2faCode.disabled = false
        })
    })
  }
  if (finish2faSetup) finish2faSetup.addEventListener("click", close2faModalFunc)

  // Eventos para el modal de desactivación
  if (closeDisable2faModal) closeDisable2faModal.addEventListener("click", closeDisable2faModalFunc)
  if (cancelDisable2fa) cancelDisable2fa.addEventListener("click", closeDisable2faModalFunc)
  if (confirmDisable2fa) confirmDisable2fa.addEventListener("click", disable2fa)

  // Cerrar los modales al hacer clic fuera de ellos
  if (twoFactorModal) {
    twoFactorModal.addEventListener("click", (e) => {
      if (e.target === twoFactorModal) {
        close2faModalFunc()
      }
    })
  }

  if (disable2faModal) {
    disable2faModal.addEventListener("click", (e) => {
      if (e.target === disable2faModal) {
        closeDisable2faModalFunc()
      }
    })
  }
})
