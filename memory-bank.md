# Touch Feets - Project Memory Bank

This document provides a high-level overview of the Touch Feets project, its core functionality, the AI prompt used for image generation, and the technology stack.

## Project Summary

Touch Feets is an AI-powered web application designed to create unique, artistic images. Users can upload a photograph of a person with bare feet, and the application uses a generative AI model to edit the image, depicting Jesus Christ tenderly touching the feet.

The application has a distinct "gothic/cyberpunk catholic" aesthetic, characterized by a dark theme, neon crimson highlights, and gothic typography. It supports both anonymous guest users (with a limited number of free image generations) and registered users who sign in via Google. Registered users can upgrade to paid monthly subscription tiers to receive more generations and additional features like watermark-free images.

## Core AI Prompt

The image generation is guided by a specific system prompt sent to the Gemini model. This ensures consistency and quality in the output.

```
Modify the uploaded image to add Jesus Christ, in a reverent, artistic Byzantine style, gently touching the subject’s bare feet. Preserve the original lighting, background, perspective, and skin tone. Hands must align anatomically with the feet and cast natural shadows. Clothing should be traditional, with subtle halo or cyber-halo highlights. Do not alter the subject’s identity or facial features. Avoid distortions, extra limbs, or blur. Output at original resolution.
```

## Technology Stack

The application is built with a modern, serverless-oriented tech stack:

-   **Frontend:**
    -   **Framework:** React with TypeScript
    -   **Styling:** Tailwind CSS
    -   **Build:** ES6 Modules with an `importmap` for dependency management.

-   **AI & Image Generation:**
    -   **Provider:** Google Gemini API
    -   **Model:** `gemini-2.5-flash-image-preview` for image in-painting/editing.
    -   **SDK:** `@google/genai`

-   **Authentication:**
    -   **Provider:** Google Sign-In for OAuth 2.0.

-   **Payments & Subscriptions:**
    -   **Provider:** Stripe (for checkout, customer portal, and subscription management).

-   **Backend (Serverless):**
    -   **Platform:** Google Cloud Functions
    -   **Responsibilities:**
        -   Creating Stripe Checkout sessions.
        -   Creating Stripe Customer Portal sessions.
        -   Syncing user subscription status with Stripe's records.
