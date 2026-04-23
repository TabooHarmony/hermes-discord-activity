/**
 * Activity Entry Point
 *
 * Bootstraps the React app and initializes the Activity shell.
 * Handles Discord Embedded App SDK initialization when running in Discord.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { initializeDiscordSDK } from './discord';
import {
  shouldUseMockSDK,
  initializeMockDiscordSDK,
  injectMockDiscordSDK,
  type DiscordContext,
} from './mock-discord';
import './styles.css';

// Discord Application Client ID
// Uses the existing Hermes gateway bot application
const DISCORD_CLIENT_ID = '1493056841783971840';

// Get session ID from URL params or use undefined
function getSessionIdFromUrl(): string | undefined {
  const params = new URLSearchParams(window.location.search);
  return params.get('session') || params.get('session_id') || undefined;
}

// Initialize the app
async function init() {
  const container = document.getElementById('root');
  if (!container) {
    console.error('No root element found');
    return;
  }

  const sessionId = getSessionIdFromUrl();

  console.log('Initializing Activity shell', { sessionId });

  // Determine SDK mode
  const useMock = shouldUseMockSDK();
  let discordContext: DiscordContext | undefined;

  if (useMock) {
    console.log('=== MOCK DISCORD SDK MODE ===');
    console.log('To disable mock mode, remove ?mock_discord=1 from URL');
    console.log('Or clear localStorage: localStorage.removeItem("hermes_use_mock_discord")');
    injectMockDiscordSDK();
    discordContext = await initializeMockDiscordSDK();
  } else if (DISCORD_CLIENT_ID) {
    console.log('Attempting real Discord SDK initialization...');
    discordContext = await initializeDiscordSDK(DISCORD_CLIENT_ID);

    if (discordContext.isRunningInDiscord) {
      console.log('Running in Discord context', {
        user: discordContext.user?.username,
        sessionId: discordContext.sessionId,
      });
    } else {
      console.log('Not running in Discord - standalone mode');
    }
  } else {
    console.log('No Discord Client ID configured - standalone mode');
    console.log('Tip: Add ?mock_discord=1 to URL to test with mock Discord SDK');
  }

  // Determine which session ID to use
  // Priority: Discord context > URL param
  const effectiveSessionId = discordContext?.sessionId || sessionId;

  const root = createRoot(container);
  root.render(
    <StrictMode>
      <App sessionId={effectiveSessionId} discordContext={discordContext} />
    </StrictMode>
  );
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
