/**
 * Formulario de Solicitud con Stepper - JavaScript MODIFICADO
 * Cambios:
 * - Eliminado botón de subida individual de documentos.
 * - Implementada subida en lote al enviar formulario final.
 * - Nueva estructura de carpetas y nombres en Cloudinary.
 * - Corregido el ID para obtener el id_usuario.
 * - Nombre de archivo reemplaza texto en drop-area.
 * - Animación de error para drop-area.
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

  // Elementos del paso 4 simplificado
  const toggleDocumentos = document.getElementById("toggle-documentos")
  const documentosContenido = document.getElementById("documentos-contenido")
  const documentosContador = document.getElementById("documentos-contador")

  // Variables del stepper
  let currentStep = 0
  const totalSteps = 4 // Asumiendo 4 pasos de contenido antes del mensaje de éxito

  // Almacenamiento para archivos a subir
  let filesToUploadGlobally = {} // { docId: File }
  let fileUrlsFromUpload = {} // { docId: cloudinaryUrl }

  // Contenido original del drop area para restaurarlo
  const originalDropAreaContent = `
    <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <div class="flex text-sm text-gray-600">
      <p class="pl-1">Arrastra y suelta archivos aquí o <span class="font-medium text-primary-600 hover:text-primary-500">haz clic para seleccionar</span></p>
    </div>
    <p class="text-xs text-gray-500">PDF, JPG, PNG, DOC, DOCX hasta 10MB</p>
  `

  // Cargar asesorías pagadas al iniciar
  cargarAsesoriasPagadas()

  // Event listeners principales
  cerrarModal.addEventListener("click", cerrarModalFormulario)

  // Event listeners del stepper
  if (stepperPrevBtn) stepperPrevBtn.addEventListener("click", prevStep)
  if (stepperNextBtn) stepperNextBtn.addEventListener("click", nextStep)
  if (stepperSubmitBtn) stepperSubmitBtn.addEventListener("click", () => enviarFormulario(new Event("submit")))

  // Event listeners del paso 4 simplificado
  if (toggleDocumentos) {
    toggleDocumentos.addEventListener("click", toggleDocumentosSection)
  }

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
        trabajoActualExtranjeroDiv.style.display = "none"
        trabajoActualExtranjeroInput.removeAttribute("required")
        trabajoActualExtranjeroInput.value = ""
        motivoNoTrabajoDiv.style.display = "none"
        motivoNoTrabajoInput.removeAttribute("required")
        motivoNoTrabajoInput.value = ""
      }
    }

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

    if (e.target.name === "empleo_origen") {
      const empleoExtranjeroRadios = document.getElementsByName("empleo_extranjero")
      if (e.target.value === "No") {
        empleoExtranjeroRadios.forEach((radio) => radio.setAttribute("required", "required"))
      } else {
        empleoExtranjeroRadios.forEach((radio) => radio.removeAttribute("required"))
        empleoExtranjeroRadios.forEach((radio) => (radio.checked = false))
      }
    }

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

  formularioModal.addEventListener("click", (e) => {
    if (e.target === formularioModal) {
      cerrarModalFormulario()
    }
  })

  function toggleDocumentosSection() {
    const icon = toggleDocumentos.querySelector("svg")
    const isExpanded = !documentosContenido.classList.contains("max-h-0")

    if (isExpanded) {
      documentosContenido.style.maxHeight = "0px"
      documentosContenido.classList.add("max-h-0")
      icon.style.transform = "rotate(0deg)"
    } else {
      documentosContenido.style.maxHeight = documentosContenido.scrollHeight + "px"
      documentosContenido.classList.remove("max-h-0")
      icon.style.transform = "rotate(180deg)"
    }
  }

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
                    <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h3z"></path></svg>
                </div>
                <div><p class="font-medium text-gray-900">${fechaFormateada}</p><p class="text-xs text-gray-500">Fecha de la asesoría</p></div>
            </div>
            <div class="flex items-center text-sm text-gray-600">
                <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                    <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                </div>
                <div><p class="font-medium text-gray-900">${asesoria.nombre_asesor || "Asesor no asignado"}</p><p class="text-xs text-gray-500">Asesor especializado</p></div>
            </div>
            <div class="flex items-center text-sm text-gray-600">
                <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                    <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                </div>
                <div><p class="font-medium text-gray-900">${asesoria.lugar}</p><p class="text-xs text-gray-500">Modalidad</p></div>
            </div>
        </div>
        <div class="mb-6">
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div class="flex items-center">
                    <svg class="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    <span class="text-sm font-medium text-gray-700">Estado del Formulario:</span>
                </div>
                <span class="px-3 py-1 text-xs font-semibold rounded-full ${colorEstado}">${estadoFormulario}</span>
            </div>
        </div>
        ${asesoria.descripcion ? `<div class="mb-6 p-4 bg-primary-50 rounded-xl border border-primary-100"><p class="text-sm text-gray-700 leading-relaxed">${asesoria.descripcion}</p></div>` : ""}
        <div class="pt-4 border-t border-gray-200">
            ${
              tieneFormulario
                ? `<button disabled class="w-full px-6 py-3 bg-gray-300 text-gray-500 rounded-xl cursor-not-allowed font-medium flex items-center justify-center"><svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Formulario Completado</button>`
                : `<button onclick="abrirFormularioElegibilidad(${asesoria.codigo_asesoria}, ${asesoria.id_solicitante})" class="w-full relative overflow-hidden group bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-600 text-white font-roboto py-3 px-6 rounded-xl shadow-lg hover:shadow-primary-500/30 transition-all duration-300 cursor-pointer transform hover:scale-[1.02]"><span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span><div class="relative flex items-center justify-center"><svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><span>Llenar Formulario de Elegibilidad</span></div></button>`
            }
        </div>
    </div>
  `
    return card
  }

  window.abrirFormularioElegibilidad = (codigoAsesoria, idSolicitante) => {
    document.getElementById("codigoAsesoria").value = codigoAsesoria
    if (formularioElegibilidad) {
      formularioElegibilidad.dataset.idSolicitante = idSolicitante
    }
    resetStepper()
    formularioModal.classList.remove("hidden")
    formularioModal.classList.add("flex")
    document.body.style.overflow = "hidden"
    const modalContent = formularioModal.querySelector(".bg-white")
    if (modalContent) modalContent.classList.add("animate-scale-in")
  }

  function cerrarModalFormulario() {
    const modalContent = formularioModal.querySelector(".bg-white")
    if (modalContent) modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
    setTimeout(() => {
      formularioModal.classList.remove("flex")
      formularioModal.classList.add("hidden")
      document.body.style.overflow = "auto"
      formularioElegibilidad.reset()
      resetStepper()
      filesToUploadGlobally = {}
      fileUrlsFromUpload = {}
      // Restaurar contenido original de todos los drop areas
      document.querySelectorAll('[id$="_drop_area_content"]').forEach((contentDiv) => {
        contentDiv.innerHTML = originalDropAreaContent
        contentDiv.classList.remove("text-green-600", "text-red-600", "items-center", "justify-center")
        contentDiv.classList.add("space-y-1", "text-center")
        const parentLabel = contentDiv.closest("label")
        if (parentLabel) {
          parentLabel.classList.remove("border-red-500", "bg-red-50", "animate-shake")
          parentLabel.classList.add("border-gray-300", "bg-gray-50")
        }
      })
      document.querySelectorAll('input[type="file"]').forEach((input) => (input.value = null))
      document.getElementById("relacionFamiliaresDiv").classList.add("hidden")
      document.getElementById("relacionFamiliares").required = false
      document.getElementById("trabajoActualDiv").style.display = "none"
      document.getElementById("trabajoActual").removeAttribute("required")
      if (modalContent) modalContent.classList.remove("opacity-0", "scale-95", "transition-all", "duration-300")
    }, 300)
  }

  function resetStepper() {
    currentStep = 0
    updateStepperUI()
    showStep(0)
    filesToUploadGlobally = {}
    fileUrlsFromUpload = {}
    // Restaurar contenido original de todos los drop areas en resetStepper también
    document.querySelectorAll('[id$="_drop_area_content"]').forEach((contentDiv) => {
      contentDiv.innerHTML = originalDropAreaContent
      contentDiv.classList.remove("text-green-600", "text-red-600", "items-center", "justify-center", "break-all")
      contentDiv.classList.add("space-y-1", "text-center")
      const parentLabel = contentDiv.closest("label")
      if (parentLabel) {
        parentLabel.classList.remove("border-red-500", "bg-red-50", "animate-shake", "border-green-500", "bg-green-50")
        parentLabel.classList.add("border-gray-300", "bg-gray-50")
      }
    })
    document.querySelectorAll('input[type="file"]').forEach((input) => (input.value = null))
  }

  function prevStep() {
    if (currentStep > 0) {
      currentStep--
      updateStepperUI()
      showStep(currentStep)
    }
  }

  function nextStep() {
    if (validateCurrentStep() && currentStep < totalSteps - 1) {
      currentStep++
      updateStepperUI()
      showStep(currentStep)
      if (currentStep === 3 && documentosContenido.classList.contains("max-h-0")) {
        setTimeout(() => toggleDocumentosSection(), 300)
      }
    }
  }

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
    if (stepIndex === totalSteps) {
      if (stepperPrevBtn) stepperPrevBtn.classList.add("hidden")
      if (stepperNextBtn) stepperNextBtn.classList.add("hidden")
      if (stepperSubmitBtn) stepperSubmitBtn.classList.add("hidden")
    }
  }

  function updateStepperUI() {
    const steps = document.querySelectorAll(".stepper-step")
    const connectors = document.querySelectorAll(".stepper-connector")
    steps.forEach((step, index) => {
      const circle = step.querySelector("div:first-child")
      if (index < currentStep) {
        step.classList.add("completed")
        step.classList.remove("active")
        if (circle) {
          circle.classList.remove("bg-gray-200", "text-gray-500")
          circle.classList.add("bg-primary-600", "text-white")
          circle.innerHTML =
            '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
        }
      } else if (index === currentStep) {
        step.classList.add("active")
        step.classList.remove("completed")
        if (circle) {
          circle.classList.remove("bg-gray-200", "text-gray-500")
          circle.classList.add("bg-primary-600", "text-white")
          circle.innerHTML = `<span>${index + 1}</span>`
        }
      } else {
        step.classList.remove("active", "completed")
        if (circle) {
          circle.classList.remove("bg-primary-600", "text-white")
          circle.classList.add("bg-gray-200", "text-gray-500")
          circle.innerHTML = `<span>${index + 1}</span>`
        }
      }
    })
    connectors.forEach((connector, index) => {
      if (index < currentStep) {
        connector.classList.remove("bg-gray-200")
        connector.classList.add("bg-primary-600")
      } else {
        connector.classList.remove("bg-primary-600")
        connector.classList.add("bg-gray-200")
      }
    })
    if (stepperPrevBtn) {
      if (currentStep === 0) stepperPrevBtn.classList.add("hidden")
      else stepperPrevBtn.classList.remove("hidden")
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
    if (progressBar) {
      const progress = ((currentStep + 1) / totalSteps) * 100
      progressBar.style.width = `${progress}%`
    }
    if (currentStepSpan) currentStepSpan.textContent = currentStep + 1
  }

  function validateCurrentStep() {
    const currentContent = document.querySelectorAll(".stepper-content")[currentStep]
    if (!currentContent) return false
    const requiredFields = currentContent.querySelectorAll("[required]")
    for (const field of requiredFields) {
      if (field.type === "radio") {
        const radioGroup = currentContent.querySelectorAll(`[name="${field.name}"]`)
        const isChecked = Array.from(radioGroup).some((radio) => radio.checked)
        if (!isChecked) {
          showNotification(
            `Por favor, seleccione una opción para: ${field.dataset.label || field.name.replace(/_/g, " ")}`,
            "error",
          )
          return false
        }
      } else if (field.type === "checkbox") {
        if (!field.checked) {
          showNotification("Debe aceptar los términos y condiciones", "error")
          return false
        }
      } else if (!field.value.trim()) {
        showNotification(
          `Por favor, complete el campo: ${field.dataset.label || field.name.replace(/_/g, " ")}`,
          "error",
        )
        return false
      }
    }
    if (currentStep === 0) {
      const fechaNac = document.getElementById("fechaNacimiento").value
      if (fechaNac) {
        const fechaNacimiento = new Date(fechaNac)
        const hoy = new Date()
        let edad = hoy.getFullYear() - fechaNacimiento.getFullYear()
        const m = hoy.getMonth() - fechaNacimiento.getMonth()
        if (m < 0 || (m === 0 && hoy.getDate() < fechaNacimiento.getDate())) edad--
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
    if (currentStep === 3) {
      const tipoVisa = document.getElementById("motivoViaje").value
      const docs = documentosPorVisa[tipoVisa] || []
      for (const doc of docs) {
        const estadoSelect = document.getElementById(`${doc.name}_estado`)
        if (!estadoSelect || !estadoSelect.value) {
          showNotification(`Debe seleccionar un estado para: ${doc.label}`, "error")
          return false
        }
        if (estadoSelect.value === "Disponible") {
          const fileIsSelected = filesToUploadGlobally[doc.name]
          const urlAlreadyExists =
            fileUrlsFromUpload[doc.name] ||
            (document.getElementById(doc.name) && document.getElementById(doc.name).value)
          if (!fileIsSelected && !urlAlreadyExists) {
            showNotification(
              `Debe seleccionar un archivo para: ${doc.label} (ya que está marcado como Disponible)`,
              "error",
            )
            return false
          }
        }
      }
    }
    return true
  }

  function mostrarSpinner(mostrar) {
    if (mostrar) {
      loadingSpinner.classList.remove("hidden")
      asesoriasContainer.classList.add("hidden")
    } else {
      loadingSpinner.classList.add("hidden")
      asesoriasContainer.classList.remove("hidden")
    }
  }

  const inputsConfig = [
    { id: "numeroDocumento", type: "numberOnly" },
    { id: "propositoPrincipal", type: "textOnly" },
    { id: "propositoDetallado", type: "textOnly" },
    { id: "relacionFamiliares", type: "textOnly" },
    { id: "tiempoEstadiaCantidad", type: "numberOnly" },
    { id: "nombreCompleto", type: "alphaSpaceOnly" },
    { id: "ingresosMensuales", type: "currency" },
    { id: "relacionAcompanaFamiliar", type: "textOnly" },
    { id: "trabajoActual", type: "textOnly" },
    { id: "numeroPasaporte", type: "alphaNumericOnly" },
    { id: "motivoNoTrabajo", type: "textOnly" },
    { id: "trabajoActualExtranjero", type: "textOnly" },
    { id: "descripcionNegociosActuales", type: "textOnly" },
  ]

  inputsConfig.forEach((config) => {
    const inputElement = document.getElementById(config.id)
    if (inputElement) {
      if (config.type === "numberOnly") {
        inputElement.addEventListener("keydown", (e) => {
          if (
            !(
              (e.keyCode >= 48 && e.keyCode <= 57) ||
              (e.keyCode >= 96 && e.keyCode <= 105) ||
              [8, 9, 13, 27, 35, 36, 37, 39, 46].includes(e.keyCode) ||
              (e.ctrlKey && [65, 67, 86, 88].includes(e.keyCode))
            )
          )
            e.preventDefault()
        })
        inputElement.addEventListener("paste", (e) => {
          if (!/^\d+$/.test((e.clipboardData || window.clipboardData).getData("text"))) e.preventDefault()
        })
        inputElement.addEventListener("input", function () {
          this.value = this.value.replace(/\D/g, "")
        })
      } else if (config.type === "textOnly") {
        inputElement.addEventListener("input", function () {
          this.value = this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñüÜ\s.,;:¡!¿?()"'-]/g, "")
        })
      } else if (config.type === "alphaSpaceOnly") {
        inputElement.addEventListener("input", function () {
          this.value = this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñüÜ\s]/g, "")
        })
      } else if (config.type === "alphaNumericOnly") {
        inputElement.addEventListener("input", function () {
          this.value = this.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñüÜ0-9]/g, "")
        })
      } else if (config.type === "currency") {
        inputElement.addEventListener("input", function () {
          let valor = this.value.replace(/\D/g, "")
          valor = valor.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
          this.value = valor
        })
        inputElement.addEventListener("keydown", (e) => {
          if (
            !(
              (e.keyCode >= 48 && e.keyCode <= 57) ||
              (e.keyCode >= 96 && e.keyCode <= 105) ||
              [8, 9, 13, 27, 46].includes(e.keyCode) ||
              (e.ctrlKey && [65, 67, 86, 88].includes(e.keyCode)) ||
              (e.keyCode >= 35 && e.keyCode <= 39)
            )
          )
            e.preventDefault()
        })
        inputElement.addEventListener("paste", (e) => {
          if (!/^\d+$/.test((e.clipboardData || window.clipboardData).getData("text").replace(/\./g, "")))
            e.preventDefault()
        })
      }
    }
  })

  resetStepper()

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

  function renderDocumentosPorVisa(tipoVisa) {
    const contenedor = document.getElementById("documentosDinamicos")
    contenedor.innerHTML = ""
    if (!tipoVisa || !documentosPorVisa[tipoVisa]) {
      contenedor.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500"><svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><h3 class="text-lg font-medium text-gray-900 mb-2">Seleccione un motivo de viaje</h3><p class="text-sm">Vaya al Paso 1 y seleccione un motivo de viaje para ver los documentos requeridos</p></div>`
      return
    }
    const documentos = documentosPorVisa[tipoVisa]
    documentosContador.textContent = `${documentos.length} documento${documentos.length !== 1 ? "s" : ""}`
    for (let i = 0; i < documentos.length; i += 2) {
      const fila = document.createElement("div")
      fila.className = "grid grid-cols-1 lg:grid-cols-2 gap-4"
      fila.appendChild(crearElementoDocumentoSimplificado(documentos[i], i))
      if (i + 1 < documentos.length) fila.appendChild(crearElementoDocumentoSimplificado(documentos[i + 1], i + 1))
      contenedor.appendChild(fila)
    }
  }

  function crearElementoDocumentoSimplificado(doc, index) {
    const docId = doc.name
    const isRequired = doc.required
    const bloque = document.createElement("div")
    bloque.className =
      "p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-sm"
    bloque.setAttribute("data-doc-id", docId)

    bloque.innerHTML = `
    <div class="space-y-3">
      <div class="flex items-start justify-between">
        <div class="flex items-start space-x-3 flex-1">
          <span class="w-6 h-6 rounded-full bg-primary-100 text-primary-600 text-xs font-bold flex items-center justify-center mt-0.5 flex-shrink-0">${index + 1}</span>
          <div class="flex-1 min-w-0">
            <label class="block text-sm font-medium text-gray-800 leading-tight mb-1">${doc.label}</label>
            <span class="text-xs text-gray-500 flex items-center">
              <span class="${isRequired ? "text-red-500" : "text-blue-500"} mr-1 font-medium">*</span>
              ${isRequired ? "Requerido" : "Opcional"}
            </span>
          </div>
        </div>
      </div>
      <div class="space-y-3">
        <select name="${docId}_estado" id="${docId}_estado" class="w-full py-2.5 px-3 border border-gray-200 bg-white rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-200">
          <option value="">Seleccione el estado del documento</option>
          <option value="Disponible">Disponible</option>
          <option value="En proceso">En proceso</option>
          <option value="No disponible">No disponible</option>
        </select>
        <div id="${docId}_upload_area" class="hidden">
          <input type="file" name="${docId}_file_input" id="${docId}_file_input" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" class="hidden"/>
          <label for="${docId}_file_input" id="${docId}_drop_area" class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-primary-500 bg-gray-50 hover:bg-primary-50 transition-all duration-200">
            <div id="${docId}_drop_area_content" class="space-y-1 text-center">
              ${originalDropAreaContent}
            </div>
          </label>
          <!-- El span para mensajes de subida se elimina de aquí, ya que el contenido del drop_area_content lo reemplazará -->
        </div>
      </div>
    </div>
  `
    const selectEstado = bloque.querySelector(`#${docId}_estado`)
    const uploadArea = bloque.querySelector(`#${docId}_upload_area`)
    const fileInput = bloque.querySelector(`#${docId}_file_input`)
    const dropAreaLabel = bloque.querySelector(`#${docId}_drop_area`) // El label
    const dropAreaContent = bloque.querySelector(`#${docId}_drop_area_content`) // El div interno

    const triggerErrorAnimation = () => {
      dropAreaLabel.classList.add("border-red-500", "bg-red-50", "animate-shake")
      dropAreaContent.innerHTML = `<p class="text-red-500 font-medium">Archivo inválido o muy grande.</p><p class="text-xs text-red-400">Máx 10MB. Formatos: PDF, JPG, PNG, DOC, DOCX</p>`
      dropAreaContent.classList.remove("space-y-1", "text-center")
      dropAreaContent.classList.add("items-center", "justify-center", "flex", "flex-col")

      setTimeout(() => {
        dropAreaLabel.classList.remove("border-red-500", "bg-red-50", "animate-shake")
        // No restaurar el contenido aquí, se hará si el usuario intenta de nuevo o limpia
      }, 1500) // Duración de la animación + un poco más
    }

    const handleFile = (file) => {
      // Resetear estilos de error/éxito previos
      dropAreaLabel.classList.remove("border-red-500", "bg-red-50", "animate-shake", "border-green-500", "bg-green-50")
      dropAreaLabel.classList.add("border-gray-300", "bg-gray-50")
      dropAreaContent.classList.remove(
        "text-green-600",
        "text-red-600",
        "items-center",
        "justify-center",
        "flex",
        "flex-col",
        "break-all",
      )
      dropAreaContent.classList.add("space-y-1", "text-center")

      if (file) {
        const allowedTypes = [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ]
        if (file.size > 10 * 1024 * 1024 || !allowedTypes.includes(file.type)) {
          showNotification(
            file.size > 10 * 1024 * 1024
              ? "El archivo es demasiado grande. Máximo 10MB."
              : "Tipo de archivo no permitido.",
            "error",
          )
          fileInput.value = null
          delete filesToUploadGlobally[docId]
          triggerErrorAnimation()
          return
        }
        filesToUploadGlobally[docId] = file
        dropAreaContent.innerHTML = `
          <svg class="mx-auto h-10 w-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <p class="text-sm font-medium text-green-700 break-all">${file.name}</p>
          <p class="text-xs text-gray-500">Archivo listo para subir</p>`
        dropAreaContent.classList.remove("space-y-1", "text-center")
        dropAreaContent.classList.add("items-center", "justify-center", "flex", "flex-col", "break-all")
        dropAreaLabel.classList.add("border-green-500", "bg-green-50")
      } else {
        delete filesToUploadGlobally[docId]
        dropAreaContent.innerHTML = originalDropAreaContent // Restaurar contenido original
        dropAreaContent.classList.remove(
          "items-center",
          "justify-center",
          "flex",
          "flex-col",
          "text-green-600",
          "break-all",
        )
        dropAreaContent.classList.add("space-y-1", "text-center")
        dropAreaLabel.classList.remove("border-green-500", "bg-green-50")
      }
    }

    selectEstado.addEventListener("change", function () {
      if (this.value === "Disponible") {
        uploadArea.classList.remove("hidden")
      } else {
        uploadArea.classList.add("hidden")
        if (filesToUploadGlobally[docId]) {
          delete filesToUploadGlobally[docId]
          fileInput.value = null
          handleFile(null) // Para resetear la UI del drop area
        }
      }
    })

    fileInput.addEventListener("change", (event) => {
      handleFile(event.target.files && event.target.files[0] ? event.target.files[0] : null)
    })

    if (dropAreaLabel) {
      ;["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        dropAreaLabel.addEventListener(eventName, preventDefaults, false)
        document.body.addEventListener(eventName, preventDefaults, false)
      })
      ;["dragenter", "dragover"].forEach((eventName) => {
        dropAreaLabel.addEventListener(
          eventName,
          () => {
            if (
              !dropAreaLabel.classList.contains("border-red-500") &&
              !dropAreaLabel.classList.contains("border-green-500")
            ) {
              dropAreaLabel.classList.add("border-primary-500", "bg-primary-50")
            }
          },
          false,
        )
      })
      ;["dragleave", "drop"].forEach((eventName) => {
        dropAreaLabel.addEventListener(
          eventName,
          () => {
            if (
              !dropAreaLabel.classList.contains("border-red-500") &&
              !dropAreaLabel.classList.contains("border-green-500")
            ) {
              dropAreaLabel.classList.remove("border-primary-500", "bg-primary-50")
            }
          },
          false,
        )
      })

      dropAreaLabel.addEventListener(
        "drop",
        (e) => {
          const dt = e.dataTransfer
          const files = dt.files
          if (files && files.length > 0) {
            fileInput.files = files
            handleFile(files[0])
          }
        },
        false,
      )
    }
    return bloque
  }

  function preventDefaults(e) {
    e.preventDefault()
    e.stopPropagation()
  }

  const motivoViajeSelect = document.getElementById("motivoViaje")
  if (motivoViajeSelect) {
    motivoViajeSelect.addEventListener("change", function () {
      renderDocumentosPorVisa(this.value)
    })
    if (motivoViajeSelect.value) renderDocumentosPorVisa(motivoViajeSelect.value)
  }

  async function uploadSingleFileToCloudinary(docId, file) {
    const form = document.getElementById("formularioElegibilidad")
    const codigoAsesoriaElement = form.querySelector('[name="codigo_asesoria"]')
    const idSolicitante = form.dataset.idSolicitante || "unknown_sol"
    const idAsesoria = codigoAsesoriaElement ? codigoAsesoriaElement.value : "unknown_ase"
    const idUsuarioElement = document.getElementById("id_usuario")
    const currentUserId = idUsuarioElement ? idUsuarioElement.value : null

    if (!currentUserId) {
      showNotification("Error: ID de usuario no encontrado. No se puede construir la ruta de Cloudinary.", "error")
      throw new Error("User ID not found for Cloudinary path")
    }

    const timestamp = Date.now()
    const baseFileName = `${docId}_${idSolicitante}_${idAsesoria}_${timestamp}`
    const cloudinaryFolder = `doc_users/doc_${currentUserId}`

    const formDataCloud = new FormData()
    formDataCloud.append("file", file)
    formDataCloud.append("upload_preset", "ml_default")
    formDataCloud.append("folder", cloudinaryFolder)
    formDataCloud.append("public_id", baseFileName)

    const dropAreaContent = document.getElementById(`${docId}_drop_area_content`)

    if (dropAreaContent) {
      dropAreaContent.innerHTML = `
        <div class="flex items-center justify-center text-blue-600">
            <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p class="text-sm font-medium break-all">Subiendo ${file.name}...</p>
        </div>`
      dropAreaContent.classList.remove("space-y-1", "text-center")
      dropAreaContent.classList.add("items-center", "justify-center", "flex", "flex-col")
    }

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/de7443iby/auto/upload", {
        method: "POST",
        body: formDataCloud,
      })
      const data = await res.json()

      if (data.secure_url) {
        if (dropAreaContent) {
          dropAreaContent.innerHTML = `
            <svg class="mx-auto h-10 w-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            <p class="text-sm font-medium text-green-700 break-all">${file.name} subido.</p>
            <p class="text-xs text-gray-500">¡Listo!</p>`
        }
        return { docId, url: data.secure_url }
      } else {
        if (dropAreaContent) {
          dropAreaContent.innerHTML = `
            <svg class="mx-auto h-10 w-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <p class="text-sm font-medium text-red-700 break-all">Error al subir ${file.name}.</p>
            <p class="text-xs text-red-500">${data.error ? data.error.message : "Intente de nuevo"}</p>`
        }
        console.error("Cloudinary upload error for", docId, data)
        throw new Error(
          `Error al subir ${docId}: ${data.error ? data.error.message : "Error desconocido de Cloudinary"}`,
        )
      }
    } catch (error) {
      if (dropAreaContent) {
        dropAreaContent.innerHTML = `
            <svg class="mx-auto h-10 w-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <p class="text-sm font-medium text-red-700 break-all">Error de conexión al subir.</p>
            <p class="text-xs text-red-500">Verifique su conexión e intente de nuevo.</p>`
      }
      console.error("Network error during Cloudinary upload for", docId, error)
      throw new Error(`Error de red al subir ${docId}: ${error.message}`)
    }
  }

  async function enviarFormulario(e) {
    e.preventDefault()
    if (!validateCurrentStep()) return

    const submitButton = stepperSubmitBtn
    const originalButtonContent = submitButton.innerHTML
    submitButton.disabled = true
    submitButton.innerHTML = `<div class="relative flex items-center justify-center"><div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div><span>Procesando...</span></div>`

    try {
      const uploadPromises = []
      for (const docId in filesToUploadGlobally) {
        if (filesToUploadGlobally.hasOwnProperty(docId)) {
          const file = filesToUploadGlobally[docId]
          const estadoSelect = document.getElementById(`${docId}_estado`)
          if (estadoSelect && estadoSelect.value === "Disponible" && file) {
            // Solo añadir a promesas si no tiene ya una URL (evitar resubir)
            if (
              !fileUrlsFromUpload[docId] &&
              !(document.getElementById(docId) && document.getElementById(docId).value)
            ) {
              uploadPromises.push(uploadSingleFileToCloudinary(docId, file))
            }
          }
        }
      }

      if (uploadPromises.length > 0) {
        submitButton.innerHTML = `<div class="relative flex items-center justify-center"><div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div><span>Subiendo documentos... (${uploadPromises.length})</span></div>`
        const uploadResults = await Promise.all(uploadPromises)
        uploadResults.forEach((result) => {
          if (result && result.url) {
            fileUrlsFromUpload[result.docId] = result.url
            let urlInput = document.getElementById(result.docId)
            if (!urlInput) {
              urlInput = document.createElement("input")
              urlInput.type = "hidden"
              urlInput.name = result.docId
              urlInput.id = result.docId
              formularioElegibilidad.appendChild(urlInput)
            }
            urlInput.value = result.url
          }
        })
      }

      submitButton.innerHTML = `<div class="relative flex items-center justify-center"><div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div><span>Enviando formulario...</span></div>`

      const formData = new FormData(formularioElegibilidad)
      const datos = {}
      for (const [key, value] of formData.entries()) {
        if (!key.endsWith("_file_input")) {
          datos[key] = value
        }
      }

      if (datos.terminos === "on") datos.terminos = 1
      else if (!datos.terminos) datos.terminos = 0
      if (datos.privacidad === "on") datos.privacidad = 1
      else if (!datos.privacidad) datos.privacidad = 0

      datos.codigo_asesoria = Number.parseInt(datos.codigo_asesoria)
      if (datos.tiempo_estadia_cantidad && datos.tiempo_estadia_unidad) {
        datos.tiempo_estadia = `${datos.tiempo_estadia_cantidad} ${datos.tiempo_estadia_unidad}`
        delete datos.tiempo_estadia_cantidad
        delete datos.tiempo_estadia_unidad
      }

      const finalDatos = { ...datos }
      Object.keys(datos).forEach((key) => {
        if (key.endsWith("_estado")) {
          delete finalDatos[key]
        }
      })

      const tipoVisa = document.getElementById("motivoViaje").value
      if (tipoVisa && documentosPorVisa[tipoVisa]) {
        documentosPorVisa[tipoVisa].forEach((doc) => {
          if (!finalDatos.hasOwnProperty(doc.name)) {
            finalDatos[doc.name] = null
          } else if (finalDatos[doc.name] === "" && fileUrlsFromUpload[doc.name]) {
            finalDatos[doc.name] = fileUrlsFromUpload[doc.name]
          } else if (!fileUrlsFromUpload[doc.name] && !finalDatos[doc.name]) {
            finalDatos[doc.name] = null
          }
          const estadoSelect = document.getElementById(`${doc.name}_estado`)
          if (estadoSelect && estadoSelect.value !== "Disponible") {
            finalDatos[doc.name] = null
          }
        })
      }

      console.log("Enviando datos finales:", finalDatos)

      const response = await fetch("/formularios/procesar_elegibilidad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalDatos),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }))
        throw new Error(`Error ${response.status}: ${errorData.message || "Error desconocido del servidor"}`)
      }
      const result = await response.json()

      if (result.success) {
        showStep(totalSteps)
        showNotification("¡Formulario enviado exitosamente! Su información ha sido procesada correctamente.", "success")
        cargarAsesoriasPagadas()
        setTimeout(() => cerrarModalFormulario(), 5000)
      } else {
        showNotification("Error al enviar el formulario: " + (result.message || "Error desconocido."), "error")
      }
    } catch (error) {
      console.error("Error detallado en enviarFormulario:", error)
      showNotification(`Error al procesar el formulario: ${error.message}`, "error")
    } finally {
      submitButton.disabled = false
      submitButton.innerHTML = originalButtonContent
    }
  }
})
