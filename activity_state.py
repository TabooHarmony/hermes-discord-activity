"""
Activity State Management

In-memory state store for Discord Activity sessions.
Single-user, one active session per Hermes instance.
"""

import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass
class ActivitySession:
    """Represents a single active Activity session."""
    session_id: str
    mode: str  # dashboard, embed, live-view, assistant, artifacts
    status: str  # idle, active, closed
    payload: Dict[str, Any]
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "mode": self.mode,
            "status": self.status,
            "payload": self.payload,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


def _deep_merge(base: dict, update: dict) -> dict:
    result = base.copy()
    for key, value in update.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result


class ActivityState:
    """In-memory state store for Activity sessions.
    
    Single-user design: one active session at a time.
    """
    
    _instance: Optional["ActivityState"] = None
    _session: Optional[ActivitySession] = None
    
    def __new__(cls) -> "ActivityState":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def create_session(self, mode: str = "dashboard", payload: Optional[Dict] = None) -> ActivitySession:
        """Create a new session, closing any existing one."""
        if self._session is not None:
            self._session.status = "closed"
        
        session_id = str(uuid.uuid4())[:8]
        now = time.time()
        
        default_payload = {
            "mode": mode,
            "title": f"Hermes {mode.title()}",
            "status": "idle",
            "content": "",
            "actions": [],
            "meta": {"session_id": session_id, "updated_at": now}
        }
        
        self._session = ActivitySession(
            session_id=session_id,
            mode=mode,
            status="active",
            payload=payload if payload is not None else default_payload,
            created_at=now,
            updated_at=now,
        )
        
        return self._session
    
    def update_session(self, payload: Dict[str, Any]) -> Optional[ActivitySession]:
        """Update the current session's payload."""
        if self._session is None:
            return None
        
        self._session.payload = _deep_merge(self._session.payload, payload)
        self._session.updated_at = time.time()
        self._session.payload.setdefault("meta", {})
        self._session.payload["meta"]["updated_at"] = self._session.updated_at
        
        return self._session
    
    def close_session(self) -> Optional[str]:
        """Close the current session."""
        if self._session is None:
            return None
        
        session_id = self._session.session_id
        self._session.status = "closed"
        self._session = None
        
        return session_id
    
    def get_session(self) -> Optional[ActivitySession]:
        """Get the current session."""
        return self._session
    
    def is_active(self) -> bool:
        """Check if there's an active session."""
        return self._session is not None and self._session.status == "active"


# Global singleton
activity_state = ActivityState()
