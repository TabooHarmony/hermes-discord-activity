"""Activity Slash Commands

Handlers for /activity and /activity-debug commands.

Uses ActivityBridge as the canonical state source — no split state.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Import the canonical state bridge
try:
    from hermes_plugins.discord_activities.activity_bridge import activity_bridge
except ImportError:
    try:
        from plugins.discord_activities.activity_bridge import activity_bridge
    except ImportError:
        import sys
        from pathlib import Path
        _plugin_dir = Path(__file__).parent
        if str(_plugin_dir) not in sys.path:
            sys.path.insert(0, str(_plugin_dir))
        from activity_bridge import activity_bridge


def get_session_state() -> Optional[dict]:
    """Get the current activity session state from canonical store."""
    state = activity_bridge.get_state()
    if state.get("active"):
        return state.get("session")
    return None


def handle_activity_status(raw_args: str = "") -> str:
    """Handle /activity status command.

    Returns the current activity session status or indicates no session.
    """
    state = activity_bridge.get_state()
    
    if not state.get("active"):
        return "No active Activity session."
    
    session = state.get("session", {})
    return (
        f"Activity session: {session.get('session_id', 'unknown')}\n"
        f"Mode: {session.get('mode', 'unknown')}\n"
        f"Status: {session.get('status', 'unknown')}\n"
        f"Created: {session.get('created_at', 'unknown')}"
    )


def handle_activity_open(raw_args: str = "", platform: Optional[str] = None) -> str:
    """Handle /activity open [view] command.

    Creates a session via ActivityBridge (canonical state).
    """
    # Parse view argument
    view = raw_args.strip().lower() or "dashboard"
    valid_views = {"dashboard", "embed", "live-view", "assistant", "artifacts"}
    if view not in valid_views:
        return f"Invalid view '{view}'. Valid modes: {', '.join(sorted(valid_views))}"
    
    # Check platform availability
    caps = activity_bridge.capabilities(platform=platform)
    if not caps.get("available"):
        return f"Activity not available on platform '{platform or 'unknown'}'. Available on: discord"
    
    result = activity_bridge.launch(mode=view, reason="slash-command")
    
    if not result.get("success"):
        return f"Failed to launch activity: {result.get('error', 'unknown error')}"
    
    logger.info("Created activity session %s with mode %s", result["session_id"], view)
    
    return (
        f"Activity session created.\n"
        f"Session ID: {result['session_id']}\n"
        f"Mode: {view}\n"
        f"Status: active\n\n"
        f"Note: This is a backend session. Launch the Discord Activity manually "
        f"or use the Hermes Web UI to view it."
    )


def handle_activity_close(raw_args: str = "") -> str:
    """Handle /activity close command.

    Closes session via ActivityBridge (canonical state).
    """
    result = activity_bridge.close()
    
    if result.get("success"):
        return result.get("message", "Activity session closed.")
    else:
        return f"Failed to close: {result.get('error', 'unknown error')}"


def handle_activity_debug(raw_args: str = "") -> str:
    """Handle /activity-debug command.

    Dumps the current session state for debugging.
    """
    state = activity_bridge.get_state()
    
    if not state.get("active"):
        return "No active Activity session.\n\nDebug: activity_bridge.get_state() returned inactive"
    
    import json
    return f"Session state:\n```json\n{json.dumps(state, indent=2, default=str)}\n```"
