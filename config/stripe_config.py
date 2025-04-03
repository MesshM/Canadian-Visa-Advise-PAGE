import os
import stripe

# Configurar Stripe con la clave secreta del .env
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')


# Definir precios por tipo de visa
PRECIOS_VISA = {
    'Visa de Trabajo': 150.00,
    'Visa de Estudio': 100.00,
    'Residencia Permanente': 200.00,
    'Ciudadanía': 250.00,
    'Otro': 150.00
}

