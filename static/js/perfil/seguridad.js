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

  // Modificar la función showAlert para que coincida con el estilo de información-personal
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
})
