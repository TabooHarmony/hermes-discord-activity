# Hermes Discord Activity Plugin

A [Hermes Agent](https://github.com/TabooHarmony/hermes-agent) plugin that turns Discord Activities into live visual surfaces for AI-generated output.

## What it does

- `launch_activity` — Opens a Discord Activity visual surface (dashboard, embed, or live-view mode)
- `update_activity_state` — Pushes new content into an open Activity
- `close_activity` — Closes the surface
- `activity_capabilities` — Queries what Activity modes the current platform supports

## Structure

- `activity_bridge.py`, `activity_state.py`, `tool_defs.py`, `commands.py` — Python plugin backend
- `discord_activity/` — Vite + React frontend (Embedded App SDK)
- `dashboard/` — Plugin API and manifest for the dashboard surface
- `skills/` — Hermes skills bundled with the plugin

## Frontend

```bash
cd discord_activity
npm install
npm run dev      # local dev
npm run build    # production build
npm run test     # vitest
```

## Install

Drop the plugin directory into `~/.hermes/hermes-agent/plugins/` or symlink it, then restart Hermes.

## License

MIT
