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
  // Función para actualizar el nombre de usuario en el sidebar
  function actualizarNombreUsuarioEnSidebar(nombreCompleto) {
    // Buscar el elemento que muestra el nombre de usuario en el sidebar
    const nombreUsuarioElement = document.querySelector(".font-medium.text-gray-900.group-hover\\:text-red-500")

    if (nombreUsuarioElement) {
      // Actualizar el texto con el nuevo nombre
      nombreUsuarioElement.textContent = nombreCompleto

      // Actualizar también las iniciales si están visibles
      actualizarInicialesSidebar()
    }
  }
  window.actualizarNombreUsuarioEnSidebar = actualizarNombreUsuarioEnSidebar
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

  // Agregar botón de cerrar sesión al sidebar
  const nav = document.querySelector("aside nav")
  if (nav) {
    // Verificar si ya existe un botón de logout para evitar duplicados
    if (!document.querySelector("a[href='/logout']")) {
      // Crear el elemento de separador
      const separator = document.createElement("div")
      separator.className = "border-t border-gray-200 my-4"
      nav.appendChild(separator)
      
      // Crear el enlace de logout
      const logoutLink = document.createElement("a")
      logoutLink.href = "/logout"
      logoutLink.className = "flex items-center px-4 py-3 text-gray-500 border-l-3 border-transparent hover:text-primary-600 hover:translate-x-1 transition-all duration-200 group"
      
      // Crear el contenido del enlace
      const linkContent = document.createElement("div")
      linkContent.className = "flex items-center"
      
      // Crear el icono de logout
      const iconContainer = document.createElement("div")
      iconContainer.className = "mr-3 flex items-center justify-center w-6 h-6 text-gray-400 group-hover:text-primary-600"
      iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-log-out"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`
      
      // Crear el texto del enlace
      const linkText = document.createElement("span")
      linkText.className = "font-medium"
      linkText.textContent = "Cerrar Sesión"
      
      // Ensamblar todo
      linkContent.appendChild(iconContainer)
      linkContent.appendChild(linkText)
      logoutLink.appendChild(linkContent)
      nav.appendChild(logoutLink)
      
      // Agregar el mismo event listener que tienen los otros enlaces
      logoutLink.addEventListener("click", () => {
        document.querySelectorAll("nav a").forEach((l) => {
          l.classList.remove("text-primary-600", "border-l-3", "border-primary-600", "font-medium", "bg-primary-50")
          l.classList.add("text-gray-500", "border-transparent", "hover:text-primary-600", "hover:translate-x-1")
        })
        logoutLink.classList.remove("text-gray-500", "border-transparent", "hover:text-primary-600", "hover:translate-x-1")
        logoutLink.classList.add("text-primary-600", "border-l-3", "border-primary-600", "font-medium", "bg-primary-50")
      })
    }
  }
})