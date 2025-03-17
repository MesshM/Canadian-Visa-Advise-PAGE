document.addEventListener('DOMContentLoaded', function() {
    const refreshButton = document.getElementById('refreshCaptcha');
    
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            const captchaText = document.getElementById('captchaText');
            if (captchaText) {
                captchaText.textContent = "Cargando...";
                
                fetch('/refresh_captcha')
                    .then(response => response.json())  // Convertir la respuesta a JSON
                    .then(data => {
                        captchaText.textContent = data.captcha_text;  // Actualizar el texto del captcha
                    })
                    .catch(error => {
                        console.error('Error al cargar el captcha:', error);
                        captchaText.textContent = "Error";
                    });
            }
        });
    }
});