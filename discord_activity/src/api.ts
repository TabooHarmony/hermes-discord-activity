/**
 * Activity API Client
 *
 * Functions to communicate with the Hermes backend plugin API.
 */

import type {
  ActivityState,
  ActivityCapabilities,
  LaunchResponse,
  EventResponse,
  ActivityMode,
} from './types';

// Base URL for the plugin API
// Configurable via window.HERMES_URL or URL parameter
// In Discord Activity context, this should be the Hermes server URL
const getBaseUrl = (): string => {
  // Priority: window global > URL param > hardcoded production URL
  const windowUrl = (window as { HERMES_URL?: string }).HERMES_URL;
  if (windowUrl) return `${windowUrl}/api/plugins/discord-activities`;

  const params = new URLSearchParams(window.location.search);
  const urlParam = params.get('hermes_url');
  if (urlParam) return `${urlParam}/api/plugins/discord-activities`;

  // Production default: the tunneled Hermes API
  return 'https://hermes.sys64.com/api/plugins/discord-activities';
};

/**
 * Fetch the current Activity state
 */
export async function fetchState(sessionId?: string): Promise<ActivityState> {
  const url = sessionId
    ? `${getBaseUrl()}/state/${sessionId}`
    : `${getBaseUrl()}/state`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return { active: false, message: 'No active session' };
    }
    throw new Error(`Failed to fetch state: ${response.status}`);
  }

  return response.json();
}

/**
 * Launch a new Activity session
 */
export async function launchActivity(
  mode: ActivityMode = 'dashboard',
  title?: string,
  payload?: Record<string, unknown>
): Promise<LaunchResponse> {
  const response = await fetch(`${getBaseUrl()}/launch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mode, title, payload }),
  });

  return response.json();
}

/**
 * Close an Activity session
 */
export async function closeActivity(sessionId?: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const response = await fetch(`${getBaseUrl()}/close`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ session_id: sessionId }),
  });

  return response.json();
}

/**
 * Post an event to the Activity session
 */
export async function postEvent(
  sessionId: string,
  eventType: string,
  data?: Record<string, unknown>
): Promise<EventResponse> {
  const response = await fetch(`${getBaseUrl()}/event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session_id: sessionId,
      event_type: eventType,
      data,
    }),
  });

  return response.json();
}

/**
 * Get Activity capabilities
 */
export async function getCapabilities(): Promise<ActivityCapabilities> {
  const response = await fetch(`${getBaseUrl()}/capabilities`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response.json();
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ status: string; plugin: string }> {
  const response = await fetch(`${getBaseUrl()}/health`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response.json();
}

/**
 * Start Server-Sent Events stream for state updates.
 * Falls back to polling if SSE is unavailable.
 * Returns a cleanup function.
 */
export function startStateStream(
  sessionId: string | undefined,
  onUpdate: (state: ActivityState) => void,
  onError?: (err: Error) => void
): () => void {
  // Try SSE first
  const streamUrl = `${getBaseUrl()}/stream`;
  let source: EventSource | null = null;
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  let active = true;

  const usePolling = () => {
    console.log('SSE unavailable, falling back to polling');
    const poll = async () => {
      if (!active) return;
      try {
        const state = await fetchState(sessionId);
        onUpdate(state);
      } catch (error) {
        console.error('Polling error:', error);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
      if (active) {
        fallbackTimer = setTimeout(poll, 2000);
      }
    };
    poll();
  };

  try {
    source = new EventSource(streamUrl);

    source.onmessage = (event) => {
      try {
        const state = JSON.parse(event.data);
        onUpdate(state);
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    source.onerror = (err) => {
      console.error('SSE error:', err);
      if (source) {
        source.close();
        source = null;
      }
      usePolling();
    };
  } catch (err) {
    console.error('Failed to create EventSource:', err);
    usePolling();
  }

  return () => {
    active = false;
    if (source) {
      source.close();
      source = null;
    }
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
    }
  };
}

/**
 * Legacy: Start polling for state updates.
 * Prefer startStateStream for live updates.
 */
export function startStatePolling(
  sessionId: string | undefined,
  onUpdate: (state: ActivityState) => void,
  intervalMs: number = 2000
): () => void {
  return startStateStream(sessionId, onUpdate);
}
