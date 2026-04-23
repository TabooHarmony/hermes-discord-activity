/**
 * Discord Embedded App SDK Integration
 *
 * Handles SDK initialization, authentication, and handshake with Discord client.
 * @see https://github.com/discord/embedded-app-sdk
 */

// Discord SDK types
export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
}

interface DiscordSDKInstance {
  commands: {
    authenticate: (token: string) => Promise<{ user: DiscordUser }>;
    getActivityState: () => Promise<{ state: string }>;
    setLocationPrivacy: (level: number) => Promise<void>;
    setOrientationLock: (orientation: string) => Promise<void>;
    openExternalLink: (url: string) => Promise<void>;
  };
  subscribe: (event: string, callback: (data: unknown) => void) => () => void;
  close: () => void;
}

declare global {
  interface Window {
    DiscordSDK?: {
      new (clientId: string): DiscordSDKInstance;
    };
  }
}

export interface DiscordContext {
  isRunningInDiscord: boolean;
  user?: DiscordUser;
  channelId?: string;
  guildId?: string;
  sessionId?: string;
}

/**
 * Initialize Discord Embedded App SDK
 *
 * @param clientId - Discord Application Client ID
 * @returns Discord context with user/channel info
 */
export async function initializeDiscordSDK(clientId: string): Promise<DiscordContext> {
  // Check if we're running inside Discord
  if (!window.DiscordSDK) {
    console.log('Not running in Discord context (SDK not available)');
    return { isRunningInDiscord: false };
  }

  try {
    // Initialize SDK
    const sdk = new window.DiscordSDK(clientId);

    console.log('Discord SDK initialized, performing handshake...');

    // Get OAuth2 access token from URL hash
    // Discord passes this when launching the Activity
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hashParams.get('access_token');
    const stateParam = hashParams.get('state');

    if (!accessToken) {
      console.warn('No access token in URL - Activity may not have been launched from Discord');
      return { isRunningInDiscord: true };
    }

    // Authenticate with Discord
    const authResult = await sdk.commands.authenticate(accessToken);
    console.log('Discord authentication successful:', authResult.user.username);

    // Get session ID from state parameter or URL params
    let sessionId: string | undefined;

    if (stateParam) {
      try {
        const stateData = JSON.parse(atob(stateParam));
        sessionId = stateData.session_id;
      } catch {
        // State might just be a raw session ID
        sessionId = stateParam;
      }
    }

    // Fallback: check URL query params
    if (!sessionId) {
      const queryParams = new URLSearchParams(window.location.search);
      sessionId = queryParams.get('session_id') || queryParams.get('session') || undefined;
    }

    return {
      isRunningInDiscord: true,
      user: authResult.user,
      sessionId,
    };
  } catch (error) {
    console.error('Discord SDK initialization failed:', error);
    return { isRunningInDiscord: true };
  }
}

/**
 * Close the Discord Activity
 */
export function closeDiscordActivity(): void {
  if (!window.DiscordSDK) {
    console.log('Not in Discord context, cannot close');
    return;
  }

  // Send close signal to parent window
  window.close();
}

/**
 * Open an external link in Discord's browser
 */
export async function openExternalLink(url: string): Promise<void> {
  // Fallback: open in new tab
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Get the Hermes URL for API calls
 *
 * In Discord Activity context, this needs to be a publicly reachable URL.
 * The Activity shell is loaded from Discord, but calls back to Hermes.
 */
export function getHermesApiUrl(): string {
  // Check for explicit URL in hash params (passed by Discord launch)
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const hermesUrl = hashParams.get('hermes_url');

  if (hermesUrl) {
    return hermesUrl;
  }

  // Check query params
  const queryParams = new URLSearchParams(window.location.search);
  const queryHermesUrl = queryParams.get('hermes_url');

  if (queryHermesUrl) {
    return queryHermesUrl;
  }

  // Check window global (can be set by hosting page)
  const windowUrl = (window as { HERMES_URL?: string }).HERMES_URL;
  if (windowUrl) {
    return windowUrl;
  }

  // Default: same origin
  // Note: This only works if the Activity is served from Hermes
  return window.location.origin;
}
