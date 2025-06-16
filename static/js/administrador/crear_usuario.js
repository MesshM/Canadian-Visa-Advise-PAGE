// Administrador - Crear Usuario
document.addEventListener("DOMContentLoaded", () => {
    initFormValidation()
    initPasswordValidation()
    initRoleSpecificFields()
  })
  
  // Inicializar validación del formulario
  function initFormValidation() {
    const form = document.querySelector("form")
    if (form) {
      form.addEventListener("submit", validateForm)
    }
  
    // Validación en tiempo real
    const requiredFields = ["nombres", "apellidos", "correo", "password", "confirm_password", "rol"]
    requiredFields.forEach((fieldName) => {
      const field = document.getElementById(fieldName)
      if (field) {
        field.addEventListener("blur", () => validateField(field))
        field.addEventListener("input", () => clearFieldError(field))
      }
    })
  
    // Validación de correo
    const emailField = document.getElementById("correo")
    if (emailField) {
      emailField.addEventListener("blur", validateEmail)
    }
  }
  
  // Validar formulario completo
  function validateForm(e) {
    e.preventDefault()
  
    let isValid = true
    const errors = []
  
    // Validar campos requeridos
    const requiredFields = [
      { id: "nombres", name: "Nombres" },
      { id: "apellidos", name: "Apellidos" },
      { id: "correo", name: "Correo electrónico" },
      { id: "password", name: "Contraseña" },
      { id: "confirm_password", name: "Confirmar contraseña" },
      { id: "rol", name: "Rol" },
    ]
  
    requiredFields.forEach((field) => {
      const element = document.getElementById(field.id)
      if (!element || !element.value.trim()) {
        showFieldError(element, `${field.name} es requerido`)
        errors.push(`${field.name} es requerido`)
        isValid = false
      }
    })
  
    // Validar formato de correo
    const email = document.getElementById("correo").value
    if (email && !isValidEmail(email)) {
      showFieldError(document.getElementById("correo"), "Formato de correo inválido")
      errors.push("Formato de correo inválido")
      isValid = false
    }
  
    // Validar contraseñas
    const password = document.getElementById("password").value
    const confirmPassword = document.getElementById("confirm_password").value
  
    if (password && password.length < 8) {
      showFieldError(document.getElementById("password"), "La contraseña debe tener al menos 8 caracteres")
      errors.push("La contraseña debe tener al menos 8 caracteres")
      isValid = false
    }
  
    if (password !== confirmPassword) {
      showFieldError(document.getElementById("confirm_password"), "Las contraseñas no coinciden")
      errors.push("Las contraseñas no coinciden")
      isValid = false
    }
  
    if (isValid) {
      submitForm()
    } else {
      showToast("Por favor corrige los errores en el formulario", "error")
    }
  }
  
  // Enviar formulario
  async function submitForm() {
    const form = document.querySelector("form")
    const formData = new FormData(form)
    const submitBtn = form.querySelector('button[type="submit"]')
  
    // Deshabilitar botón
    submitBtn.disabled = true
    submitBtn.textContent = "Creando..."
  
    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: formData,
      })
  
      const data = await response.json()
  
      if (data.success) {
        showToast("Usuario creado correctamente")
        setTimeout(() => {
          window.location.href = "/admin/usuarios"
        }, 1500)
      } else {
        showToast(data.message || "Error al crear usuario", "error")
  
        // Mostrar errores específicos de campos
        if (data.errors) {
          Object.keys(data.errors).forEach((field) => {
            const element = document.getElementById(field)
            if (element) {
              showFieldError(element, data.errors[field])
            }
          })
        }
      }
    } catch (error) {
      console.error("Error:", error)
      showToast("Error al crear usuario", "error")
    } finally {
      // Rehabilitar botón
      submitBtn.disabled = false
      submitBtn.textContent = "Crear Usuario"
    }
  }
  
  // Inicializar validación de contraseñas
  function initPasswordValidation() {
    const passwordField = document.getElementById("password")
    const confirmPasswordField = document.getElementById("confirm_password")
  
    if (passwordField) {
      passwordField.addEventListener("input", function () {
        validatePasswordStrength(this.value)
        if (confirmPasswordField.value) {
          validatePasswordMatch()
        }
      })
    }
  
    if (confirmPasswordField) {
      confirmPasswordField.addEventListener("input", validatePasswordMatch)
    }
  }
  
  // Validar fortaleza de contraseña
  function validatePasswordStrength(password) {
    const passwordField = document.getElementById("password")
    let strength = 0
    const feedback = []
  
    if (password.length >= 8) strength++
    else feedback.push("Al menos 8 caracteres")
  
    if (/[A-Z]/.test(password)) strength++
    else feedback.push("Una letra mayúscula")
  
    if (/[a-z]/.test(password)) strength++
    else feedback.push("Una letra minúscula")
  
    if (/[0-9]/.test(password)) strength++
    else feedback.push("Un número")
  
    if (/[^A-Za-z0-9]/.test(password)) strength++
    else feedback.push("Un símbolo especial")
  
    // Mostrar indicador de fortaleza
    updatePasswordStrengthIndicator(strength, feedback)
  }
  
  // Actualizar indicador de fortaleza
  function updatePasswordStrengthIndicator(strength, feedback) {
    let indicator = document.getElementById("password-strength")
    if (!indicator) {
      indicator = document.createElement("div")
      indicator.id = "password-strength"
      indicator.className = "mt-2 text-xs"
      document.getElementById("password").parentNode.appendChild(indicator)
    }
  
    const colors = ["text-red-500", "text-orange-500", "text-yellow-500", "text-blue-500", "text-green-500"]
    const labels = ["Muy débil", "Débil", "Regular", "Buena", "Excelente"]
  
    indicator.className = `mt-2 text-xs ${colors[strength - 1] || "text-gray-500"}`
    indicator.textContent = strength > 0 ? `Fortaleza: ${labels[strength - 1]}` : "Ingresa una contraseña"
  
    if (feedback.length > 0 && strength < 4) {
      indicator.textContent += ` - Falta: ${feedback.join(", ")}`
    }
  }
  
  // Validar coincidencia de contraseñas
  function validatePasswordMatch() {
    const password = document.getElementById("password").value
    const confirmPassword = document.getElementById("confirm_password").value
    const confirmField = document.getElementById("confirm_password")
  
    if (confirmPassword && password !== confirmPassword) {
      showFieldError(confirmField, "Las contraseñas no coinciden")
    } else if (confirmPassword) {
      clearFieldError(confirmField)
    }
  }
  
  // Inicializar campos específicos por rol
  function initRoleSpecificFields() {
    const rolField = document.getElementById("rol")
    if (rolField) {
      rolField.addEventListener("change", function () {
        handleRoleChange(this.value)
      })
    }
  }
  
  // Manejar cambio de rol
  function handleRoleChange(rol) {
    // Aquí puedes agregar lógica específica según el rol seleccionado
    // Por ejemplo, mostrar campos adicionales para asesores
  
    if (rol === "Asesor") {
      // Mostrar campos específicos de asesor si los hay
      console.log("Rol de asesor seleccionado")
    } else if (rol === "Administrador") {
      // Mostrar advertencia para administrador
      if (!confirm("¿Estás seguro de que quieres crear un usuario administrador? Tendrá acceso completo al sistema.")) {
        document.getElementById("rol").value = ""
      }
    }
  }
  
  // Funciones de validación
  function validateField(field) {
    if (!field.value.trim()) {
      showFieldError(field, "Este campo es requerido")
      return false
    }
    clearFieldError(field)
    return true
  }
  
  function validateEmail() {
    const emailField = document.getElementById("correo")
    const email = emailField.value.trim()
  
    if (email && !isValidEmail(email)) {
      showFieldError(emailField, "Formato de correo inválido")
      return false
    }
  
    if (email) {
      // Verificar si el correo ya existe
      checkEmailExists(email)
    }
  
    clearFieldError(emailField)
    return true
  }
  
  // Verificar si el correo ya existe
  async function checkEmailExists(email) {
    try {
      const response = await fetch("/admin/usuarios/verificar-correo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ correo: email }),
      })
  
      const data = await response.json()
  
      if (data.exists) {
        showFieldError(document.getElementById("correo"), "Este correo ya está registrado")
      }
    } catch (error) {
      console.error("Error verificando correo:", error)
    }
  }
  
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
  
  // Funciones de UI
  function showFieldError(field, message) {
    clearFieldError(field)
  
    field.classList.add("border-red-500")
  
    const errorDiv = document.createElement("div")
    errorDiv.className = "field-error text-red-500 text-xs mt-1"
    errorDiv.textContent = message
  
    field.parentNode.appendChild(errorDiv)
  }
  
  function clearFieldError(field) {
    field.classList.remove("border-red-500")
  
    const existingError = field.parentNode.querySelector(".field-error")
    if (existingError) {
      existingError.remove()
    }
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
  