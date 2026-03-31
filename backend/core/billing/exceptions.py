class BillingError(Exception):
    """Base exception for all billing-related errors."""

    def __init__(self, message: str, code: str = "BILLING_ERROR") -> None:
        self.message = message
        self.code = code
        super().__init__(message)


class StripeTransientError(BillingError):
    """Temporary Stripe failure that may succeed on retry."""

    def __init__(self, message: str) -> None:
        super().__init__(message, code="STRIPE_TRANSIENT")


class StripeCardError(BillingError):
    """Card was declined or failed verification."""

    def __init__(self, message: str, decline_code: str | None = None) -> None:
        self.decline_code = decline_code
        super().__init__(message, code="CARD_DECLINED")


class StripeInvalidRequestError(BillingError):
    """Invalid parameters sent to Stripe API."""

    def __init__(self, message: str) -> None:
        super().__init__(message, code="STRIPE_INVALID_REQUEST")


class CustomerNotFoundError(BillingError):
    """No Stripe customer record exists for the given user."""

    def __init__(self, user_id: str) -> None:
        super().__init__(f"No Stripe customer for user {user_id}", code="NO_STRIPE_CUSTOMER")


class SubscriptionNotFoundError(BillingError):
    """No active subscription exists for the given user."""

    def __init__(self, user_id: str) -> None:
        super().__init__(
            f"No active subscription for user {user_id}", code="NO_SUBSCRIPTION"
        )
