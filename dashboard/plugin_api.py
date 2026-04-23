"""
Discord Activities Plugin API

HTTP routes for the Activity frontend to communicate with Hermes.

Routes:
  GET  /api/plugins/discord-activities/state/{session_id}
  GET  /api/plugins/discord-activities/state
  POST /api/plugins/discord-activities/launch
  POST /api/plugins/discord-activities/close
  POST /api/plugins/discord-activities/event
  GET  /api/plugins/discord-activities/capabilities
  GET  /api/plugins/discord-activities/health
"""

import json
import logging
import sys
import time
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Router to be mounted by Hermes web server
router = APIRouter(tags=["discord-activities"])


# --- Import activity module from plugin directory ---

def _get_activity_state():
    """Lazily import activity_state from the plugin directory."""
    # Plugin is in ~/.hermes/plugins/ or .hermes/plugins/ or repo plugins/
    # Try to import from hermes_plugins namespace first
    try:
        from hermes_plugins.discord_activities.activity_state import activity_state
        return activity_state
    except ImportError:
        pass
    
    # Try from plugins.discord_activities (repo path)
    try:
        from plugins.discord_activities.activity_state import activity_state
        return activity_state
    except ImportError:
        pass
    
    # Last resort: add plugin path and import
    plugin_dir = Path(__file__).parent.parent
    if str(plugin_dir) not in sys.path:
        sys.path.insert(0, str(plugin_dir))
    from activity_state import activity_state
    return activity_state


def _get_activity_bridge():
    """Lazily import activity_bridge from the plugin directory."""
    try:
        from hermes_plugins.discord_activities.activity_bridge import activity_bridge
        return activity_bridge
    except ImportError:
        pass
    
    try:
        from plugins.discord_activities.activity_bridge import activity_bridge
        return activity_bridge
    except ImportError:
        pass
    
    plugin_dir = Path(__file__).parent.parent
    if str(plugin_dir) not in sys.path:
        sys.path.insert(0, str(plugin_dir))
    from activity_bridge import activity_bridge
    return activity_bridge


# --- Request models ---

class LaunchRequest(BaseModel):
    mode: str = "dashboard"
    title: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None


class UpdateRequest(BaseModel):
    session_id: str
    payload: Dict[str, Any]


class CloseRequest(BaseModel):
    session_id: Optional[str] = None


class EventRequest(BaseModel):
    session_id: str
    event_type: str
    data: Optional[Dict[str, Any]] = None


# --- Routes ---

@router.get("/state/{session_id}")
async def get_state(session_id: str):
    """Get the current Activity session state.
    
    Returns the full session payload for the frontend to render.
    """
    activity_state = _get_activity_state()
    current = activity_state.get_session()
    
    if current is None:
        return JSONResponse(
            status_code=404,
            content={"error": "No active session", "active": False}
        )
    
    if current.session_id != session_id:
        return JSONResponse(
            status_code=404,
            content={
                "error": "Session not found",
                "active": True,
                "current_session_id": current.session_id,
            }
        )
    
    return JSONResponse(content={
        "active": True,
        "session": current.to_dict(),
    })


@router.get("/state")
async def get_current_state():
    """Get the current Activity session (no session_id required).
    
    Convenience endpoint for frontend to get the active session.
    """
    activity_state = _get_activity_state()
    current = activity_state.get_session()
    
    if current is None:
        return JSONResponse(content={"active": False, "message": "No active session"})
    
    return JSONResponse(content={
        "active": True,
        "session": current.to_dict(),
    })


@router.post("/launch")
async def api_launch(request: LaunchRequest):
    """Launch a new Activity session.
    
    Creates a session and returns the session_id for the frontend.
    """
    activity_bridge = _get_activity_bridge()
    
    result = activity_bridge.launch(
        mode=request.mode,
        title=request.title,
        payload=request.payload,
    )
    
    if not result.get("success"):
        return JSONResponse(status_code=400, content=result)
    
    return JSONResponse(content=result)


@router.post("/close")
async def api_close(request: CloseRequest):
    """Close the Activity session."""
    activity_bridge = _get_activity_bridge()
    
    result = activity_bridge.close(session_id=request.session_id)
    
    return JSONResponse(content=result)


@router.post("/event")
async def receive_event(request: EventRequest):
    """Receive an event from the Activity frontend.
    
    Events are user actions like button clicks, tab changes, etc.
    """
    activity_state = _get_activity_state()
    current = activity_state.get_session()
    
    if current is None:
        return JSONResponse(
            status_code=404,
            content={"error": "No active session"}
        )
    
    if current.session_id != request.session_id:
        return JSONResponse(
            status_code=404,
            content={"error": "Session mismatch"}
        )
    
    # Log the event for now — in future milestones, this could trigger
    # agent turns, tool calls, or state mutations
    logger.info(
        "Activity event: session=%s type=%s data=%s",
        request.session_id,
        request.event_type,
        request.data
    )
    
    # Store last event in session metadata (for debugging)
    if hasattr(current.payload, 'setdefault'):
        current.payload.setdefault("meta", {})
        current.payload["meta"]["last_event"] = {
            "type": request.event_type,
            "data": request.data,
            "timestamp": time.time(),
        }
    
    return JSONResponse(content={
        "success": True,
        "session_id": request.session_id,
        "event_type": request.event_type,
    })


@router.get("/capabilities")
async def api_capabilities():
    """Get Activity capabilities and available modes."""
    activity_bridge = _get_activity_bridge()
    
    result = activity_bridge.capabilities(platform="discord")
    return JSONResponse(content=result)


@router.get("/health")
async def health():
    """Health check endpoint."""
    return JSONResponse(content={"status": "ok", "plugin": "discord-activities"})
