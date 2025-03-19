document.addEventListener("DOMContentLoaded", () => {
    // Navegación de pestañas
    const tabButtons = document.querySelectorAll(".tab-button")
    const tabContents = document.querySelectorAll(".tab-content")
  
    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        // Desactivar todos los botones y contenidos
        tabButtons.forEach((btn) => {
          btn.classList.remove("border-red-500", "text-red-500")
          btn.classList.add("border-transparent", "text-gray-500", "hover:text-gray-700", "hover:border-gray-300")
        })
        tabContents.forEach((content) => {
          content.classList.add("hidden")
        })
  
        // Activar el botón y contenido seleccionado
        button.classList.remove("border-transparent", "text-gray-500", "hover:text-gray-700", "hover:border-gray-300")
        button.classList.add("border-red-500", "text-red-500")
  
        const tabId = button.getAttribute("data-tab")
        document.getElementById(`${tabId}-content`).classList.remove("hidden")
      })
    })
  
    // Funcionalidad para cambiar foto de perfil
    const changePhotoBtn = document.getElementById("change-photo-btn")
    const photoUpload = document.getElementById("photo-upload")
    const photoPreviewContainer = document.getElementById("photo-preview-container")
    const photoPreview = document.getElementById("photo-preview")
    const savePhotoBtn = document.getElementById("save-photo-btn")
    const cancelPhotoBtn = document.getElementById("cancel-photo-btn")
    const profileImage = document.getElementById("profile-image")
  
    changePhotoBtn.addEventListener("click", () => {
      photoUpload.click()
    })
  
    photoUpload.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0]
  
        // Validar tamaño (5MB máximo)
        if (file.size > 5 * 1024 * 1024) {
          showAlert("El archivo es demasiado grande. El tamaño máximo permitido es 5MB.", "error")
          return
        }
  
        // Validar formato (solo PNG y JPG)
        if (!["image/jpeg", "image/png"].includes(file.type)) {
          showAlert("Formato no válido. Solo se permiten archivos JPG y PNG.", "error")
          return
        }
  
        const reader = new FileReader()
        reader.onload = (e) => {
          photoPreview.src = e.target.result
          photoPreviewContainer.classList.remove("hidden")
        }
        reader.readAsDataURL(file)
      }
    })
  
    savePhotoBtn.addEventListener("click", () => {
      // Simular guardado
      profileImage.src = photoPreview.src
      photoPreviewContainer.classList.add("hidden")
      showAlert("Foto de perfil actualizada correctamente.", "success")
    })
  
    cancelPhotoBtn.addEventListener("click", () => {
      photoPreviewContainer.classList.add("hidden")
      photoUpload.value = ""
    })
  
    // Formulario de información básica
    const basicInfoForm = document.getElementById("basic-info-form")
    basicInfoForm.addEventListener("submit", (e) => {
      e.preventDefault()
      // Simular guardado
      showAlert("Información básica actualizada correctamente.", "success")
    })
  
    // Verificación de email y teléfono
    const verifyEmailBtn = document.getElementById("verify-email-btn")
    const verifyPhoneBtn = document.getElementById("verify-phone-btn")
    const otpModal = document.getElementById("otp-modal")
    const verificationMethod = document.getElementById("verification-method")
    const cancelOtpBtn = document.getElementById("cancel-otp-btn")
    const verifyOtpBtn = document.getElementById("verify-otp-btn")
    const resendCodeBtn = document.getElementById("resend-code")
    const countdownEl = document.getElementById("countdown")
    const otpInputs = document.querySelectorAll(".otp-input")
  
    verifyEmailBtn.addEventListener("click", () => {
      verificationMethod.textContent = "correo electrónico"
      otpModal.classList.remove("hidden")
      startCountdown()
      focusFirstOtpInput()
    })
  
    verifyPhoneBtn.addEventListener("click", () => {
      verificationMethod.textContent = "teléfono"
      otpModal.classList.remove("hidden")
      startCountdown()
      focusFirstOtpInput()
    })
  
    cancelOtpBtn.addEventListener("click", () => {
      otpModal.classList.add("hidden")
      resetOtpInputs()
    })
  
    verifyOtpBtn.addEventListener("click", () => {
      // Validar que todos los campos estén llenos
      let isComplete = true
      otpInputs.forEach((input) => {
        if (!input.value) {
          isComplete = false
        }
      })
  
      if (!isComplete) {
        showAlert("Por favor, ingresa el código completo.", "error")
        return
      }
  
      // Simular verificación exitosa
      otpModal.classList.add("hidden")
      resetOtpInputs()
      showAlert("Verificación completada correctamente.", "success")
    })
  
    // Manejar inputs de OTP
    otpInputs.forEach((input, index) => {
      input.addEventListener("keyup", (e) => {
        // Si se ingresó un número
        if (e.key >= 0 && e.key <= 9) {
          // Enfocar el siguiente input si existe
          if (index < otpInputs.length - 1) {
            otpInputs[index + 1].focus()
          }
        }
        // Si se presiona backspace
        else if (e.key === "Backspace") {
          // Enfocar el input anterior si existe y este está vacío
          if (index > 0 && input.value === "") {
            otpInputs[index - 1].focus()
          }
        }
      })
  
      input.addEventListener("paste", (e) => {
        e.preventDefault()
        const pastedData = e.clipboardData.getData("text")
        if (/^\d+$/.test(pastedData)) {
          const digits = pastedData.split("")
          otpInputs.forEach((input, i) => {
            if (digits[i]) {
              input.value = digits[i]
            }
          })
        }
      })
    })
  
    function focusFirstOtpInput() {
      if (otpInputs.length > 0) {
        otpInputs[0].focus()
      }
    }
  
    function resetOtpInputs() {
      otpInputs.forEach((input) => {
        input.value = ""
      })
    }
  
    let countdownInterval
    function startCountdown() {
      let seconds = 60
      countdownEl.textContent = `Puedes solicitar un nuevo código en ${seconds} segundos`
      resendCodeBtn.disabled = true
      resendCodeBtn.classList.add("text-gray-400", "cursor-not-allowed")
      resendCodeBtn.classList.remove("text-red-500", "hover:text-red-700")
  
      clearInterval(countdownInterval)
      countdownInterval = setInterval(() => {
        seconds--
        countdownEl.textContent = `Puedes solicitar un nuevo código en ${seconds} segundos`
  
        if (seconds <= 0) {
          clearInterval(countdownInterval)
          countdownEl.textContent = "Puedes solicitar un nuevo código ahora"
          resendCodeBtn.disabled = false
          resendCodeBtn.classList.remove("text-gray-400", "cursor-not-allowed")
          resendCodeBtn.classList.add("text-red-500", "hover:text-red-700")
        }
      }, 1000)
    }
  
    resendCodeBtn.addEventListener("click", () => {
      if (!resendCodeBtn.disabled) {
        // Simular reenvío
        showAlert("Se ha enviado un nuevo código.", "success")
        startCountdown()
      }
    })
  
    // Cambio de contraseña
    const passwordForm = document.getElementById("password-form")
    const newPasswordInput = document.getElementById("new-password")
    const confirmPasswordInput = document.getElementById("confirm-password")
    const passwordStrength = document.getElementById("password-strength")
    const passwordStrengthText = document.getElementById("password-strength-text")
    const passwordMatch = document.getElementById("password-match")
    const togglePasswordBtns = document.querySelectorAll(".toggle-password")
  
    // Mostrar/ocultar contraseña
    togglePasswordBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-target")
        const passwordInput = document.getElementById(targetId)
        const eyeIcon = btn.querySelector(".eye-icon")
        const eyeOffIcon = btn.querySelector(".eye-off-icon")
  
        if (passwordInput.type === "password") {
          passwordInput.type = "text"
          eyeIcon.classList.add("hidden")
          eyeOffIcon.classList.remove("hidden")
        } else {
          passwordInput.type = "password"
          eyeIcon.classList.remove("hidden")
          eyeOffIcon.classList.add("hidden")
        }
      })
    })
  
    // Evaluar fortaleza de contraseña
    newPasswordInput.addEventListener("input", () => {
      const password = newPasswordInput.value
      let strength = 0
  
      // Criterios de fortaleza
      if (password.length > 0) strength += 1
      if (password.length >= 8) strength += 1
      if (/[A-Z]/.test(password)) strength += 1
      if (/[0-9]/.test(password)) strength += 1
      if (/[^A-Za-z0-9]/.test(password)) strength += 1
  
      // Actualizar indicador
      updatePasswordStrength(strength)
  
      // Verificar coincidencia
      checkPasswordMatch()
    })
  
    function updatePasswordStrength(strength) {
      switch (strength) {
        case 0:
          passwordStrength.style.width = "0%"
          passwordStrength.className = "h-full w-0 transition-all duration-300 rounded-full"
          passwordStrengthText.textContent = "Ingresa tu contraseña"
          passwordStrengthText.className = "text-xs mt-1 text-gray-500"
          break
        case 1:
          passwordStrength.style.width = "20%"
          passwordStrength.className = "h-full transition-all duration-300 rounded-full bg-red-600"
          passwordStrengthText.textContent = "Muy débil"
          passwordStrengthText.className = "text-xs mt-1 text-red-500"
          break
        case 2:
          passwordStrength.style.width = "40%"
          passwordStrength.className = "h-full transition-all duration-300 rounded-full bg-orange-500"
          passwordStrengthText.textContent = "Débil"
          passwordStrengthText.className = "text-xs mt-1 text-orange-500"
          break
        case 3:
          passwordStrength.style.width = "60%"
          passwordStrength.className = "h-full transition-all duration-300 rounded-full bg-yellow-500"
          passwordStrengthText.textContent = "Media"
          passwordStrengthText.className = "text-xs mt-1 text-yellow-500"
          break
        case 4:
          passwordStrength.style.width = "80%"
          passwordStrength.className = "h-full transition-all duration-300 rounded-full bg-lime-500"
          passwordStrengthText.textContent = "Fuerte"
          passwordStrengthText.className = "text-xs mt-1 text-lime-500"
          break
        case 5:
          passwordStrength.style.width = "100%"
          passwordStrength.className = "h-full transition-all duration-300 rounded-full bg-green-500"
          passwordStrengthText.textContent = "Muy fuerte"
          passwordStrengthText.className = "text-xs mt-1 text-green-500"
          break
      }
    }
  
    // Verificar coincidencia de contraseñas
    confirmPasswordInput.addEventListener("input", checkPasswordMatch)
  
    function checkPasswordMatch() {
      if (confirmPasswordInput.value === "") {
        passwordMatch.classList.add("hidden")
        return
      }
  
      if (newPasswordInput.value === confirmPasswordInput.value) {
        passwordMatch.textContent = "Las contraseñas coinciden"
        passwordMatch.className = "text-xs mt-1 text-green-500"
        passwordMatch.classList.remove("hidden")
      } else {
        passwordMatch.textContent = "Las contraseñas no coinciden"
        passwordMatch.className = "text-xs mt-1 text-red-500"
        passwordMatch.classList.remove("hidden")
      }
    }
  
    passwordForm.addEventListener("submit", (e) => {
      e.preventDefault()
  
      // Validar que las contraseñas coincidan
      if (newPasswordInput.value !== confirmPasswordInput.value) {
        showAlert("Las contraseñas no coinciden.", "error")
        return
      }
  
      // Simular actualización
      showAlert("Contraseña actualizada correctamente.", "success")
      passwordForm.reset()
      passwordStrength.style.width = "0%"
      passwordStrength.className = "h-full w-0 transition-all duration-300 rounded-full"
      passwordStrengthText.textContent = "Ingresa tu contraseña"
      passwordStrengthText.className = "text-xs mt-1 text-gray-500"
      passwordMatch.classList.add("hidden")
    })
  
    // Verificación en dos pasos
    const toggle2fa = document.getElementById("toggle-2fa")
    const setup2fa = document.getElementById("2fa-setup")
  
    toggle2fa.addEventListener("change", () => {
      if (toggle2fa.checked) {
        setup2fa.classList.remove("hidden")
      } else {
        setup2fa.classList.add("hidden")
      }
    })
  
    const setup2faBtn = document.getElementById("setup-2fa-btn")
    setup2faBtn.addEventListener("click", () => {
      // Verificar que se haya seleccionado un método
      const selectedMethod = document.querySelector('input[name="2fa-method"]:checked')
      if (!selectedMethod) {
        showAlert("Por favor, selecciona un método de verificación.", "error")
        return
      }
  
      // Simular configuración
      showAlert("Verificación en dos pasos configurada correctamente.", "success")
    })
  
    // Formulario de notificaciones
    const notificationsForm = document.getElementById("notifications-form")
    notificationsForm.addEventListener("submit", (e) => {
      e.preventDefault()
      showAlert("Preferencias de notificaciones actualizadas correctamente.", "success")
    })
  
    // Formulario de idioma
    const languageForm = document.getElementById("language-form")
    languageForm.addEventListener("submit", (e) => {
      e.preventDefault()
      showAlert("Preferencias de idioma actualizadas correctamente.", "success")
    })
  
    // Gestión de cuenta
    const downloadDataBtn = document.getElementById("download-data-btn")
    downloadDataBtn.addEventListener("click", () => {
      showAlert("Tus datos se están preparando para descargar.", "success")
    })
  
    const deactivateAccountBtn = document.getElementById("deactivate-account-btn")
    deactivateAccountBtn.addEventListener("click", () => {
      if (confirm("¿Estás seguro de que deseas desactivar tu cuenta? Podrás reactivarla iniciando sesión nuevamente.")) {
        showAlert("Tu cuenta ha sido desactivada.", "success")
      }
    })
  
    // Modal de eliminación de cuenta
    const deleteAccountBtn = document.getElementById("delete-account-btn")
    const deleteAccountModal = document.getElementById("delete-account-modal")
    const cancelDeleteBtn = document.getElementById("cancel-delete-btn")
    const confirmDeleteBtn = document.getElementById("confirm-delete-btn")
    const deleteConfirmation = document.getElementById("delete-confirmation")
  
    deleteAccountBtn.addEventListener("click", () => {
      deleteAccountModal.classList.remove("hidden")
    })
  
    cancelDeleteBtn.addEventListener("click", () => {
      deleteAccountModal.classList.add("hidden")
      deleteConfirmation.value = ""
      confirmDeleteBtn.disabled = true
    })
  
    deleteConfirmation.addEventListener("input", () => {
      if (deleteConfirmation.value === "ELIMINAR") {
        confirmDeleteBtn.disabled = false
      } else {
        confirmDeleteBtn.disabled = true
      }
    })
  
    confirmDeleteBtn.addEventListener("click", () => {
      if (deleteConfirmation.value === "ELIMINAR") {
        // Simular eliminación
        deleteAccountModal.classList.add("hidden")
        showAlert("Tu cuenta ha sido eliminada permanentemente.", "success")
        setTimeout(() => {
          window.location.href = "/login"
        }, 2000)
      }
    })
  
    // Función para mostrar alertas
    function showAlert(message, type) {
      const alertContainer = document.getElementById("alert-container")
      const alert = document.getElementById("alert")
  
      // Configurar estilo según el tipo
      if (type === "success") {
        alert.className = "p-4 rounded-lg border animate-fade-in bg-green-50 border-green-200 text-green-700"
      } else if (type === "error") {
        alert.className = "p-4 rounded-lg border animate-fade-in bg-red-50 border-red-200 text-red-700"
      } else {
        alert.className = "p-4 rounded-lg border animate-fade-in bg-blue-50 border-blue-200 text-blue-700"
      }
  
      alert.textContent = message
      alertContainer.classList.remove("hidden")
  
      // Ocultar después de 5 segundos
      setTimeout(() => {
        alertContainer.classList.add("hidden")
      }, 5000)
    }
  })
  
  