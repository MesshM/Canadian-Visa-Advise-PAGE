/**
 * Formulario de Solicitud con Stepper - JavaScript
 * Basado en el diseño del modal de asesorías
 */

document.addEventListener("DOMContentLoaded", () => {
  // Elementos del DOM
  const asesoriasContainer = document.getElementById("asesoriasContainer")
  const loadingSpinner = document.getElementById("loadingSpinner")
  const formularioModal = document.getElementById("formularioModal")
  const formularioElegibilidad = document.getElementById("formularioElegibilidad")
  const cerrarModal = document.getElementById("cerrarModal")

  // Elementos del stepper
  const stepperPrevBtn = document.getElementById("stepper-prev-btn")
  const stepperNextBtn = document.getElementById("stepper-next-btn")
  const stepperSubmitBtn = document.getElementById("stepper-submit-btn")
  const progressBar = document.getElementById("progress-bar")
  const currentStepSpan = document.getElementById("current-step")

  // Variables del stepper
  let currentStep = 0
  const totalSteps = 4

  // Cargar asesorías pagadas al iniciar
  cargarAsesoriasPagadas()

  // Event listeners principales
  cerrarModal.addEventListener("click", cerrarModalFormulario)
  formularioElegibilidad.addEventListener("submit", enviarFormulario)

  // Event listeners del stepper
  if (stepperPrevBtn) stepperPrevBtn.addEventListener("click", prevStep)
  if (stepperNextBtn) stepperNextBtn.addEventListener("click", nextStep)
  if (stepperSubmitBtn) stepperSubmitBtn.addEventListener("click", submitFormulario)

  // Manejar cambio en familiares en Canadá
  document.addEventListener("change", (e) => {
    if (e.target.name === "familiares_canada") {
      const relacionDiv = document.getElementById("relacionFamiliaresDiv")
      if (e.target.value === "Si") {
        relacionDiv.classList.remove("hidden")
        relacionDiv.classList.add("animate-fade-in")
        document.getElementById("relacionFamiliares").required = true
      } else {
        relacionDiv.classList.add("hidden")
        document.getElementById("relacionFamiliares").required = false
        document.getElementById("relacionFamiliares").value = ""
      }
    }

    // Mostrar "¿Puede comprobar su relación?" solo si tiene familiares en Canadá
    if (e.target.name === "familiares_canada") {
      const comprobarDiv = document.getElementById("puedeComprobarRelacionDiv")
      const comprobarRadios = document.getElementsByName("puede_comprobar_relacion")
      if (e.target.value === "Si") {
        comprobarDiv.classList.remove("hidden")
        comprobarRadios.forEach((radio) => radio.setAttribute("required", "required"))
      } else {
        comprobarDiv.classList.add("hidden")
        comprobarRadios.forEach((radio) => {
          radio.removeAttribute("required")
          radio.checked = false
        })
      }
    }

    // Empleo en país de origen
    if (e.target.name === "empleo_origen") {
      const trabajoActualDiv = document.getElementById("trabajoActualDiv")
      const trabajoActualInput = document.getElementById("trabajoActual")
      const empleoExtranjeroDiv = document.getElementById("empleoExtranjeroDiv")
      const trabajoActualExtranjeroDiv = document.getElementById("trabajoActualExtranjeroDiv")
      const trabajoActualExtranjeroInput = document.getElementById("trabajoActualExtranjero")
      const motivoNoTrabajoDiv = document.getElementById("motivoNoTrabajoDiv")
      const motivoNoTrabajoInput = document.getElementById("motivoNoTrabajo")

      if (e.target.value === "Si") {
        trabajoActualDiv.style.display = ""
        trabajoActualInput.setAttribute("required", "required")
        empleoExtranjeroDiv.style.display = "none"
        trabajoActualExtranjeroDiv.style.display = "none"
        trabajoActualExtranjeroInput.removeAttribute("required")
        trabajoActualExtranjeroInput.value = ""
        motivoNoTrabajoDiv.style.display = "none"
        motivoNoTrabajoInput.removeAttribute("required")
        motivoNoTrabajoInput.value = ""
      } else {
        trabajoActualDiv.style.display = "none"
        trabajoActualInput.removeAttribute("required")
        trabajoActualInput.value = ""
        empleoExtranjeroDiv.style.display = ""
        // Limpiar campos dependientes
        trabajoActualExtranjeroDiv.style.display = "none"
        trabajoActualExtranjeroInput.removeAttribute("required")
        trabajoActualExtranjeroInput.value = ""
        motivoNoTrabajoDiv.style.display = "none"
        motivoNoTrabajoInput.removeAttribute("required")
        motivoNoTrabajoInput.value = ""
      }
    }

    // Empleo en el extranjero
    if (e.target.name === "empleo_extranjero") {
      const trabajoActualExtranjeroDiv = document.getElementById("trabajoActualExtranjeroDiv")
      const trabajoActualExtranjeroInput = document.getElementById("trabajoActualExtranjero")
      const motivoNoTrabajoDiv = document.getElementById("motivoNoTrabajoDiv")
      const motivoNoTrabajoInput = document.getElementById("motivoNoTrabajo")

      if (e.target.value === "Si") {
        trabajoActualExtranjeroDiv.style.display = ""
        trabajoActualExtranjeroInput.setAttribute("required", "required")
        motivoNoTrabajoDiv.style.display = "none"
        motivoNoTrabajoInput.removeAttribute("required")
        motivoNoTrabajoInput.value = ""
      } else if (e.target.value === "No") {
        trabajoActualExtranjeroDiv.style.display = "none"
        trabajoActualExtranjeroInput.removeAttribute("required")
        trabajoActualExtranjeroInput.value = ""
        motivoNoTrabajoDiv.style.display = ""
        motivoNoTrabajoInput.setAttribute("required", "required")
      }
    }

    // Pregunta de pasaporte
    if (e.target.name === "tiene_pasaporte") {
      const numeroPasaporteDiv = document.getElementById("numeroPasaporteDiv")
      const numeroPasaporteInput = document.getElementById("numeroPasaporte")
      const advertenciaPasaporte = document.getElementById("advertenciaPasaporte")

      if (e.target.value === "Si") {
        numeroPasaporteDiv.style.display = ""
        numeroPasaporteInput.setAttribute("required", "required")
        advertenciaPasaporte.classList.add("hidden")
        numeroPasaporteInput.value = ""
      } else {
        numeroPasaporteDiv.style.display = "none"
        numeroPasaporteInput.removeAttribute("required")
        numeroPasaporteInput.value = ""
        advertenciaPasaporte.classList.remove("hidden")
      }
    }

    // Empleo en país de origen
    if (e.target.name === "empleo_origen") {
      const empleoExtranjeroRadios = document.getElementsByName("empleo_extranjero")
      if (e.target.value === "No") {
        empleoExtranjeroRadios.forEach((radio) => radio.setAttribute("required", "required"))
      } else {
        empleoExtranjeroRadios.forEach((radio) => radio.removeAttribute("required"))
        // Limpiar selección si cambia a "Sí"
        empleoExtranjeroRadios.forEach((radio) => (radio.checked = false))
      }
    }

    // Negocios actuales
    if (e.target.name === "tiene_negocios_actuales") {
      const descripcionNegociosDiv = document.getElementById("descripcionNegociosDiv")
      const descripcionNegociosInput = document.getElementById("descripcionNegociosActuales")
      if (e.target.value === "Si") {
        descripcionNegociosDiv.style.display = ""
        descripcionNegociosInput.setAttribute("required", "required")
      } else {
        descripcionNegociosDiv.style.display = "none"
        descripcionNegociosInput.removeAttribute("required")
        descripcionNegociosInput.value = ""
      }
    }

    // Mostrar campo de relación solo si acompaña familiar
    if (e.target.name === "acompana_familiar") {
      const relacionDiv = document.getElementById("relacionAcompanaFamiliarDiv")
      const relacionInput = document.getElementById("relacionAcompanaFamiliar")
      if (e.target.value === "Si") {
        relacionDiv.classList.remove("hidden")
        relacionInput.setAttribute("required", "required")
      } else {
        relacionDiv.classList.add("hidden")
        relacionInput.removeAttribute("required")
        relacionInput.value = ""
      }
    }
  })

  // Cerrar modal al hacer clic fuera de él
  formularioModal.addEventListener("click", (e) => {
    if (e.target === formularioModal) {
      cerrarModalFormulario()
    }
  })

  /**
   * Función para mostrar notificaciones con el estilo de asesorías
   */
  function showNotification(message, type = "success") {
    const notification = document.createElement("div")
    notification.className = `fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 transform transition-all duration-500 translate-x-full max-w-md`

    if (type === "success") {
      notification.classList.add("bg-green-100", "text-green-800", "border-l-4", "border-green-500")
    } else if (type === "error") {
      notification.classList.add("bg-red-100", "text-red-800", "border-l-4", "border-red-500")
    } else if (type === "warning") {
      notification.classList.add("bg-yellow-100", "text-yellow-800", "border-l-4", "border-yellow-500")
    } else {
      notification.classList.add("bg-blue-100", "text-blue-800", "border-l-4", "border-blue-500")
    }

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
              <p class="text-sm font-medium">${message}</p>
          </div>
          <div class="ml-auto pl-3">
              <button class="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none cursor-pointer transition-colors duration-200">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
          </div>
      </div>
    `

    document.body.appendChild(notification)

    setTimeout(() => {
      notification.classList.remove("translate-x-full")
      notification.classList.add("translate-x-0")
    }, 100)

    setTimeout(() => {
      notification.classList.remove("translate-x-0")
      notification.classList.add("translate-x-full")
      setTimeout(() => notification.remove(), 500)
    }, 5000)

    notification.querySelector("button").addEventListener("click", () => {
      notification.classList.remove("translate-x-0")
      notification.classList.add("translate-x-full")
      setTimeout(() => notification.remove(), 500)
    })
  }

  /**
   * Cargar asesorías con estado "Pagada"
   */
  async function cargarAsesoriasPagadas() {
    try {
      mostrarSpinner(true)

      const response = await fetch("/formularios/asesorias_pagadas")
      const data = await response.json()

      if (data.success) {
        mostrarAsesorias(data.asesorias)
      } else {
        showNotification("Error al cargar las asesorías: " + data.message, "error")
      }
    } catch (error) {
      console.error("Error:", error)
      showNotification("Error de conexión al cargar las asesorías", "error")
    } finally {
      mostrarSpinner(false)
    }
  }

  /**
   * Mostrar las asesorías en cards con el nuevo diseño
   */
  function mostrarAsesorias(asesorias) {
    asesoriasContainer.innerHTML = ""

    if (asesorias.length === 0) {
      asesoriasContainer.innerHTML = `
        <div class="col-span-full text-center py-12 animate-fade-in">
            <div class="text-gray-500 text-lg">
                <svg class="w-20 h-20 mx-auto mb-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <h3 class="text-xl font-medium text-gray-900 mb-2">No hay asesorías pagadas disponibles</h3>
                <p class="text-gray-600">Una vez que tenga asesorías pagadas, aparecerán aquí para completar el formulario de elegibilidad.</p>
            </div>
        </div>
      `
      return
    }

    asesorias.sort((a, b) => a.codigo_asesoria - b.codigo_asesoria)
    asesorias.forEach((asesoria, idx) => {
      asesoria.numero_secuencial = idx + 1
    })

    asesorias
      .slice()
      .reverse()
      .forEach((asesoria, idx) => {
        const card = crearCardAsesoria(asesoria, idx)
        asesoriasContainer.appendChild(card)
      })
  }

  /**
   * Crear una card para una asesoría
   */
  function crearCardAsesoria(asesoria, index) {
    const card = document.createElement("div")
    card.className = `bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] animate-fade-in`
    card.style.animationDelay = `${index * 100}ms`

    const fechaFormateada = new Date(asesoria.fecha_asesoria).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    const tieneFormulario = asesoria.completado === 1
    const estadoFormulario = tieneFormulario ? "Completado" : "Pendiente"
    const colorEstado = tieneFormulario ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"

    card.innerHTML = `
      <div class="p-6">
          <div class="flex justify-between items-start mb-6">
              <div>
                  <h3 class="text-xl font-bold text-gray-900 font-roboto">
                      Formulario #${asesoria.numero_secuencial}
                  </h3>
                  <p class="text-sm text-primary-600 font-medium">${asesoria.tipo_asesoria}</p>
              </div>
              <span class="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  ${asesoria.estado}
              </span>
          </div>

          <div class="space-y-4 mb-6">
              <div class="flex items-center text-sm text-gray-600">
                  <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                      <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h3z"></path>
                      </svg>
                  </div>
                  <div>
                      <p class="font-medium text-gray-900">${fechaFormateada}</p>
                      <p class="text-xs text-gray-500">Fecha de la asesoría</p>
                  </div>
              </div>
              
              <div class="flex items-center text-sm text-gray-600">
                  <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                      <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                  </div>
                  <div>
                      <p class="font-medium text-gray-900">${asesoria.nombre_asesor || "Asesor no asignado"}</p>
                      <p class="text-xs text-gray-500">Asesor especializado</p>
                  </div>
              </div>

              <div class="flex items-center text-sm text-gray-600">
                  <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                      <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      </svg>
                  </div>
                  <div>
                      <p class="font-medium text-gray-900">${asesoria.lugar}</p>
                      <p class="text-xs text-gray-500">Modalidad</p>
                  </div>
              </div>
          </div>

          <div class="mb-6">
              <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div class="flex items-center">
                      <svg class="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      <span class="text-sm font-medium text-gray-700">Estado del Formulario:</span>
                  </div>
                  <span class="px-3 py-1 text-xs font-semibold rounded-full ${colorEstado}">
                      ${estadoFormulario}
                  </span>
              </div>
          </div>

          ${
            asesoria.descripcion
              ? `
              <div class="mb-6 p-4 bg-primary-50 rounded-xl border border-primary-100">
                  <p class="text-sm text-gray-700 leading-relaxed">${asesoria.descripcion}</p>
              </div>
          `
              : ""
          }

          <div class="pt-4 border-t border-gray-200">
              ${
                tieneFormulario
                  ? `
                  <button disabled class="w-full px-6 py-3 bg-gray-300 text-gray-500 rounded-xl cursor-not-allowed font-medium flex items-center justify-center">
                      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      Formulario Completado
                  </button>
              `
                  : `
                  <button onclick="abrirFormularioElegibilidad(${asesoria.codigo_asesoria})" 
                          class="w-full relative overflow-hidden group bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-600 text-white font-roboto py-3 px-6 rounded-xl shadow-lg hover:shadow-primary-500/30 transition-all duration-300 cursor-pointer transform hover:scale-[1.02]">
                      <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
                      <div class="relative flex items-center justify-center">
                          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          </svg>
                          <span>Llenar Formulario de Elegibilidad</span>
                      </div>
                  </button>
              `
              }
          </div>
      </div>
    `

    return card
  }

  /**
   * Abrir modal del formulario de elegibilidad
   */
  window.abrirFormularioElegibilidad = (codigoAsesoria) => {
    document.getElementById("codigoAsesoria").value = codigoAsesoria
    resetStepper()
    formularioModal.classList.remove("hidden")
    formularioModal.classList.add("flex")
    document.body.style.overflow = "hidden"

    const modalContent = formularioModal.querySelector(".bg-white")
    if (modalContent) {
      modalContent.classList.add("animate-scale-in")
    }
  }

  /**
   * Cerrar modal del formulario
   */
  function cerrarModalFormulario() {
    const modalContent = formularioModal.querySelector(".bg-white")

    if (modalContent) {
      modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
    }

    setTimeout(() => {
      formularioModal.classList.remove("flex")
      formularioModal.classList.add("hidden")
      document.body.style.overflow = "auto"
      formularioElegibilidad.reset()
      resetStepper()

      document.getElementById("relacionFamiliaresDiv").classList.add("hidden")
      document.getElementById("relacionFamiliares").required = false
      document.getElementById("trabajoActualDiv").style.display = "none"
      document.getElementById("trabajoActual").removeAttribute("required")

      if (modalContent) {
        modalContent.classList.remove("opacity-0", "scale-95", "transition-all", "duration-300")
      }
    }, 300)
  }

  /**
   * Resetear el stepper al estado inicial
   */
  function resetStepper() {
    currentStep = 0
    updateStepperUI()
    showStep(0)
  }

  /**
   * Ir al paso anterior
   */
  function prevStep() {
    if (currentStep > 0) {
      currentStep--
      updateStepperUI()
      showStep(currentStep)
    }
  }

  /**
   * Ir al siguiente paso
   */
  function nextStep() {
    if (validateCurrentStep() && currentStep < totalSteps - 1) {
      currentStep++
      updateStepperUI()
      showStep(currentStep)
    }
  }

  /**
   * Enviar formulario (último paso)
   */
  function submitFormulario() {
    if (validateCurrentStep()) {
      enviarFormulario(new Event("submit"))
    }
  }

  /**
   * Mostrar el paso específico
   */
  function showStep(stepIndex) {
    const contents = document.querySelectorAll(".stepper-content")

    contents.forEach((content, index) => {
      if (index === stepIndex) {
        content.classList.remove("hidden")
        content.classList.add("animate-fade-in")
      } else {
        content.classList.add("hidden")
        content.classList.remove("animate-fade-in")
      }
    })
  }

  /**
   * Actualizar la UI del stepper
   */
  function updateStepperUI() {
    const steps = document.querySelectorAll(".stepper-step")
    const connectors = document.querySelectorAll(".stepper-connector")

    // Actualizar pasos
    steps.forEach((step, index) => {
      const circle = step.querySelector("div:first-child")

      if (index < currentStep) {
        // Paso completado
        step.classList.add("completed")
        step.classList.remove("active")
        if (circle) {
          circle.classList.remove("bg-gray-200", "text-gray-500")
          circle.classList.add("bg-primary-600", "text-white")
          circle.innerHTML =
            '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
        }
      } else if (index === currentStep) {
        // Paso activo
        step.classList.add("active")
        step.classList.remove("completed")
        if (circle) {
          circle.classList.remove("bg-gray-200", "text-gray-500")
          circle.classList.add("bg-primary-600", "text-white")
          circle.innerHTML = `<span>${index + 1}</span>`
        }
      } else {
        // Paso pendiente
        step.classList.remove("active", "completed")
        if (circle) {
          circle.classList.remove("bg-primary-600", "text-white")
          circle.classList.add("bg-gray-200", "text-gray-500")
          circle.innerHTML = `<span>${index + 1}</span>`
        }
      }
    })

    // Actualizar conectores
    connectors.forEach((connector, index) => {
      if (index < currentStep) {
        connector.classList.remove("bg-gray-200")
        connector.classList.add("bg-primary-600")
      } else {
        connector.classList.remove("bg-primary-600")
        connector.classList.add("bg-gray-200")
      }
    })

    // Actualizar botones
    if (stepperPrevBtn) {
      if (currentStep === 0) {
        stepperPrevBtn.classList.add("hidden")
      } else {
        stepperPrevBtn.classList.remove("hidden")
      }
    }

    if (stepperNextBtn && stepperSubmitBtn) {
      if (currentStep === totalSteps - 1) {
        stepperNextBtn.classList.add("hidden")
        stepperSubmitBtn.classList.remove("hidden")
      } else {
        stepperNextBtn.classList.remove("hidden")
        stepperSubmitBtn.classList.add("hidden")
      }
    }

    // Actualizar barra de progreso
    if (progressBar) {
      const progress = ((currentStep + 1) / totalSteps) * 100
      progressBar.style.width = `${progress}%`
    }

    if (currentStepSpan) {
      currentStepSpan.textContent = currentStep + 1
    }
  }

  /**
   * Validar el paso currentStep
   */
  function validateCurrentStep() {
    const currentContent = document.querySelectorAll(".stepper-content")[currentStep]
    if (!currentContent) return false

    const requiredFields = currentContent.querySelectorAll("[required]")

    for (const field of requiredFields) {
      if (field.type === "radio") {
        const radioGroup = currentContent.querySelectorAll(`[name="${field.name}"]`)
        const isChecked = Array.from(radioGroup).some((radio) => radio.checked)
        if (!isChecked) {
          showNotification(`Por favor, seleccione una opción para: ${field.name.replace(/_/g, " ")}`, "error")
          return false
        }
      } else if (field.type === "checkbox") {
        if (!field.checked) {
          showNotification("Debe aceptar los términos y condiciones", "error")
          return false
        }
      } else if (!field.value.trim()) {
        showNotification(`Por favor, complete el campo: ${field.name.replace(/_/g, " ")}`, "error")
        return false
      }
    }

    // Validaciones específicas por paso
    if (currentStep === 0) {
      const fechaNac = document.getElementById("fechaNacimiento").value
      if (fechaNac) {
        const fechaNacimiento = new Date(fechaNac)
        const hoy = new Date()
        const edad = hoy.getFullYear() - fechaNacimiento.getFullYear()

        if (edad < 18) {
          showNotification("Debe ser mayor de 18 años para aplicar", "error")
          return false
        }

        if (edad > 100) {
          showNotification("Por favor verifique la fecha de nacimiento", "error")
          return false
        }
      }
    }

    return true
  }
  /**
   * Mostrar/ocultar spinner de carga
   */
  function mostrarSpinner(mostrar) {
    if (mostrar) {
      loadingSpinner.classList.remove("hidden")
      asesoriasContainer.classList.add("hidden")
    } else {
      loadingSpinner.classList.add("hidden")
      asesoriasContainer.classList.remove("hidden")
    }
  }

  // Validaciones de entrada para campos específicos
  const numeroDocumentoInput = document.getElementById("numeroDocumento")
  if (numeroDocumentoInput) {
    numeroDocumentoInput.addEventListener("keydown", (e) => {
      if (
        [46, 8, 9, 27, 13].includes(e.keyCode) ||
        (e.ctrlKey && [65, 67, 86, 88].includes(e.keyCode)) ||
        (e.keyCode >= 35 && e.keyCode <= 39)
      ) {
        return
      }
      if (["e", "E", "+", "-", "."].includes(e.key)) {
        e.preventDefault()
      }
      if ((e.shiftKey || e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault()
      }
    })

    numeroDocumentoInput.addEventListener("paste", (e) => {
      const paste = (e.clipboardData || window.clipboardData).getData("text")
      if (!/^\d+$/.test(paste)) {
        e.preventDefault()
      }
    })

    numeroDocumentoInput.addEventListener("input", function (e) {
      this.value = this.value.replace(/\D/g, "")
    })
  }

  const propositoPrincipalInput = document.getElementById("propositoPrincipal")
  if (propositoPrincipalInput) {
    propositoPrincipalInput.addEventListener("input", function (e) {
      this.value = this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñüÜ\s.,;:¡!¿?()"''-]/g, "")
    })
  }

  const propositoDetalladoInput = document.getElementById("propositoDetallado")
  if (propositoDetalladoInput) {
    propositoDetalladoInput.addEventListener("input", function (e) {
      this.value = this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñüÜ\s.,;:¡!¿?()"''-]/g, "")
    })
  }

  const relacionFamiliaresInput = document.getElementById("relacionFamiliares")
  if (relacionFamiliaresInput) {
    relacionFamiliaresInput.addEventListener("input", function (e) {
      this.value = this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñüÜ\s.,;:¡!¿?()"''-]/g, "")
    })
  }

  const tiempoEstadiaCantidadInput = document.getElementById("tiempoEstadiaCantidad")
  if (tiempoEstadiaCantidadInput) {
    tiempoEstadiaCantidadInput.addEventListener("keydown", (e) => {
      if (
        [8, 9, 13, 27, 46].includes(e.keyCode) ||
        (e.ctrlKey && [65, 67, 86, 88].includes(e.keyCode)) ||
        (e.keyCode >= 35 && e.keyCode <= 39)
      ) {
        return
      }
      if (["e", "E", "+", "-", "."].includes(e.key)) {
        e.preventDefault()
      }
      if ((e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault()
      }
    })

    tiempoEstadiaCantidadInput.addEventListener("paste", (e) => {
      const paste = (e.clipboardData || window.clipboardData).getData("text")
      if (!/^\d+$/.test(paste)) {
        e.preventDefault()
      }
    })

    tiempoEstadiaCantidadInput.addEventListener("input", function (e) {
      this.value = this.value.replace(/\D/g, "")
    })
  }

  const nombreCompletoInput = document.getElementById("nombreCompleto")
  if (nombreCompletoInput) {
    nombreCompletoInput.addEventListener("input", function (e) {
      this.value = this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñüÜ\s]/g, "")
    })
  }

  const ingresosMensualesInput = document.getElementById("ingresosMensuales")
  if (ingresosMensualesInput) {
    ingresosMensualesInput.addEventListener("input", function (e) {
      // Eliminar todo lo que no sea número
      let valor = this.value.replace(/\D/g, "")
      // Formatear con separador de miles
      valor = valor.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
      this.value = valor
    })

    ingresosMensualesInput.addEventListener("keydown", (e) => {
      // Permitir: backspace, delete, tab, escape, enter, arrows
      if (
        [8, 9, 13, 27, 46].includes(e.keyCode) ||
        (e.ctrlKey && [65, 67, 86, 88].includes(e.keyCode)) ||
        (e.keyCode >= 35 && e.keyCode <= 39)
      ) {
        return
      }
      // Bloquear todo lo que no sea número
      if ((e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault()
      }
    })

    ingresosMensualesInput.addEventListener("paste", (e) => {
      const paste = (e.clipboardData || window.clipboardData).getData("text")
      if (!/^\d+$/.test(paste.replace(/\./g, ""))) {
        e.preventDefault()
      }
    })
  }

  // Inicializar el stepper
  resetStepper()

  // Validación solo letras y signos de puntuación
  const relacionAcompanaFamiliarInput = document.getElementById("relacionAcompanaFamiliar")
  if (relacionAcompanaFamiliarInput) {
    relacionAcompanaFamiliarInput.addEventListener("input", function () {
      this.value = this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñüÜ\s.,;:¡!¿?()"'-]/g, "")
    })
  }
  // Validación solo letras y signos de puntuación
  const descripcionNegociosActualesInput = document.getElementById("descripcionNegociosActuales")
  if (descripcionNegociosActualesInput) {
    descripcionNegociosActualesInput.addEventListener("input", function () {
      this.value = this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñüÜ\s.,;:¡!¿?()"'-]/g, "")
    })
  }

  // Definición de documentos por tipo de visa - MEJORADA PARA GRID DE 2 COLUMNAS
  const documentosPorVisa = {
    Turismo: [
      { label: "Itinerario de viaje", name: "doc_itinerario_viaje", required: true },
      { label: "Carta de motivación o carta de intención", name: "doc_carta_motivacion", required: true },
      { label: "Carta laboral o de estudio", name: "doc_carta_laboral", required: true },
      { label: "Certificados de propiedad", name: "doc_certificados_propiedad", required: false },
      { label: "Declaraciones de renta o extractos bancarios", name: "doc_extractos_bancarios", required: true },
      { label: "Carta de invitación (si aplica)", name: "doc_carta_invitacion", required: false },
    ],
    Trabajo: [
      { label: "Oferta laboral firmada (Job Offer Letter)", name: "doc_oferta_laboral", required: true },
      { label: "LMIA o exención", name: "doc_lmia", required: true },
      { label: "Contrato laboral", name: "doc_contrato_laboral", required: true },
      { label: "Certificados de experiencia laboral previa", name: "doc_certificados_experiencia", required: true },
      { label: "Hoja de vida actualizada", name: "doc_hoja_vida", required: true },
      { label: "Diplomas o certificados relacionados al cargo", name: "doc_diplomas", required: true },
      { label: "Examen médico (si aplica)", name: "doc_examen_medico", required: false },
      { label: "Carta de motivación", name: "doc_carta_motivacion_trabajo", required: false },
    ],
    Estudio: [
      {
        label: "Carta de aceptación de una institución educativa canadiense (DLI)",
        name: "doc_carta_aceptacion",
        required: true,
      },
      { label: "Comprobante de pago de matrícula", name: "doc_pago_matricula", required: true },
      { label: "Pruebas de fondos para cubrir matrícula y manutención", name: "doc_pruebas_fondos", required: true },
      { label: "Carta de motivación/Estudio", name: "doc_carta_motivacion_estudio", required: true },
      { label: "Historial académico (diplomas, certificados, notas)", name: "doc_historial_academico", required: true },
      { label: "Examen médico (si aplica)", name: "doc_examen_medico_estudio", required: false },
      { label: "Formulario custodia (si es menor de edad)", name: "doc_formulario_custodia", required: false },
    ],
    Negocios: [
      { label: "Carta de invitación de la empresa canadiense", name: "doc_carta_invitacion_negocios", required: true },
      {
        label: "Registro de Cámara de Comercio de la empresa solicitante",
        name: "doc_registro_camara",
        required: true,
      },
      {
        label: "Certificados bancarios y financieros de la empresa",
        name: "doc_certificados_bancarios_empresa",
        required: true,
      },
      { label: "Itinerario de negocios", name: "doc_itinerario_negocios", required: true },
      { label: "Carta del empleador (si aplica)", name: "doc_carta_empleador", required: false },
      { label: "Contratos comerciales previos (si existen)", name: "doc_contratos_comerciales", required: false },
      { label: "Documentación que demuestre vínculo comercial", name: "doc_vinculo_comercial", required: true },
    ],
    "Visita Familiar": [
      { label: "Carta de invitación del familiar en Canadá", name: "doc_carta_invitacion_familiar", required: true },
      { label: "Prueba de parentesco", name: "doc_prueba_parentesco", required: true },
      {
        label: "Documentos financieros del familiar (si cubrirá gastos)",
        name: "doc_finanzas_familiar",
        required: false,
      },
      { label: "Contrato laboral", name: "doc_contrato_laboral_familiar", required: true },
      { label: "Certificados de estudio", name: "doc_certificados_estudio_familiar", required: false },
      { label: "Propiedades a tu nombre", name: "doc_propiedades_nombre", required: false },
      { label: "Carta de motivación", name: "doc_carta_motivacion_familiar", required: true },
    ],
  }

  // Función mejorada para renderizar documentos en grid de 2 columnas
  function renderDocumentosPorVisa(tipoVisa) {
    const contenedor = document.getElementById("documentosDinamicos")
    contenedor.innerHTML = ""

    if (!tipoVisa || !documentosPorVisa[tipoVisa]) {
      contenedor.innerHTML = `
        <div class="col-span-full text-center py-8 text-gray-500">
          <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <p class="text-sm">Seleccione un motivo de viaje en el Paso 1 para ver los documentos requeridos</p>
        </div>
      `
      return
    }

    // Dividir documentos en dos columnas (máximo 5 por columna)
    const documentos = documentosPorVisa[tipoVisa]
    const mitad = Math.ceil(documentos.length / 2)
    const columnaIzquierda = documentos.slice(0, Math.min(mitad, 5))
    const columnaDerecha = documentos.slice(mitad, Math.min(documentos.length, mitad + 5))

    // Crear contenedor para columna izquierda
    const columnaIzq = document.createElement("div")
    columnaIzq.className = "space-y-4"

    // Crear contenedor para columna derecha
    const columnaDer = document.createElement("div")
    columnaDer.className = "space-y-4"

    // Renderizar documentos de la columna izquierda
    columnaIzquierda.forEach((doc, index) => {
      const docElement = crearElementoDocumento(doc, index)
      columnaIzq.appendChild(docElement)
    })

    // Renderizar documentos de la columna derecha
    columnaDerecha.forEach((doc, index) => {
      const docElement = crearElementoDocumento(doc, index + columnaIzquierda.length)
      columnaDer.appendChild(docElement)
    })

    // Agregar las columnas al contenedor principal
    contenedor.appendChild(columnaIzq)
    contenedor.appendChild(columnaDer)
  }

  // Función para crear elemento de documento individual
  function crearElementoDocumento(doc, index) {
    const docId = doc.name
    const isRequired = doc.required
    const requiredMark = isRequired
      ? '<span class="text-red-500 ml-1">*</span>'
      : '<span class="text-gray-400 ml-1">(opcional)</span>'

    const bloque = document.createElement("div")
    bloque.className =
      "p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors duration-200"

    bloque.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-start justify-between">
          <label class="block text-sm font-medium text-gray-800 flex-1">
            <span class="flex items-center">
              <span class="w-6 h-6 rounded-full bg-primary-100 text-primary-600 text-xs font-bold flex items-center justify-center mr-2 flex-shrink-0">
                ${index + 1}
              </span>
              ${doc.label}${requiredMark}
            </span>
          </label>
        </div>
        
        <div class="ml-8">
          <select name="${docId}_estado" id="${docId}_estado" 
                  class="w-full py-2.5 px-3 border border-gray-300 bg-white rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-200">
            <option value="">Seleccione el estado del documento</option>
            <option value="Disponible">✅ Disponible - Tengo el documento</option>
            <option value="En proceso">⏳ En proceso - Lo estoy tramitando</option>
            <option value="No disponible">❌ No disponible - No lo tengo</option>
          </select>
          
          <!-- Área de carga de archivo -->
          <div id="${docId}_upload" class="hidden mt-3 p-3 bg-white rounded-lg border border-dashed border-gray-300">
            <div class="text-center">
              <svg class="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3 3m0 0l-3-3m3 3V8"></path>
              </svg>
              <input type="file" name="${docId}_file" id="${docId}_file" 
                     accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" 
                     class="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"/>
              <p class="text-xs text-gray-500 mt-1">PDF, JPG, PNG, DOC (máx. 10MB)</p>
            </div>
            <div class="mt-3 flex justify-center">
              <button type="button" 
                      class="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors duration-200 flex items-center"
                      onclick="subirDocumentoCloudinary('${docId}')">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3 3m0 0l-3-3m3 3V8"></path>
                </svg>
                Subir documento
              </button>
            </div>
            <div id="${docId}_uploaded" class="mt-2 text-center text-sm font-medium"></div>
          </div>
          
          <!-- Advertencia para documentos no disponibles -->
          <div id="${docId}_advertencia" class="hidden mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div class="flex items-start">
              <svg class="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <div>
                <p class="text-sm font-medium text-yellow-800">Documento requerido</p>
                <p class="text-xs text-yellow-700 mt-1">Debe obtener este documento para completar su solicitud de visa.</p>
              </div>
            </div>
          </div>
          
          <!-- Información para documentos en proceso -->
          <div id="${docId}_proceso" class="hidden mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex items-start">
              <svg class="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <p class="text-sm font-medium text-blue-800">Documento en trámite</p>
                <p class="text-xs text-blue-700 mt-1">Asegúrese de tener este documento antes de la cita consular.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `

    // Lógica para mostrar/ocultar secciones según el estado
    const select = bloque.querySelector(`#${docId}_estado`)
    select.addEventListener("change", function () {
      const uploadDiv = bloque.querySelector(`#${docId}_upload`)
      const advertenciaDiv = bloque.querySelector(`#${docId}_advertencia`)
      const procesoDiv = bloque.querySelector(`#${docId}_proceso`)

      // Ocultar todas las secciones primero
      uploadDiv.classList.add("hidden")
      advertenciaDiv.classList.add("hidden")
      procesoDiv.classList.add("hidden")

      // Mostrar la sección apropiada según la selección
      if (this.value === "Disponible") {
        uploadDiv.classList.remove("hidden")
      } else if (this.value === "No disponible") {
        advertenciaDiv.classList.remove("hidden")
      } else if (this.value === "En proceso") {
        procesoDiv.classList.remove("hidden")
      }
    })

    return bloque
  }

  // Detectar el tipo de visa seleccionado y renderizar documentos
  const motivoViajeSelect = document.getElementById("motivoViaje")
  if (motivoViajeSelect) {
    motivoViajeSelect.addEventListener("change", function () {
      renderDocumentosPorVisa(this.value)
    })
    // Render inicial si ya hay valor seleccionado
    if (motivoViajeSelect.value) renderDocumentosPorVisa(motivoViajeSelect.value)
  }

  // Función mejorada para subir a Cloudinary
  window.subirDocumentoCloudinary = async (docId) => {
    const fileInput = document.getElementById(`${docId}_file`)
    const uploadedSpan = document.getElementById(`${docId}_uploaded`)

    if (!fileInput.files.length) {
      showNotification("Seleccione un archivo para subir.", "error")
      return
    }

    const file = fileInput.files[0]

    // Validar tamaño del archivo (10MB máximo)
    if (file.size > 10 * 1024 * 1024) {
      showNotification("El archivo es demasiado grande. Máximo 10MB permitido.", "error")
      return
    }

    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", "YOUR_CLOUDINARY_UPLOAD_PRESET") // Cambia por tu preset

    try {
      uploadedSpan.innerHTML = `
        <div class="flex items-center justify-center text-blue-600">
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Subiendo archivo...
        </div>
      `

      const res = await fetch("https://api.cloudinary.com/v1_1/YOUR_CLOUDINARY_CLOUD_NAME/auto/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (data.secure_url) {
        uploadedSpan.innerHTML = `
          <div class="flex items-center justify-center text-green-600">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            ¡Documento subido exitosamente!
          </div>
        `
        uploadedSpan.dataset.url = data.secure_url
        showNotification("Documento subido correctamente.", "success")
      } else {
        uploadedSpan.innerHTML = ""
        showNotification("Error al subir el documento.", "error")
      }
    } catch (err) {
      uploadedSpan.innerHTML = ""
      showNotification("Error de conexión al subir el documento.", "error")
    }
  }

  /**
   * Enviar formulario al servidor
   */
  async function enviarFormulario(e) {
    e.preventDefault()

    const submitButton = stepperSubmitBtn
    const originalContent = submitButton.innerHTML

    try {
      submitButton.disabled = true
      submitButton.innerHTML = `
        <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
        <div class="relative flex items-center justify-center">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
            <span>Enviando...</span>
        </div>
      `

      const formData = new FormData(formularioElegibilidad)
      const datos = Object.fromEntries(formData.entries())

      if (datos.terminos === "on") datos.terminos = 1
      if (datos.privacidad === "on") datos.privacidad = 1

      datos.codigo_asesoria = Number.parseInt(datos.codigo_asesoria)

      if (datos.tiempo_estadia_cantidad && datos.tiempo_estadia_unidad) {
        datos.tiempo_estadia = `${datos.tiempo_estadia_cantidad} ${datos.tiempo_estadia_unidad}`
        delete datos.tiempo_estadia_cantidad
        delete datos.tiempo_estadia_unidad
      }

      console.log("Enviando datos:", datos)

      const response = await fetch("/formularios/procesar_elegibilidad", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datos),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error del servidor:", response.status, errorText)
        throw new Error(`Error ${response.status}: ${errorText}`)
      }

      const result = await response.json()

      if (result.success) {
        // Mostrar mensaje de éxito y pasar al paso final
        showStep(4) // Mostrar mensaje de formulario completado

        // Ocultar todos los botones del stepper
        if (stepperPrevBtn) stepperPrevBtn.classList.add("hidden")
        if (stepperNextBtn) stepperNextBtn.classList.add("hidden")
        if (stepperSubmitBtn) stepperSubmitBtn.classList.add("hidden")

        showNotification("¡Formulario enviado exitosamente! Su información ha sido procesada correctamente.", "success")

        // Recargar asesorías después de un tiempo
        setTimeout(() => {
          cargarAsesoriasPagadas()
        }, 3000)

        // Cerrar modal después de mostrar el mensaje
        setTimeout(() => {
          cerrarModalFormulario()
        }, 5000)
      } else {
        showNotification("Error al enviar el formulario: " + result.message, "error")
      }
    } catch (error) {
      console.error("Error detallado:", error)
      showNotification(`Error al enviar el formulario: ${error.message}`, "error")
    } finally {
      submitButton.disabled = false
      submitButton.innerHTML = originalContent
    }
  }
})
