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
    const nombreUsuarioElement = document.querySelector(".font-medium.text-gray-900.group-hover\\:text-red-500")
    if (nombreUsuarioElement) {
      nombreUsuarioElement.textContent = nombreCompleto
      actualizarInicialesSidebar()
    }
  }
  window.actualizarNombreUsuarioEnSidebar = actualizarNombreUsuarioEnSidebar

  // Función para actualizar la imagen de perfil en el sidebar
  function actualizarImagenPerfilEnSidebar(imageUrl = null) {
    const sidebarProfileContainer = document.querySelector("aside a[href*='perfil'] .flex.items-center.justify-center")
    const sidebarProfileImage = sidebarProfileContainer.querySelector("img")
    const sidebarProfileInitials = sidebarProfileContainer.querySelector("div.text-xl.font-bold")

    if (imageUrl) {
      if (!sidebarProfileImage) {
        const newImg = document.createElement("img")
        newImg.alt = "Foto de perfil"
        newImg.className = "w-full h-full object-cover rounded-full"
        sidebarProfileContainer.insertBefore(newImg, sidebarProfileInitials)
      }
      sidebarProfileContainer.querySelector("img").src = imageUrl + "?t=" + new Date().getTime()
      sidebarProfileContainer.querySelector("img").classList.remove("hidden")
      if (sidebarProfileInitials) sidebarProfileInitials.classList.add("hidden")
    } else {
      if (sidebarProfileImage) sidebarProfileImage.classList.add("hidden")
      if (sidebarProfileInitials) {
        sidebarProfileInitials.classList.remove("hidden")
      } else {
        const nombreUsuario = document
          .querySelector(".font-medium.text-gray-900.group-hover\\:text-red-500")
          ?.textContent.trim()
        if (nombreUsuario) {
          const nombres = nombreUsuario.split(" ")
          let iniciales = nombres[0][0]
          if (nombres.length > 1) {
            iniciales += nombres[nombres.length - 1][0]
          }
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
        const nombreUsuario = document
          .querySelector(".font-medium.text-gray-900.group-hover\\:text-red-500")
          ?.textContent.trim()
        if (nombreUsuario) {
          const nombres = nombreUsuario.split(" ")
          let iniciales = nombres[0][0]
          if (nombres.length > 1) {
            iniciales += nombres[nombres.length - 1][0]
          }
          let inicialesDiv = sidebarProfileDiv.querySelector("div.text-xl.font-bold")
          if (!inicialesDiv) {
            const svg = sidebarProfileDiv.querySelector("svg")
            if (svg) svg.remove()
            inicialesDiv = document.createElement("div")
            inicialesDiv.className = "text-xl font-bold text-white select-none"
            sidebarProfileDiv.appendChild(inicialesDiv)
          }
          inicialesDiv.textContent = iniciales
        }
      }
    }
  }

  actualizarInicialesSidebar()
  window.actualizarInicialesSidebar = actualizarInicialesSidebar
  window.actualizarImagenPerfilEnSidebar = actualizarImagenPerfilEnSidebar
})