// Administrador - Crear Asesor
document.addEventListener("DOMContentLoaded", () => {
    initFormValidation()
    initPasswordValidation()
    initScheduleFields()
    initSpecialtyFields()
  })
  
  // Inicializar validación del formulario
  function initFormValidation() {
    const form = document.querySelector("form")
    if (form) {
      form.addEventListener("submit", validateForm)
    }
  
    // Validación en tiempo real
    const requiredFields = ["nombre", "apellidos", "correo", "especialidad", "password", "confirm_password"]
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
  
    // Validación de experiencia
    const experienciaField = document.getElementById("experiencia")
    if (experienciaField) {
      experienciaField.addEventListener("input", validateExperiencia)
    }
  }
  
  // Validar formulario completo
  function validateForm(e) {
    e.preventDefault()
  
    let isValid = true
    const errors = []
  
    // Validar campos requeridos
    const requiredFields = [
      { id: "nombre", name: "Nombres" },
      { id: "apellidos", name: "Apellidos" },
      { id: "correo", name: "Correo electrónico" },
      { id: "especialidad", name: "Especialidad" },
      { id: "password", name: "Contraseña" },
      { id: "confirm_password", name: "Confirmar contraseña" },
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
  
    // Validar horarios
    if (!validateSchedule()) {
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
        showToast("Asesor creado correctamente")
        setTimeout(() => {
          window.location.href = "/admin/asesores"
        }, 1500)
      } else {
        showToast(data.message || "Error al crear asesor", "error")
  
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
      showToast("Error al crear asesor", "error")
    } finally {
      // Rehabilitar botón
      submitBtn.disabled = false
      submitBtn.textContent = "Crear Asesor"
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
  
  // Inicializar campos de horario
  function initScheduleFields() {
    const horaInicio = document.getElementById("hora_inicio")
    const horaFin = document.getElementById("hora_fin")
  
    if (horaInicio && horaFin) {
      horaInicio.addEventListener("change", validateSchedule)
      horaFin.addEventListener("change", validateSchedule)
    }
  }
  
  // Validar horarios
  function validateSchedule() {
    const horaInicio = document.getElementById("hora_inicio").value
    const horaFin = document.getElementById("hora_fin").value
  
    if (horaInicio && horaFin) {
      const inicio = new Date(`2000-01-01T${horaInicio}`)
      const fin = new Date(`2000-01-01T${horaFin}`)
  
      if (inicio >= fin) {
        showFieldError(document.getElementById("hora_fin"), "La hora de fin debe ser posterior a la hora de inicio")
        return false
      } else {
        clearFieldError(document.getElementById("hora_fin"))
        return true
      }
    }
    return true
  }
  
  // Inicializar campos de especialidad
  function initSpecialtyFields() {
    const especialidadField = document.getElementById("especialidad")
    if (especialidadField) {
      especialidadField.addEventListener("change", function () {
        handleSpecialtyChange(this.value)
      })
    }
  }
  
  // Manejar cambio de especialidad
  function handleSpecialtyChange(especialidad) {
    // Aquí puedes agregar lógica específica según la especialidad
    console.log("Especialidad seleccionada:", especialidad)
  
    // Ejemplo: mostrar información adicional según la especialidad
    showSpecialtyInfo(especialidad)
  }
  
  // Mostrar información de la especialidad
  function showSpecialtyInfo(especialidad) {
    let infoContainer = document.getElementById("specialty-info")
    if (!infoContainer) {
      infoContainer = document.createElement("div")
      infoContainer.id = "specialty-info"
      infoContainer.className = "mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700"
      document.getElementById("especialidad").parentNode.appendChild(infoContainer)
    }
  
    const infoTexts = {
      "Inmigración Canadiense": "Especialista en procesos generales de inmigración a Canadá.",
      "Visa de Trabajo": "Experto en visas de trabajo temporales y permisos laborales.",
      "Visa de Estudiante": "Especialista en visas de estudio y permisos estudiantiles.",
      "Residencia Permanente": "Experto en procesos de residencia permanente y ciudadanía.",
      "Reunificación Familiar": "Especialista en procesos de reunificación familiar.",
    }
  
    infoContainer.textContent = infoTexts[especialidad] || ""
    infoContainer.style.display = infoTexts[especialidad] ? "block" : "none"
  }
  
  // Validar experiencia
  function validateExperiencia() {
    const experienciaField = document.getElementById("experiencia")
    const experiencia = Number.parseInt(experienciaField.value)
  
    if (experiencia < 0) {
      showFieldError(experienciaField, "La experiencia no puede ser negativa")
      return false
    } else if (experiencia > 50) {
      showFieldError(experienciaField, "La experiencia no puede ser mayor a 50 años")
      return false
    } else {
      clearFieldError(experienciaField)
      return true
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
      checkEmailExists(email)
    }
  
    clearFieldError(emailField)
    return true
  }
  
  // Verificar si el correo ya existe
  async function checkEmailExists(email) {
    try {
      const response = await fetch("/admin/asesores/verificar-correo", {
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
  