/**
 * Mock Discord SDK for Testing
 *
 * Provides a simulated Discord SDK environment for testing
 * the Activity shell locally without running inside Discord.
 */

import type { DiscordUser } from './discord';

// Re-export for convenience
export type { DiscordContext } from './discord';
import type { DiscordContext } from './discord';

// Mock user for testing
const MOCK_USER: DiscordUser = {
  id: '123456789012345678',
  username: 'TestUser',
  discriminator: '0001',
  avatar: 'mock_avatar_hash',
};

// Session storage for mock mode
const MOCK_SESSION_KEY = 'hermes_mock_discord_session';

/**
 * Check if we should use mock SDK
 *
 * Enabled via:
 * - URL param: ?mock_discord=1
 * - LocalStorage: hermes_use_mock_discord=true
 * - Window global: window.MOCK_DISCORD_SDK = true
 */
export function shouldUseMockSDK(): boolean {
  // Check URL param
  const params = new URLSearchParams(window.location.search);
  if (params.get('mock_discord') === '1') {
    return true;
  }

  // Check localStorage
  try {
    if (localStorage.getItem('hermes_use_mock_discord') === 'true') {
      return true;
    }
  } catch {
    // localStorage not available
  }

  // Check window global
  if ((window as { MOCK_DISCORD_SDK?: boolean }).MOCK_DISCORD_SDK) {
    return true;
  }

  return false;
}

/**
 * Initialize mock Discord SDK
 *
 * Simulates the Discord SDK handshake and provides mock context.
 */
export async function initializeMockDiscordSDK(): Promise<DiscordContext> {
  console.log('Using mock Discord SDK for testing');

  // Simulate async handshake delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Get or create mock session
  let sessionId: string | undefined;

  try {
    sessionId = localStorage.getItem(MOCK_SESSION_KEY) || undefined;
  } catch {
    // localStorage not available
  }

  // Check URL params for session override
  const params = new URLSearchParams(window.location.search);
  const urlSession = params.get('session_id') || params.get('session');

  if (urlSession) {
    sessionId = urlSession;
    try {
      localStorage.setItem(MOCK_SESSION_KEY, sessionId);
    } catch {
      // localStorage not available
    }
  }

  return {
    isRunningInDiscord: true,
    user: MOCK_USER,
    sessionId,
    channelId: 'mock-channel-id',
    guildId: 'mock-guild-id',
  };
}

/**
 * Set mock session ID
 *
 * Useful for testing session persistence.
 */
export function setMockSessionId(sessionId: string): void {
  try {
    localStorage.setItem(MOCK_SESSION_KEY, sessionId);
  } catch {
    // localStorage not available
  }
}

/**
 * Clear mock session
 */
export function clearMockSession(): void {
  try {
    localStorage.removeItem(MOCK_SESSION_KEY);
  } catch {
    // localStorage not available
  }
}

/**
 * Create a mock Discord SDK instance
 *
 * Injects a fake window.DiscordSDK for testing.
 */
export function injectMockDiscordSDK(): void {
  if (window.DiscordSDK) {
    console.log('Real Discord SDK already present, skipping mock');
    return;
  }

  (window as { DiscordSDK?: unknown }).DiscordSDK = class MockDiscordSDK {
    constructor(_clientId: string) {
      console.log('Mock Discord SDK initialized');
    }

    commands = {
      authenticate: async (token: string) => {
        console.log('Mock authenticate called with token:', token.slice(0, 8) + '...');
        return { user: MOCK_USER };
      },
      getActivityState: async () => {
        return { state: 'active' };
      },
      setLocationPrivacy: async (_level: number) => {},
      setOrientationLock: async (_orientation: string) => {},
      openExternalLink: async (url: string) => {
        window.open(url, '_blank');
      },
    };

    subscribe(event: string, _callback: (data: unknown) => void) {
      console.log('Mock subscribe to:', event);
      return () => {
        console.log('Mock unsubscribe from:', event);
      };
    }

    close() {
      console.log('Mock close called');
    }
  };

  console.log('Mock Discord SDK injected into window');
}
