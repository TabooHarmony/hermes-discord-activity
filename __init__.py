"""
Discord Activities Plugin for Hermes

Provides a Discord Activity as a live visual surface for Hermes-owned
or Hermes-reachable local UIs.

Usage:
    Agent calls launch_activity to open a visual surface
    Agent calls update_activity_state to refresh content
    Agent calls close_activity when done

The plugin provides tools only — no slash commands needed.
"""

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from hermes_cli.plugins import PluginContext

logger = logging.getLogger(__name__)


def register(ctx: "PluginContext") -> None:
    """Register plugin tools.
    
    Args:
        ctx: Plugin context for registering tools, commands, and hooks
    """
    # Register tools
    from .tool_defs import register_tools
    register_tools(ctx)
    
    logger.info("Discord Activities plugin registered")
