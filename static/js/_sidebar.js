document.addEventListener("DOMContentLoaded", () => {
  const currentPath = window.location.pathname

  // Marcar el enlace activo basado en la URL actual
  document.querySelectorAll("nav a").forEach((link) => {
    const href = link.getAttribute("href")
    if (href === currentPath || (currentPath === "/" && href === "/")) {
      link.classList.remove("text-gray-500", "border-transparent", "hover:text-primary-600", "hover:translate-x-1")
      link.classList.add("text-primary-600", "border-l-3", "border-primary-600", "font-medium", "bg-primary-50")
    }

    // Agregar event listener para cambiar clases al hacer clic
    link.addEventListener("click", () => {
      document.querySelectorAll("nav a").forEach((l) => {
        l.classList.remove("text-primary-600", "border-l-3", "border-primary-600", "font-medium", "bg-primary-50")
        l.classList.add("text-gray-500", "border-transparent", "hover:text-primary-600", "hover:translate-x-1")
      })
      link.classList.remove("text-gray-500", "border-transparent", "hover:text-primary-600", "hover:translate-x-1")
      link.classList.add("text-primary-600", "border-l-3", "border-primary-600", "font-medium", "bg-primary-50")
    })
  })

  // Función para actualizar la imagen de perfil en el sidebar
  function actualizarImagenPerfilEnSidebar(imageUrl = null) {
    // Buscar los elementos en el sidebar
    const sidebarProfileContainer = document.querySelector("aside a[href*='perfil'] .flex.items-center.justify-center")
    const sidebarProfileImage = sidebarProfileContainer.querySelector("img")
    const sidebarProfileInitials = sidebarProfileContainer.querySelector("div.text-xl.font-bold")

    if (imageUrl) {
      // Si hay una URL de imagen, mostrarla y ocultar las iniciales
      if (!sidebarProfileImage) {
        // Si no existe la imagen, crearla
        const newImg = document.createElement("img")
        newImg.alt = "Foto de perfil"
        newImg.className = "w-full h-full object-cover rounded-full"
        // Insertar la imagen antes de las iniciales
        sidebarProfileContainer.insertBefore(newImg, sidebarProfileInitials)
        // Actualizar la referencia
        const sidebarProfileImage = newImg
      }

      // Añadir un parámetro de tiempo para evitar caché
      sidebarProfileImage.src = imageUrl + "?t=" + new Date().getTime()
      sidebarProfileImage.classList.remove("hidden")

      // Ocultar las iniciales
      if (sidebarProfileInitials) {
        sidebarProfileInitials.classList.add("hidden")
      }
    } else {
      // Si no hay imagen, ocultar la imagen y mostrar las iniciales
      if (sidebarProfileImage) {
        sidebarProfileImage.classList.add("hidden")
      }

      // Mostrar las iniciales
      if (sidebarProfileInitials) {
        sidebarProfileInitials.classList.remove("hidden")
      } else {
        // Si no existen las iniciales, crearlas
        const nombreUsuario = document
          .querySelector(".font-medium.text-gray-900.group-hover\\:text-red-500")
          ?.textContent.trim()

        if (nombreUsuario) {
          const nombres = nombreUsuario.split(" ")
          let iniciales = nombres[0][0] // Primera letra del primer nombre

          if (nombres.length > 1) {
            iniciales += nombres[nombres.length - 1][0] // Primera letra del último nombre/apellido
          }

          // Crear el div de iniciales
          const inicialesDiv = document.createElement("div")
          inicialesDiv.className = "text-xl font-bold text-white select-none"
          inicialesDiv.textContent = iniciales
          sidebarProfileContainer.appendChild(inicialesDiv)
        }
      }
    }
  }

  // Función para actualizar las iniciales en el sidebar cuando cambia el nombre del usuario
  function actualizarInicialesSidebar() {
    const sidebarProfileImg = document.querySelector("aside a[href*='perfil'] img")
    const sidebarProfileDiv = document.querySelector("aside a[href*='perfil'] .flex.items-center.justify-center")

    if (sidebarProfileDiv) {
      if (!sidebarProfileImg || sidebarProfileImg.classList.contains("hidden")) {
        // No hay imagen de perfil, actualizar las iniciales
        const nombreUsuario = document
          .querySelector(".font-medium.text-gray-900.group-hover\\:text-red-500")
          ?.textContent.trim()

        if (nombreUsuario) {
          const nombres = nombreUsuario.split(" ")
          let iniciales = nombres[0][0] // Primera letra del primer nombre

          if (nombres.length > 1) {
            iniciales += nombres[nombres.length - 1][0] // Primera letra del último nombre/apellido
          }

          // Buscar o crear el div de iniciales
          let inicialesDiv = sidebarProfileDiv.querySelector("div.text-xl.font-bold")
          if (!inicialesDiv) {
            // Si no existe el div de iniciales, eliminar el SVG y crear el div
            const svg = sidebarProfileDiv.querySelector("svg")
            if (svg) svg.remove()

            inicialesDiv = document.createElement("div")
            inicialesDiv.className = "text-xl font-bold text-white select-none"
            sidebarProfileDiv.appendChild(inicialesDiv)
          }

          // Actualizar el contenido de las iniciales
          inicialesDiv.textContent = iniciales
        }
      }
    }
  }

  // Actualizar iniciales en el sidebar
  actualizarInicialesSidebar()

  // Exponer la función globalmente para que pueda ser llamada desde otros scripts
  window.actualizarInicialesSidebar = actualizarInicialesSidebar
  window.actualizarImagenPerfilEnSidebar = actualizarImagenPerfilEnSidebar
})
