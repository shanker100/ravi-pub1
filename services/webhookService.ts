import { ConfluenceResponse } from '../types';

const WEBHOOK_URL = 'https://nexinodejs-364216224110.europe-west1.run.app/webhook/confluence-agent';
const PROXY_URL = 'https://corsproxy.io/?';

/**
 * Sends a request to the Confluence Agent Webhook.
 * We structure the payload to include the backend_command and parameters.
 */
export const callConfluenceWebhook = async (action: string, params: Record<string, any>): Promise<ConfluenceResponse> => {
  const payload = {
    backend_command: action,
    parameters: params,
    timestamp: new Date().toISOString(),
  };

  console.log(`[Webhook] Calling ${action} with`, params);

  const makeRequest = async (url: string) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Webhook failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  };

  try {
    if (!navigator.onLine) {
      throw new Error('No internet connection');
    }

    // Attempt direct connection first
    try {
      const data = await makeRequest(WEBHOOK_URL);
      return { success: true, data };
    } catch (directError: any) {
      // Check if it's a network/CORS error
      if (directError.message.includes('Failed to fetch') || directError.message.includes('NetworkError')) {
        console.warn('[Webhook] Direct fetch failed (likely CORS). Retrying with proxy...');
        // Retry with CORS Proxy
        // Note: corsproxy.io expects the target URL appended to the query
        const data = await makeRequest(PROXY_URL + encodeURIComponent(WEBHOOK_URL));
        return { success: true, data };
      }
      throw directError; // Re-throw if it's not a fetch error (e.g. 400/500 from server)
    }

  } catch (error: any) {
    console.error('[Webhook] Error:', error);
    
    let errorMessage = error.message || 'Unknown webhook error';
    if (errorMessage.includes('Failed to fetch')) {
      errorMessage = 'Network Error: Unable to reach webhook even via proxy. Check your internet connection.';
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
};