/**
 * Maps Stripe error codes to user-friendly error messages
 */

export interface StripeErrorDetail {
  message: string;
  suggestion?: string;
}

export const STRIPE_ERROR_MESSAGES: Record<string, StripeErrorDetail> = {
  card_declined: {
    message: "Your card was declined.",
    suggestion: "Please check your card details or try a different card.",
  },
  expired_card: {
    message: "Your card has expired.",
    suggestion: "Please use a valid card or update your payment method.",
  },
  incorrect_cvc: {
    message: "The CVC code you entered is invalid.",
    suggestion: "Please check the 3-4 digit security code on the back of your card.",
  },
  insufficient_funds: {
    message: "Your card doesn't have enough funds.",
    suggestion: "Please check your account balance or use a different payment method.",
  },
  lost_card: {
    message: "Your card has been reported as lost.",
    suggestion: "Please use a different card.",
  },
  stolen_card: {
    message: "Your card has been reported as stolen.",
    suggestion: "Please use a different card.",
  },
  processing_error: {
    message: "There was a temporary processing error.",
    suggestion: "Please try again in a few moments.",
  },
  authentication_error: {
    message: "Authentication failed.",
    suggestion: "Please check your card details and try again.",
  },
  rate_limit: {
    message: "Too many requests. Please try again later.",
    suggestion: "Wait a moment and try your payment again.",
  },
  api_connection_error: {
    message: "Connection error. Please check your internet and try again.",
    suggestion: "Ensure you have a stable internet connection.",
  },
  api_error: {
    message: "There was a technical error processing your payment.",
    suggestion: "Please try again or contact support.",
  },
  authentication_required: {
    message: "Additional authentication is required.",
    suggestion: "Your bank may require you to verify this transaction. Please check your email or messages.",
  },
  stripe_3d_secure_required: {
    message: "Your card requires additional verification.",
    suggestion: "Please complete the verification process when prompted.",
  },
};

/**
 * Get a user-friendly error message from a Stripe error code
 */
export function getStripeErrorMessage(errorCode: string): StripeErrorDetail {
  return (
    STRIPE_ERROR_MESSAGES[errorCode] || {
      message: "Payment failed. Please try again.",
      suggestion: "If the problem persists, please contact support.",
    }
  );
}

/**
 * Extract and format Stripe error details from the error object
 */
export function parseStripeError(error: any): StripeErrorDetail {
  const errorCode = error?.code || error?.type || "api_error";
  return getStripeErrorMessage(errorCode);
}
