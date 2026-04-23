/**
 * Activity App Component
 *
 * Renders the Activity shell with mode-specific content.
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  ActivityState,
  ActivityPayload,
  ActivityAction,
} from './types';
import type { DiscordContext } from './discord';
import { fetchState, postEvent, startStatePolling } from './api';

interface AppProps {
  sessionId?: string;
  discordContext?: DiscordContext;
}

export function App({ sessionId: initialSessionId, discordContext }: AppProps) {
  const [state, setState] = useState<ActivityState>({ active: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial state and start polling
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const init = async () => {
      try {
        const initialState = await fetchState(initialSessionId);
        setState(initialState);
        setLoading(false);

        // Start polling for updates
        cleanup = startStatePolling(
          initialState.session?.session_id,
          (newState) => {
            setState(newState);
          },
          2000
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load state');
        setLoading(false);
      }
    };

    init();

    return () => {
      if (cleanup) cleanup();
    };
  }, [initialSessionId]);

  // Handle action button click
  const handleAction = useCallback(
    async (action: ActivityAction) => {
      if (!state.session?.session_id) return;

      try {
        await postEvent(state.session.session_id, 'action_click', {
          action_id: action.id,
          action_label: action.label,
        });
      } catch (err) {
        console.error('Failed to post action event:', err);
      }
    },
    [state.session?.session_id]
  );

  // Loading state
  if (loading) {
    return (
      <div className="activity-shell loading">
        <div className="spinner">Loading...</div>
        {discordContext?.isRunningInDiscord && (
          <div className="discord-indicator">
            <small>Running in Discord</small>
          </div>
        )}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="activity-shell error">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          {discordContext?.isRunningInDiscord && (
            <button onClick={() => window.location.reload()}>
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // No active session
  if (!state.active || !state.session) {
    return (
      <div className="activity-shell empty">
        <div className="empty-state">
          <h2>No Active Activity</h2>
          <p>Launch an activity from Hermes to see content here.</p>
          {discordContext?.isRunningInDiscord && (
            <p className="discord-hint">
              <small>Waiting for Hermes to create a session...</small>
            </p>
          )}
        </div>
      </div>
    );
  }

  const { session } = state;
  const payload: ActivityPayload = session.payload || {
    mode: 'dashboard',
    title: 'Hermes Activity',
    status: 'idle',
    meta: { session_id: session.session_id, source: 'hermes' },
  };

  return (
    <div className="activity-shell">
      {/* Header */}
      <header className="activity-header">
        <h1>{payload.title || 'Hermes Activity'}</h1>
        <span className="activity-status">{payload.status || 'idle'}</span>
        <span className="activity-mode">{session.mode}</span>
        {discordContext?.isRunningInDiscord && (
          <span className="discord-badge" title="Running in Discord">
            Discord
          </span>
        )}
      </header>

      {/* Content based on mode */}
      <main className="activity-content">
        {renderContent(payload, handleAction)}
      </main>

      {/* Actions */}
      {payload.actions && payload.actions.length > 0 && (
        <footer className="activity-actions">
          {payload.actions.map((action) => (
            <button
              key={action.id}
              className={`action-btn ${action.type || 'secondary'} ${action.disabled ? 'disabled' : ''}`}
              onClick={() => handleAction(action)}
              disabled={action.disabled}
            >
              {action.label}
            </button>
          ))}
        </footer>
      )}

      {/* Meta info */}
      <div className="activity-meta">
        <small>Session: {session.session_id}</small>
        {discordContext?.user && (
          <small> | User: {discordContext.user.username}</small>
        )}
      </div>
    </div>
  );
}

/**
 * Render content based on mode
 */
function renderContent(
  payload: ActivityPayload,
  _onAction: (action: ActivityAction) => void
): React.ReactNode {
  switch (payload.mode) {
    case 'dashboard':
      return <DashboardView payload={payload} />;
    case 'embed':
      return <EmbedView payload={payload} />;
    case 'live-view':
      return <LiveViewView payload={payload} />;
    case 'assistant':
      return <AssistantView payload={payload} />;
    case 'artifacts':
      return <ArtifactsView payload={payload} />;
    default:
      return (
        <div className="unknown-mode">
          <p>Unknown mode: {(payload as { mode?: string }).mode}</p>
        </div>
      );
  }
}

/**
 * Dashboard mode renderer
 */
function DashboardView({
  payload,
}: {
  payload: ActivityPayload;
}) {
  const dashboard = payload.dashboard;

  return (
    <div className="mode-dashboard">
      {payload.content && (
        <div className="dashboard-content">
          <p>{payload.content}</p>
        </div>
      )}

      {dashboard?.sections?.map((section) => (
        <div key={section.id} className="dashboard-section">
          <h3>{section.title}</h3>
          {section.content && <p>{section.content}</p>}
          {section.status && (
            <span className={`section-status ${section.status}`}>
              {section.status}
            </span>
          )}
        </div>
      ))}

      {dashboard?.cards?.map((card) => (
        <div key={card.id} className="dashboard-card">
          <h4>{card.title}</h4>
          {card.value !== undefined && (
            <span className="card-value">{card.value}</span>
          )}
          {card.status && (
            <span className={`card-status ${card.status}`}>{card.status}</span>
          )}
        </div>
      ))}

      {!dashboard?.sections && !dashboard?.cards && !payload.content && (
        <div className="dashboard-empty">
          <p>Waiting for dashboard content...</p>
        </div>
      )}
    </div>
  );
}

/**
 * Embed mode renderer
 */
function EmbedView({ payload }: { payload: ActivityPayload }) {
  const embed = payload.embed;

  if (!embed?.url && !embed?.proxy_url) {
    return (
      <div className="mode-embed empty">
        <p>No embed URL configured</p>
      </div>
    );
  }

  const src = embed.proxy_url || embed.url;

  return (
    <div className="mode-embed">
      <iframe
        src={src}
        title={embed.label || 'Embedded Content'}
        className="embed-frame"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}

/**
 * Live-view mode renderer
 */
function LiveViewView({ payload }: { payload: ActivityPayload }) {
  const liveView = payload.live_view;

  return (
    <div className="mode-live-view">
      <div className="live-frame">
        {liveView?.frame_url ? (
          <img src={liveView.frame_url} alt="Live view" />
        ) : (
          <div className="no-frame">
            <p>Waiting for frame...</p>
          </div>
        )}
      </div>

      <div className="live-sidebar">
        {liveView?.objective && (
          <div className="live-objective">
            <h4>Objective</h4>
            <p>{liveView.objective}</p>
          </div>
        )}

        {liveView?.last_action && (
          <div className="live-last-action">
            <h4>Last Action</h4>
            <p>{liveView.last_action}</p>
          </div>
        )}

        {liveView?.state && (
          <div className="live-state">
            <h4>State</h4>
            <pre>{JSON.stringify(liveView.state, null, 2)}</pre>
          </div>
        )}

        {liveView?.recent_actions && liveView.recent_actions.length > 0 && (
          <div className="live-recent-actions">
            <h4>Recent Actions</h4>
            <ul>
              {liveView.recent_actions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Assistant mode renderer
 */
function AssistantView({ payload }: { payload: ActivityPayload }) {
  return (
    <div className="mode-assistant">
      {payload.content ? (
        <div className="assistant-content">
          <p>{payload.content}</p>
        </div>
      ) : (
        <div className="assistant-empty">
          <p>Waiting for assistant response...</p>
        </div>
      )}
    </div>
  );
}

/**
 * Artifacts mode renderer
 */
function ArtifactsView({ payload }: { payload: ActivityPayload }) {
  return (
    <div className="mode-artifacts">
      {payload.content ? (
        <div className="artifacts-content">
          <pre>{payload.content}</pre>
        </div>
      ) : (
        <div className="artifacts-empty">
          <p>No artifacts to display</p>
        </div>
      )}
    </div>
  );
}

export default App;
