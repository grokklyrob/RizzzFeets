import { loadStripe } from '@stripe/stripe-js';
import { STRIPE_PUBLISHABLE_KEY, CREATE_CHECKOUT_SESSION_URL, CREATE_PORTAL_SESSION_URL, GET_SUBSCRIPTION_STATUS_URL } from '../constants';

// This is a singleton promise to load Stripe.js once.
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

/**
 * A helper function to handle failed backend responses. It tries to parse JSON
 * for a specific error message, and falls back to generic HTTP status info.
 * @param response The fetch Response object.
 * @param defaultMessage A fallback error message.
 * @returns A promise that resolves to an Error object.
 */
const handleBackendError = async (response: Response, defaultMessage: string): Promise<Error> => {
    let errorMessage = defaultMessage;
    try {
        // Try to parse the error response as JSON
        const errorBody = await response.json();
        // If the backend provides a specific error message, use it.
        if (errorBody && errorBody.error) {
            errorMessage = errorBody.error;
        }
    } catch (e) {
        // If the response is not JSON (e.g., a 500 server error with an HTML page),
        // use the HTTP status to give a more informative error.
        console.error("Backend error response was not JSON. Status:", `${response.status} ${response.statusText}`);
        errorMessage = `The server returned an error (${response.status}). Please check your backend function logs for details.`;
    }
    return new Error(errorMessage);
};


/**
 * This function calls your backend (a Google Cloud Function) to create a Stripe Checkout Session.
 * Then, it redirects the user to the Stripe-hosted checkout page.
 * 
 * @param priceId The ID of the Stripe Price the user wants to purchase.
 * @param userEmail The email of the user for pre-filling Stripe checkout.
 */
export const redirectToCheckout = async (priceId: string, userEmail: string) => {
    // Developer-friendly check: Ensure the backend URL has been configured.
    if (CREATE_CHECKOUT_SESSION_URL.includes('your-region-your-project')) {
        const errorMessage = "Stripe Checkout cannot proceed. The backend URL for creating a checkout session is still a placeholder. Please update `CREATE_CHECKOUT_SESSION_URL` in `src/constants.ts` with your deployed Google Cloud Function URL.";
        console.error(errorMessage);
        alert(errorMessage);
        throw new Error("Backend URL not configured.");
    }

    // 1. Call your Google Cloud Function to create a checkout session.
    const response = await fetch(CREATE_CHECKOUT_SESSION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            priceId: priceId,
            // The success and cancel URLs are where Stripe will redirect the user after checkout.
            // We append query parameters to know the status on the client-side.
            successUrl: `${window.location.origin}?checkout_success=true`,
            cancelUrl: `${window.location.origin}?checkout_canceled=true`,
            userEmail: userEmail,
         }),
    });
    
    if (!response.ok) {
        throw await handleBackendError(response, 'Could not create checkout session.');
    }

    const { sessionId } = await response.json();

    // 2. When you have a session ID, redirect to Stripe Checkout.
    const stripe = await stripePromise;
    if (!stripe) {
        throw new Error('Stripe.js has not loaded yet.');
    }
    
    const { error } = await stripe.redirectToCheckout({ sessionId });
    
    // 3. If `redirectToCheckout` fails due to a browser issue (e.g., pop-up blocker),
    // display the localized error message to your customer.
    if (error) {
        console.error('Stripe redirect failed:', error);
        throw new Error(error.message);
    }
};


/**
 * This function calls your backend to create a Stripe Customer Portal session.
 * Then, it redirects the user to the Stripe-hosted portal page.
 * 
 * @param userEmail The email of the user to look up their Stripe customer ID.
 */
export const redirectToBillingPortal = async (userEmail: string) => {
    // Developer-friendly check: Ensure the backend URL has been configured.
    if (CREATE_PORTAL_SESSION_URL.includes('your-region-your-project')) {
        const errorMessage = "Stripe Billing Portal cannot proceed. The backend URL for creating a portal session is a placeholder. Please update `CREATE_PORTAL_SESSION_URL` in `src/constants.ts` with your deployed Google Cloud Function URL.";
        console.error(errorMessage);
        alert(errorMessage);
        throw new Error("Backend URL for portal not configured.");
    }

    // 1. Call your backend to create a portal session.
    const response = await fetch(CREATE_PORTAL_SESSION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            userEmail: userEmail,
            // The return URL is where Stripe will send the user back to after they're done.
            returnUrl: window.location.href,
         }),
    });

    if (!response.ok) {
        throw await handleBackendError(response, 'Could not create billing portal session.');
    }

    const { url } = await response.json();

    // 2. Redirect the user to the portal URL.
    if (url) {
      window.location.href = url;
    } else {
      throw new Error('Billing portal URL not received from server.');
    }
};

/**
 * Calls the backend to get the user's current subscription tier from Stripe.
 * @param userEmail The email of the user to look up.
 * @returns The tier ID ('free', 'basic', 'plus', 'pro') of the user's active subscription.
 */
export const syncSubscriptionStatus = async (userEmail: string): Promise<string> => {
    if (GET_SUBSCRIPTION_STATUS_URL.includes('your-region-your-project')) {
        const errorMessage = "Cannot sync plan. The backend URL for fetching subscription status is a placeholder. Please update `GET_SUBSCRIPTION_STATUS_URL` in `src/constants.ts`.";
        console.error(errorMessage);
        throw new Error("Backend URL for sync not configured.");
    }

    const response = await fetch(GET_SUBSCRIPTION_STATUS_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userEmail }),
    });

    if (!response.ok) {
        throw await handleBackendError(response, 'Could not sync subscription status.');
    }

    const { tierId } = await response.json();
    if (typeof tierId !== 'string') {
        throw new Error('Invalid response from subscription sync server.');
    }

    return tierId;
};