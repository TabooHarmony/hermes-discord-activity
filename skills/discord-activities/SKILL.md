---
name: discord-activities
description: Launch Discord Activity visual surfaces for rich output
category: productivity
---

# Discord Activities

Launch a Discord Activity as a live visual surface when output benefits from
persistent controls, pane-based layouts, or visual display.

## When to use

Call `launch_activity` when:
- User explicitly asks for visual/dashboard output
- Output is naturally visual (screenshots, emulators, diagrams)
- Workflow needs persistent controls (action buttons, status panels)
- Discord chat formatting would be awkward for the content

## When NOT to use

Do NOT use when:
- Plain text is sufficient
- Task is brief (< 3 exchanges)
- User is not on Discord platform
- Plugin returns `available: false` from `activity_capabilities`

## Modes

| Mode | Use for |
|------|---------|
| `dashboard` | General structured output, cards, progress, status |
| `embed` | Embedded local apps (Hermes Web UI, etc.) |
| `live-view` | Action-synced frames with telemetry (emulators, browser tasks) |
| `assistant` | Rich text responses better suited to a larger canvas |
| `artifacts` | File lists, downloads, generated outputs |

## Workflow

```
1. launch_activity(mode="dashboard") → get session_id
2. update_activity_state(session_id, payload) → refresh content
3. update_activity_state(session_id, payload) → continue updates
4. close_activity(session_id) → when done
```

## Fallback behavior

If `launch_activity` fails or returns `available: false`:
- Proceed with normal text response in Discord
- No error message needed — just continue

## Payload hints

For `dashboard` mode:
```json
{
  "mode": "dashboard",
  "title": "Task Progress",
  "sections": [
    {"title": "Status", "content": "...", "status": "active"},
    {"title": "Actions", "buttons": [{"label": "Run", "action": "run"}]}
  ]
}
```

For `live-view` mode:
```json
{
  "mode": "live-view",
  "title": "Emulator",
  "frame_url": "http://...",
  "last_action": "Pressed A",
  "state": {"hp": 45, "level": 12}
}
```

## Platform check

Call `activity_capabilities` to verify availability:
```json
{"available": true, "platform": "discord", "modes": [...]}
```

If `available` is `false`, skip Activity and use text.

## Single-session model

One active Activity per Hermes session. Launching a new Activity
closes the previous one automatically.

## API Endpoints (for frontend)

The Activity frontend can interact with these endpoints:

- `GET /api/plugins/discord-activities/state` — Get current session
- `GET /api/plugins/discord-activities/state/{session_id}` — Get specific session
- `POST /api/plugins/discord-activities/launch` — Create session
- `POST /api/plugins/discord-activities/close` — Close session
- `POST /api/plugins/discord-activities/event` — Send UI event
- `GET /api/plugins/discord-activities/capabilities` — Check availability
- `GET /api/plugins/discord-activities/health` — Health check
