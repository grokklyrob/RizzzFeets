import { GENERATE_IMAGE_URL } from '../constants';

/**
 * A helper function to handle failed backend responses. It tries to parse JSON
 * for a specific error message, and falls back to a generic message.
 * @param response The fetch Response object.
 * @returns A promise that resolves to an Error object.
 */
const handleBackendError = async (response: Response): Promise<Error> => {
    let errorMessage = `Failed to generate image. The divine connection may be weak. (Status: ${response.status})`;
    try {
        const errorBody = await response.json();
        if (errorBody && errorBody.error) {
            errorMessage = errorBody.error;
        }
    } catch (e) {
        // Response was not JSON, stick with the status code message.
        console.error("Backend error response was not JSON.");
    }
    return new Error(errorMessage);
};

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

export const generateImageWithJesus = async (base64Image: string, mimeType: string): Promise<string> => {
    // Developer-friendly check: Ensure the backend URL has been configured.
    if (GENERATE_IMAGE_URL.includes('your-region-your-project')) {
        const errorMessage = "Image generation cannot proceed. The backend URL for image generation is a placeholder. Please update `GENERATE_IMAGE_URL` in `constants.ts` with your deployed Google Cloud Function URL.";
        console.error(errorMessage);
        alert(errorMessage);
        throw new Error("Backend URL not configured.");
    }

    try {
        const response = await fetch(GENERATE_IMAGE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ base64Image, mimeType }),
        });

        if (!response.ok) {
            throw await handleBackendError(response);
        }

        const { generatedImageBase64 } = await response.json();

        if (!generatedImageBase64) {
            throw new Error("The divine vision was incomplete. The server did not return an image.");
        }

        return generatedImageBase64;
    } catch (error) {
        console.error('Error calling image generation backend:', error);
        // Re-throw the error to be handled by the UI component
        throw error;
    }
};
