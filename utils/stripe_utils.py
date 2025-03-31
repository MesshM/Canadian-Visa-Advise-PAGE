import stripe
import os

# Initialize Stripe with API key
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

def create_payment_intent(amount, metadata=None, receipt_email=None, description=None):
    """
    Create a Stripe PaymentIntent
    
    Args:
        amount (float): Amount in dollars (will be converted to cents)
        metadata (dict): Additional metadata for the payment
        receipt_email (str): Email to send receipt to
        description (str): Description of the payment
        
    Returns:
        dict: PaymentIntent object
    """
    try:
        # Convert amount to cents
        amount_cents = int(float(amount) * 100)
        
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency='usd',
            metadata=metadata or {},
            receipt_email=receipt_email,
            description=description,
            payment_method_types=['card']
        )
        
        return {
            'clientSecret': intent.client_secret,
            'id': intent.id
        }
    except stripe.error.StripeError as e:
        # Handle Stripe-specific errors
        return {'error': str(e)}
    except Exception as e:
        # Handle other errors
        return {'error': f'Error creating payment intent: {str(e)}'}

def retrieve_payment_intent(payment_intent_id):
    """
    Retrieve a Stripe PaymentIntent by ID
    
    Args:
        payment_intent_id (str): The ID of the PaymentIntent to retrieve
        
    Returns:
        object: The PaymentIntent object
    """
    try:
        return stripe.PaymentIntent.retrieve(payment_intent_id)
    except stripe.error.StripeError as e:
        # Handle Stripe-specific errors
        return {'error': str(e)}
    except Exception as e:
        # Handle other errors
        return {'error': f'Error retrieving payment intent: {str(e)}'}