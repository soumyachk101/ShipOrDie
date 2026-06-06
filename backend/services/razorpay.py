import logging
import uuid
import hmac
import hashlib
from datetime import datetime, timedelta
from backend.config import settings

logger = logging.getLogger(__name__)

class RazorpayService:
    def __init__(self):
        self.key_id = settings.RAZORPAY_KEY_ID
        self.key_secret = settings.RAZORPAY_KEY_SECRET

    async def create_checkout_session(self, user_id: str, plan_name: str) -> dict:
        """
        Creates a payment checkout request.
        For development/testing, returns a simulated success checkout URL.
        """
        logger.info(f"Creating Razorpay subscription checkout for user {user_id}, plan {plan_name}...")
        
        simulated_sub_id = f"sub_sim_{uuid.uuid4().hex[:12]}"
        
        # We return simulated checkout parameters
        return {
            "checkout_url": f"http://localhost:3000/dashboard/billing?status=success&sub_id={simulated_sub_id}&plan={plan_name}",
            "subscription_id": simulated_sub_id,
            "razorpay_key_id": self.key_id or "rzp_test_placeholder"
        }

    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """Verifies webhook signatures received from Razorpay."""
        webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET
        if not webhook_secret or webhook_secret == "rzp_webhook_secret_placeholder":
            logger.info("Webhook secret placeholder detected. Auto-verifying signature for testing.")
            return True
            
        try:
            expected_signature = hmac.new(
                webhook_secret.encode('utf-8'),
                payload,
                hashlib.sha256
            ).hexdigest()
            return hmac.compare_digest(expected_signature, signature)
        except Exception as e:
            logger.error(f"Failed to verify Razorpay webhook signature: {e}")
            return False

razorpay_service = RazorpayService()
