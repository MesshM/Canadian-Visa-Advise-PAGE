# utils/stripe_utils.py

import stripe
from config import STRIPE_SECRET_KEY

# Configurar la clave secreta de Stripe
stripe.api_key = STRIPE_SECRET_KEY

def create_payment_intent(amount, currency="usd"):
    """
    Crea un PaymentIntent en Stripe.
    """
    try:
        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency
        )
        return payment_intent
    except stripe.error.StripeError as e:
        print(f"Error al crear PaymentIntent: {e}")
        return None