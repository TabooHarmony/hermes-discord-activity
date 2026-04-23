"""
Activity Tool Definitions

Tool schemas and handlers for Discord Activity control.
"""

import json
import logging
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)


# Tool schemas (OpenAI format)
LAUNCH_ACTIVITY_SCHEMA = {
    "name": "launch_activity",
    "description": (
        "Open a Discord Activity visual surface for the current user. "
        "Use when output is visual, pane-based, or benefits from persistent controls. "
        "Only works on Discord platform."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "mode": {
                "type": "string",
                "enum": ["dashboard", "embed", "live-view", "assistant", "artifacts"],
                "description": "View mode. 'dashboard' for general structured output, 'embed' for embedded apps, 'live-view' for action-synced frames.",
            },
            "title": {
                "type": "string",
                "description": "Title for the Activity window",
            },
            "payload": {
                "type": "object",
                "description": "Initial content payload (mode-specific)",
            },
            "reason": {
                "type": "string",
                "description": "Why a visual surface is appropriate (for logging)",
            },
        },
        "required": ["mode"],
    },
}

UPDATE_ACTIVITY_SCHEMA = {
    "name": "update_activity_state",
    "description": "Update the content of an open Discord Activity. Use to refresh dashboard, push new frames, or update state.",
    "parameters": {
        "type": "object",
        "properties": {
            "session_id": {
                "type": "string",
                "description": "Session ID from launch_activity response",
            },
            "payload": {
                "type": "object",
                "description": "New content payload (mode-specific)",
            },
        },
        "required": ["session_id", "payload"],
    },
}

CLOSE_ACTIVITY_SCHEMA = {
    "name": "close_activity",
    "description": "Close the Discord Activity visual surface.",
    "parameters": {
        "type": "object",
        "properties": {
            "session_id": {
                "type": "string",
                "description": "Session ID to close (optional, closes current if omitted)",
            },
        },
        "required": [],
    },
}

ACTIVITY_CAPABILITIES_SCHEMA = {
    "name": "activity_capabilities",
    "description": "Check if Discord Activity is available on the current platform and what modes are supported.",
    "parameters": {
        "type": "object",
        "properties": {},
        "required": [],
    },
}


def _launch_activity_handler(args: Dict[str, Any], platform: Optional[str] = None) -> str:
    """Handler for launch_activity tool."""
    from .activity_bridge import activity_bridge
    
    # Gate by platform — Activity only works on Discord
    caps = activity_bridge.capabilities(platform=platform)
    if not caps.get("available"):
        return json.dumps({
            "success": False,
            "error": f"Activity not available on platform '{platform or 'unknown'}'. Available on: discord",
            "available": False,
        })
    
    mode = args.get("mode", "dashboard")
    title = args.get("title")
    payload = args.get("payload")
    reason = args.get("reason")
    
    result = activity_bridge.launch(
        mode=mode,
        title=title,
        payload=payload,
        reason=reason,
    )
    
    return json.dumps(result)


def _update_activity_handler(args: Dict[str, Any], platform: Optional[str] = None) -> str:
    """Handler for update_activity_state tool."""
    from .activity_bridge import activity_bridge
    
    session_id = args.get("session_id", "")
    payload = args.get("payload", {})
    
    result = activity_bridge.update(session_id=session_id, payload=payload)
    
    return json.dumps(result)


def _close_activity_handler(args: Dict[str, Any], platform: Optional[str] = None) -> str:
    """Handler for close_activity tool."""
    from .activity_bridge import activity_bridge
    
    session_id = args.get("session_id")
    
    result = activity_bridge.close(session_id=session_id)
    
    return json.dumps(result)


def _capabilities_handler(args: Dict[str, Any], platform: Optional[str] = None) -> str:
    """Handler for activity_capabilities tool."""
    from .activity_bridge import activity_bridge
    
    result = activity_bridge.capabilities(platform=platform)
    
    return json.dumps(result)


def register_tools(ctx: Any) -> None:
    """Register all Activity tools with the plugin context.
    
    Called from __init__.py during plugin registration.
    """
    # Import activity_bridge to ensure state is initialized
    from .activity_bridge import activity_bridge
    
    # Register launch_activity
    ctx.register_tool(
        name="launch_activity",
        toolset="discord-activities",
        schema=LAUNCH_ACTIVITY_SCHEMA,
        handler=lambda args, **kw: _launch_activity_handler(args, platform=kw.get("platform")),
        check_fn=None,  # Available to all, but only useful on Discord
        is_async=False,
        description="Open a Discord Activity visual surface",
        emoji="📱",
    )
    
    # Register update_activity_state
    ctx.register_tool(
        name="update_activity_state",
        toolset="discord-activities",
        schema=UPDATE_ACTIVITY_SCHEMA,
        handler=lambda args, **kw: _update_activity_handler(args, platform=kw.get("platform")),
        check_fn=None,
        is_async=False,
        description="Update Activity content",
        emoji="🔄",
    )
    
    # Register close_activity
    ctx.register_tool(
        name="close_activity",
        toolset="discord-activities",
        schema=CLOSE_ACTIVITY_SCHEMA,
        handler=lambda args, **kw: _close_activity_handler(args, platform=kw.get("platform")),
        check_fn=None,
        is_async=False,
        description="Close the Activity",
        emoji="❌",
    )
    
    # Register activity_capabilities
    ctx.register_tool(
        name="activity_capabilities",
        toolset="discord-activities",
        schema=ACTIVITY_CAPABILITIES_SCHEMA,
        handler=lambda args, **kw: _capabilities_handler(args, platform=kw.get("platform")),
        check_fn=None,
        is_async=False,
        description="Check Activity availability",
        emoji="ℹ️",
    )
    
    logger.info("Discord Activities plugin: registered 4 tools")
