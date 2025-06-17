import stripe
from dotenv import load_dotenv
import os

# Cargar variables del entorno desde .env
load_dotenv()

# Configurar Stripe con la clave secreta (para backend)
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

# Guardar la clave pública (para pasarla al frontend si se necesita)
STRIPE_PUBLISHABLE_KEY = os.getenv('STRIPE_PUBLIC_KEY')

# Diccionario de precios según tipo de visa
PRECIOS_VISA = {
  'Turismo / Visita Familia': 100,
  'Estudios': 100,
  'Trabajo Temporal': 100,
  'Negocios': 100,
  'Residencia Permanente': 100
}

# Función para inyectar la clave pública a las plantillas (Flask context processor)
def inject_stripe_key():
  return {'STRIPE_PUBLIC_KEY': STRIPE_PUBLISHABLE_KEY}
