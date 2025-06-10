/**
 * Formulario de Solicitud - JavaScript
 * Diseño actualizado con el estilo de asesorías
 */

document.addEventListener("DOMContentLoaded", () => {
  // Elementos del DOM
  const asesoriasContainer = document.getElementById("asesoriasContainer")
  const loadingSpinner = document.getElementById("loadingSpinner")
  const formularioModal = document.getElementById("formularioModal")
  const formularioElegibilidad = document.getElementById("formularioElegibilidad")
  const cerrarModal = document.getElementById("cerrarModal")
  const cancelarFormulario = document.getElementById("cancelarFormulario")

  // Cargar asesorías pagadas al iniciar
  cargarAsesoriasPagadas()

  // Event listeners
  cerrarModal.addEventListener("click", cerrarModalFormulario)
  cancelarFormulario.addEventListener("click", cerrarModalFormulario)
  formularioElegibilidad.addEventListener("submit", enviarFormulario)

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
    // Crear el elemento de notificación
    const notification = document.createElement("div")
    notification.className = `fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 transform transition-all duration-500 translate-x-full max-w-md`

    // Aplicar estilos según el tipo
    if (type === "success") {
      notification.classList.add("bg-green-100", "text-green-800", "border-l-4", "border-green-500")
    } else if (type === "error") {
      notification.classList.add("bg-red-100", "text-red-800", "border-l-4", "border-red-500")
    } else if (type === "warning") {
      notification.classList.add("bg-yellow-100", "text-yellow-800", "border-l-4", "border-yellow-500")
    } else {
      notification.classList.add("bg-blue-100", "text-blue-800", "border-l-4", "border-blue-500")
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

    asesorias.forEach((asesoria, index) => {
      const card = crearCardAsesoria(asesoria, index)
      asesoriasContainer.appendChild(card)
    })
  }

  /**
   * Crear una card para una asesoría con el nuevo diseño
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
          <!-- Header de la card -->
          <div class="flex justify-between items-start mb-6">
              <div>
                  <h3 class="text-xl font-bold text-gray-900 font-roboto">
                      Asesoría #${asesoria.codigo_asesoria}
                  </h3>
                  <p class="text-sm text-primary-600 font-medium">${asesoria.tipo_asesoria}</p>
              </div>
              <span class="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  ${asesoria.estado}
              </span>
          </div>

          <!-- Información de la asesoría -->
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

          <!-- Estado del formulario -->
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

          <!-- Descripción -->
          ${
            asesoria.descripcion
              ? `
              <div class="mb-6 p-4 bg-primary-50 rounded-xl border border-primary-100">
                  <p class="text-sm text-gray-700 leading-relaxed">${asesoria.descripcion}</p>
              </div>
          `
              : ""
          }

          <!-- Botón de acción -->
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
   * Abrir modal del formulario de elegibilidad con animación
   */
  window.abrirFormularioElegibilidad = (codigoAsesoria) => {
    document.getElementById("codigoAsesoria").value = codigoAsesoria
    formularioModal.classList.remove("hidden")
    formularioModal.classList.add("flex")
    document.body.style.overflow = "hidden"

    // Animar la entrada del modal
    const modalContent = formularioModal.querySelector(".bg-white")
    if (modalContent) {
      modalContent.classList.add("animate-scale-in")
    }
  }

  /**
   * Cerrar modal del formulario con animación
   */
  function cerrarModalFormulario() {
    const modalContent = formularioModal.querySelector(".bg-white")

    // Animar la salida
    if (modalContent) {
      modalContent.classList.add("opacity-0", "scale-95", "transition-all", "duration-300")
    }

    setTimeout(() => {
      formularioModal.classList.remove("flex")
      formularioModal.classList.add("hidden")
      document.body.style.overflow = "auto"
      formularioElegibilidad.reset()

      // Ocultar campo de relación familiar
      document.getElementById("relacionFamiliaresDiv").classList.add("hidden")
      document.getElementById("relacionFamiliares").required = false

      // Restaurar el modal para la próxima vez
      if (modalContent) {
        modalContent.classList.remove("opacity-0", "scale-95", "transition-all", "duration-300")
      }
    }, 300)
  }

  // Modificar la función enviarFormulario para depurar el error 500
  async function enviarFormulario(e) {
    e.preventDefault()

    const submitButton = document.getElementById("enviarFormulario")
    const originalContent = submitButton.innerHTML

    try {
      // Mostrar indicador de carga
      submitButton.disabled = true
      submitButton.innerHTML = `
        <span class="absolute right-0 -mt-12 h-32 w-8 opacity-20 transform rotate-12 transition-all duration-1000 translate-x-12 bg-white group-hover:-translate-x-40"></span>
        <div class="relative flex items-center justify-center">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
            <span>Enviando...</span>
        </div>
      `

      // Recopilar datos del formulario
      const formData = new FormData(formularioElegibilidad)
      const datos = Object.fromEntries(formData.entries())

      // Validar campos requeridos
      if (!validarFormulario(datos)) {
        submitButton.disabled = false
        submitButton.innerHTML = originalContent
        return
      }

      // Convertir checkboxes a valores numéricos para la base de datos
      if (datos.terminos === "on") datos.terminos = 1
      if (datos.privacidad === "on") datos.privacidad = 1

      // Asegurar que el código de asesoría sea un número
      datos.codigo_asesoria = Number.parseInt(datos.codigo_asesoria)

      console.log("Enviando datos:", datos)

      // Enviar datos al servidor
      const response = await fetch("/formularios/procesar_elegibilidad", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datos),
      })

      // Verificar si la respuesta es un error
      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error del servidor:", response.status, errorText)
        throw new Error(`Error ${response.status}: ${errorText}`)
      }

      const result = await response.json()

      if (result.success) {
        showNotification("¡Formulario enviado exitosamente! Su información ha sido procesada correctamente.", "success")
        cerrarModalFormulario()

        // Recargar asesorías para actualizar el estado
        setTimeout(() => {
          cargarAsesoriasPagadas()
        }, 1000)
      } else {
        showNotification("Error al enviar el formulario: " + result.message, "error")
      }
    } catch (error) {
      console.error("Error detallado:", error)
      showNotification(`Error al enviar el formulario: ${error.message}`, "error")
    } finally {
      // Restaurar botón
      submitButton.disabled = false
      submitButton.innerHTML = originalContent
    }
  }

  /**
   * Validar formulario antes del envío
   */
  function validarFormulario(datos) {
    const camposRequeridos = [
      "motivo_viaje",
      "numero_documento",
      "tipo_documento",
      "pais_residencia",
      "provincia_destino",
      "estado_civil",
      "familiares_canada",
      "co_deudor",
      "viajes_recientes",
      "acompanante_conocido",
      "antecedente_judiciales",
      "examenes_medicos",
      "aplicacion_familiares",
      "acceso_aplicacion",
      "biometricos_canada",
      "pago_tasas",
      "fecha_nacimiento",
      "proposito_principal",
      "empleo_origen",
      "dependencia_economica",
      "acompana_familiar",
    ]

    for (const campo of camposRequeridos) {
      if (!datos[campo] || datos[campo].trim() === "") {
        showNotification(`El campo ${campo.replace("_", " ")} es requerido`, "error")
        return false
      }
    }

    // Validar que se aceptaron términos y privacidad
    if (!datos.terminos) {
      showNotification("Debe aceptar los términos y condiciones", "error")
      return false
    }

    if (!datos.privacidad) {
      showNotification("Debe aceptar la política de privacidad", "error")
      return false
    }

    // Validar relación familiar si tiene familiares en Canadá
    if (
      datos.familiares_canada === "Si" &&
      (!datos.relacion_familiares_can || datos.relacion_familiares_can.trim() === "")
    ) {
      showNotification("Debe especificar la relación con familiares en Canadá", "error")
      return false
    }

    // Validar fecha de nacimiento
    if (datos.fecha_nacimiento) {
      const fechaNac = new Date(datos.fecha_nacimiento)
      const hoy = new Date()
      const edad = hoy.getFullYear() - fechaNac.getFullYear()

      if (edad < 18) {
        showNotification("Debe ser mayor de 18 años para aplicar", "error")
        return false
      }

      if (edad > 100) {
        showNotification("Por favor verifique la fecha de nacimiento", "error")
        return false
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

  // Agregar animaciones CSS personalizadas
  const style = document.createElement("style")
  style.textContent = `
    @keyframes fade-in {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes scale-in {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .animate-fade-in {
      animation: fade-in 0.6s ease-out forwards;
    }

    .animate-scale-in {
      animation: scale-in 0.3s ease-out forwards;
    }

    .delay-100 {
      animation-delay: 100ms;
    }

    .delay-200 {
      animation-delay: 200ms;
    }

    .delay-300 {
      animation-delay: 300ms;
    }

    .delay-400 {
      animation-delay: 400ms;
    }

    .delay-500 {
      animation-delay: 500ms;
    }

    .delay-600 {
      animation-delay: 600ms;
    }
  `
  document.head.appendChild(style)
})
