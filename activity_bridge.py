"""
Activity Bridge

Central coordination point between Hermes and the Activity frontend.
Provides high-level operations for tools and commands.
"""

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Use absolute imports - works when loaded as hermes_plugins or plugins namespace
try:
    from hermes_plugins.discord_activities.activity_state import activity_state, ActivitySession
except ImportError:
    try:
        from plugins.discord_activities.activity_state import activity_state, ActivitySession
    except ImportError:
        # Fallback for direct import from plugin directory
        import sys
        from pathlib import Path
        _plugin_dir = Path(__file__).parent
        if str(_plugin_dir) not in sys.path:
            sys.path.insert(0, str(_plugin_dir))
        from activity_state import activity_state, ActivitySession


class ActivityBridge:
    """High-level interface for Activity operations.
    
    Used by tools and commands to interact with Activity state.
    """
    
    @staticmethod
    def launch(
        mode: str = "dashboard",
        title: Optional[str] = None,
        payload: Optional[Dict] = None,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Launch a new Activity session.
        
        Args:
            mode: View mode (dashboard, embed, live-view, assistant, artifacts)
            title: Optional title for the Activity
            payload: Optional initial payload
            reason: Why the Activity is being launched (for logging)
        
        Returns:
            Dict with session_id, status, and message
        """
        valid_modes = {"dashboard", "embed", "live-view", "assistant", "artifacts"}
        if mode not in valid_modes:
            return {
                "success": False,
                "error": f"Invalid mode '{mode}'. Valid modes: {', '.join(sorted(valid_modes))}"
            }
        
        # Create session
        session = activity_state.create_session(mode=mode, payload=payload)
        
        # Override title if provided
        if title and "title" in session.payload:
            session.payload["title"] = title
        
        logger.info("Launched activity session %s (mode=%s, reason=%s)", 
                    session.session_id, mode, reason or "not specified")
        
        return {
            "success": True,
            "session_id": session.session_id,
            "mode": session.mode,
            "status": session.status,
            "message": f"Activity launched. Session: {session.session_id}",
        }
    
    @staticmethod
    def update(session_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Update an Activity session's payload.
        
        Args:
            session_id: Session to update (must match current session)
            payload: New payload content
        
        Returns:
            Dict with success status and updated session info
        """
        current = activity_state.get_session()
        
        if current is None:
            return {"success": False, "error": "No active Activity session."}
        
        if current.session_id != session_id:
            return {
                "success": False,
                "error": f"Session ID mismatch. Current: {current.session_id}, requested: {session_id}"
            }
        
        updated = activity_state.update_session(payload)
        
        logger.debug("Updated activity session %s", session_id)
        
        return {
            "success": True,
            "session_id": session_id,
            "mode": updated.mode,
            "updated_at": updated.updated_at,
        }
    
    @staticmethod
    def close(session_id: Optional[str] = None) -> Dict[str, Any]:
        """Close the Activity session.
        
        Args:
            session_id: Optional session ID to verify (closes current if omitted)
        
        Returns:
            Dict with success status
        """
        current = activity_state.get_session()
        
        if current is None:
            return {"success": True, "message": "No active session to close."}
        
        if session_id and current.session_id != session_id:
            return {
                "success": False,
                "error": f"Session ID mismatch. Current: {current.session_id}, requested: {session_id}"
            }
        
        closed_id = activity_state.close_session()
        
        logger.info("Closed activity session %s", closed_id)
        
        return {"success": True, "message": f"Activity session {closed_id} closed."}
    
    @staticmethod
    def get_state(session_id: Optional[str] = None) -> Dict[str, Any]:
        """Get the current Activity state.
        
        Args:
            session_id: Optional session ID to verify
        
        Returns:
            Dict with session state or indication of no session
        """
        current = activity_state.get_session()
        
        if current is None:
            return {"active": False, "message": "No active Activity session."}
        
        if session_id and current.session_id != session_id:
            return {
                "active": True,
                "session_id": current.session_id,
                "warning": f"Requested session {session_id} not found. Current: {current.session_id}",
            }
        
        return {
            "active": True,
            "session": current.to_dict(),
        }
    
    @staticmethod
    def capabilities(platform: Optional[str] = None) -> Dict[str, Any]:
        """Get Activity capabilities for the current context.
        
        Args:
            platform: Current platform (discord, telegram, etc.)
        
        Returns:
            Dict with availability and supported modes
        """
        return {
            "available": platform == "discord",
            "platform": platform or "unknown",
            "modes": ["dashboard", "embed", "live-view", "assistant", "artifacts"],
            "single_user": True,
            "max_sessions": 1,
        }


# Global instance
activity_bridge = ActivityBridge()
