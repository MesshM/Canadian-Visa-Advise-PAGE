document.addEventListener('DOMContentLoaded', function() {
    const refreshButton = document.getElementById('refreshCaptcha');
    const captchaText = document.getElementById('captchaText');
    const captchaInput = document.getElementById('captcha');
    
    // Función para refrescar el captcha
    function refreshCaptcha() {
        if (captchaText) {
            captchaText.textContent = "Cargando...";
            
            // Cambia esta URL para incluir el prefijo del blueprint
            fetch('/auth/refresh_captcha')  // Cambiado de '/refresh_captcha' a '/auth/refresh_captcha'
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Error en la respuesta del servidor');
                    }
                    return response.json();
                })
                .then(data => {
                    captchaText.textContent = data.captcha_text;
                    // Limpiar el campo de entrada del captcha cuando se refresca
                    if (captchaInput) {
                        captchaInput.value = '';
                        captchaInput.focus();
                    }
                })
                .catch(error => {
                    console.error('Error al cargar el captcha:', error);
                    captchaText.textContent = "Error - Clic para reintentar";
                    captchaText.style.cursor = 'pointer';
                    // Hacer que el texto de error sea clickeable para reintentar
                    captchaText.addEventListener('click', refreshCaptcha, { once: true });
                });
        }
    }
    
    if (refreshButton) {
        refreshButton.addEventListener('click', refreshCaptcha);
    }
    
    // También refrescar el captcha cuando hay un error en el formulario
    const errorMessages = document.querySelectorAll('.error');
    if (errorMessages.length > 0 && captchaText) {
        refreshCaptcha();
    }
});