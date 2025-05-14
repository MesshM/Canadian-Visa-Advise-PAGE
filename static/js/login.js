document.addEventListener("DOMContentLoaded", () => {
    const togglePassword = document.getElementById("togglePassword")
    const password = document.getElementById("password")
    const eyeIcon = document.getElementById("eyeIcon")
    const eyeOffIcon = document.getElementById("eyeOffIcon")
  
    if (togglePassword && password && eyeIcon && eyeOffIcon) {
      togglePassword.addEventListener("click", () => {
        // Cambiar el tipo de input
        const type = password.getAttribute("type") === "password" ? "text" : "password"
        password.setAttribute("type", type)
  
        // Cambiar el icono
        eyeIcon.classList.toggle("hidden")
        eyeOffIcon.classList.toggle("hidden")
      })
    }
  
    // Configurar el manejo de los campos de código TOTP (dígito por dígito)
    const totpDigits = document.querySelectorAll(".totp-digit")
    const hiddenTotpInput = document.getElementById("totp_code")
    const verify2faBtn = document.getElementById("verify-2fa-btn")
  
    // Función para mostrar el estado de carga en un botón
    function showLoadingState(button) {
      if (button) {
        button.innerHTML = `
          <div class="flex items-center justify-center">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            <span>Verificando...</span>
          </div>
        `
        button.disabled = true
      }
    }
  
    if (totpDigits.length > 0 && hiddenTotpInput) {
      // Función para actualizar el campo oculto con todos los dígitos
      function updateHiddenInput() {
        let code = ""
        totpDigits.forEach((digit) => {
          code += digit.value
        })
        hiddenTotpInput.value = code
  
        // Si tenemos 6 dígitos, mostrar el estado de carga y enviar el formulario
        if (code.length === 6) {
          showLoadingState(verify2faBtn)
          setTimeout(() => {
            hiddenTotpInput.form.submit()
          }, 300)
        }
      }
  
      // Configurar cada campo de dígito
      totpDigits.forEach((digit, index) => {
        // Solo permitir números
        digit.addEventListener("input", function (e) {
          // Limpiar el valor (solo números)
          this.value = this.value.replace(/[^0-9]/g, "")
  
          // Actualizar el campo oculto
          updateHiddenInput()
  
          // Si se ingresó un dígito, mover al siguiente campo
          if (this.value && index < totpDigits.length - 1) {
            totpDigits[index + 1].focus()
          }
        })
  
        // Manejar la tecla de retroceso
        digit.addEventListener("keydown", function (e) {
          if (e.key === "Backspace") {
            if (!this.value && index > 0) {
              // Si el campo está vacío y presiona backspace, mover al campo anterior
              totpDigits[index - 1].focus()
            }
          }
        })
      })
  
      // Manejar el pegado de código en cualquier campo
      totpDigits.forEach((digit) => {
        digit.addEventListener("paste", (e) => {
          e.preventDefault()
  
          // Obtener el texto pegado
          let pastedText = (e.clipboardData || window.clipboardData).getData("text")
  
          // Limpiar el texto pegado (solo números)
          pastedText = pastedText.replace(/[^0-9]/g, "").substring(0, 6)
  
          // Distribuir los dígitos en los campos
          for (let i = 0; i < Math.min(pastedText.length, totpDigits.length); i++) {
            totpDigits[i].value = pastedText[i]
          }
  
          // Actualizar el campo oculto
          updateHiddenInput()
  
          // Enfocar el siguiente campo vacío o el último si todos están llenos
          if (pastedText.length < totpDigits.length) {
            totpDigits[pastedText.length].focus()
          } else {
            totpDigits[totpDigits.length - 1].focus()
          }
        })
      })
    }
  
    // Agregar funcionalidad de carga para el botón de inicio de sesión
    const loginBtn = document.getElementById("login-btn")
    if (loginBtn) {
      const loginForm = loginBtn.closest("form")
      if (loginForm) {
        loginForm.addEventListener("submit", () => {
          loginBtn.innerHTML = `
            <div class="flex items-center justify-center">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              <span>Iniciando sesión...</span>
            </div>
          `
          loginBtn.disabled = true
        })
      }
    }
  
    // Agregar funcionalidad de carga para el botón de verificación 2FA
    if (verify2faBtn) {
      verify2faBtn.addEventListener("click", () => {
        // Verificar si todos los campos están completos
        let isComplete = true
        let code = ""
  
        totpDigits.forEach((digit) => {
          if (!digit.value) {
            isComplete = false
          }
          code += digit.value
        })
  
        if (isComplete && code.length === 6) {
          showLoadingState(verify2faBtn)
        }
      })
    }
  })
  