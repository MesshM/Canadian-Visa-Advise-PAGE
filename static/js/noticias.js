//Aca va el codigo js de noticias.js
document.addEventListener("DOMContentLoaded", () => {
  // Tab functionality for news section
  const tabs = document.querySelectorAll("[data-tab]")
  const tabContents = document.querySelectorAll(".tab-content")

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // Remove active class from all tabs
      tabs.forEach((t) => {
        t.classList.remove("border-primary-600", "text-primary-600")
        t.classList.add("border-transparent", "text-gray-600", "hover:text-primary-600", "hover:border-primary-300")
        t.setAttribute("aria-selected", "false")
      })

      // Add active class to clicked tab
      tab.classList.add("border-primary-600", "text-primary-600")
      tab.classList.remove("border-transparent", "text-gray-600", "hover:text-primary-600", "hover:border-primary-300")
      tab.setAttribute("aria-selected", "true")

      // Hide all tab contents
      tabContents.forEach((content) => {
        content.classList.add("hidden")
        content.classList.remove("active")
      })

      // Show the selected tab content with animation
      const tabId = tab.getAttribute("data-tab")
      const activeContent = document.getElementById(`${tabId}-content`)
      activeContent.classList.remove("hidden")
      activeContent.classList.add("active")

      // Add staggered animation to news cards within the active tab
      const newsCards = activeContent.querySelectorAll(".news-card")
      newsCards.forEach((card, index) => {
        card.classList.remove("opacity-100", "translate-y-0") // Ensure they are hidden before animating
        card.classList.add("opacity-0", "translate-y-[30px]")
        setTimeout(() => {
          card.classList.remove("opacity-0", "translate-y-[30px]")
          card.classList.add("opacity-100", "translate-y-0", "transition-all", "duration-500", "ease-out")
        }, 100 * index) // Staggered delay
      })
    })
  })

  // Enhanced smooth animations for scroll
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Apply Tailwind animation classes
        if (entry.target.classList.contains("animate-fade-in-smooth")) {
          entry.target.classList.remove("opacity-0", "translate-y-[30px]")
          entry.target.classList.add("opacity-100", "translate-y-0")
        } else if (entry.target.classList.contains("animate-fade-in-up")) {
          entry.target.classList.remove("opacity-0", "translate-y-[40px]")
          entry.target.classList.add("opacity-100", "translate-y-0")
        } else if (entry.target.classList.contains("animate-slide-in-left")) {
          entry.target.classList.remove("opacity-0", "-translate-x-[30px]")
          entry.target.classList.add("opacity-100", "translate-x-0")
        }

        // Add staggered animation for grid items (like news cards)
        if (entry.target.classList.contains("grid")) {
          const children = entry.target.querySelectorAll(".news-card") // Target specific news cards
          Array.from(children).forEach((child, index) => {
            setTimeout(() => {
              child.classList.remove("opacity-0", "translate-y-[30px]", "translate-y-[40px]", "-translate-x-[30px]")
              child.classList.add(
                "opacity-100",
                "translate-y-0",
                "translate-x-0",
                "transition-all",
                "duration-500",
                "ease-out",
              )
            }, index * 150)
          })
        }
        observer.unobserve(entry.target) // Stop observing once animated
      }
    })
  }, observerOptions)

  // Observe all animated elements in the news section
  const animatedElements = document.querySelectorAll(
    ".container.mx-auto.px-4.py-12, .tab-content.active .grid, .tab-content.hidden .grid", // Observe main container and initial active tab grid
  )
  animatedElements.forEach((element) => {
    observer.observe(element)
  })

  // Initial staggered animation for the first active tab's news cards
  const initialActiveTabContent = document.querySelector(".tab-content.active")
  if (initialActiveTabContent) {
    const initialNewsCards = initialActiveTabContent.querySelectorAll(".news-card")
    initialNewsCards.forEach((card, index) => {
      card.classList.add("opacity-0", "translate-y-[30px]") // Ensure initial state for animation
      setTimeout(
        () => {
          card.classList.remove("opacity-0", "translate-y-[30px]")
          card.classList.add("opacity-100", "translate-y-0", "transition-all", "duration-500", "ease-out")
        },
        index * 150 + 600,
      ) // Add a delay after the main section animation
    })
  }
})
