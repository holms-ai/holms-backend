# Holms

<p align="center">
  <img src="assets/appicon.png" width="128" alt="Holms" />
</p>

AI-driven home automation powered by Claude. Instead of rigid if-then rules, Holms uses an LLM agent that observes your home, learns your preferences over time, and acts autonomously — deferring to you on anything it's unsure about.

The name plays on *holm* — a small, self-contained island — and *Holmes*: observe, reason, act. It doesn't follow rules. It thinks.

## How it works

A daemon connects to your smart home through **adapters** — isolated processes that bridge platforms (Hue, Home Assistant, calendars, weather) into a unified **Habitat** model of spaces, sources, and properties. Events flow to a Claude agent via the [Agent SDK](https://docs.anthropic.com/en/docs/claude-code/sdk). The agent can observe and control devices, store memories, create automations, spawn deep-reasoning sub-agents, and talk to you through multiple channels (web, Slack, Telegram, WhatsApp). A React dashboard lets you monitor everything and approve proposed actions.

### What makes it different

**The agent learns, not just executes.** It has a semantic memory system (local embeddings via all-MiniLM-L6-v2) where it stores preferences, lessons from mistakes, and knowledge about your home. When you reverse an action (turn off a light it turned on), the outcome observer detects it and feeds that back as a learning signal.

**Automations are AI-reasoned, not rule engines.** Automations (time, device-event, state-threshold triggers) wake the full agent loop — so it applies context each time. Only after an automation proves consistently identical does the agent promote it to a **reflex** (sub-second local rule, no LLM). This means behavior evolves from reasoning to muscle memory naturally.

**It manages its own attention.** The agent assigns triage lanes (immediate / batch / silent) to event sources and adjusts them during reflection cycles — silencing noise, escalating things it missed. It also runs proactive cycles: situational checks, reflection, goal review, and daily summaries.

**Deep reasoning on demand.** For complex trade-offs (comfort vs. energy, multi-source conflicts), the coordinator spawns a read-only sub-agent on a stronger model that analyzes and recommends — the coordinator decides what to act on.

### Event flow

```
Adapter state change → Habitat → EventBus
  ├→ ReflexEngine (instant local rules)
  ├→ AutomationMatcher (claims event before triage if matched)
  ├→ TriageEngine (immediate / batch / silent)
  └→ Coordinator (reasons, acts, learns)
       └→ OutcomeObserver (watches for user reversals)
```

### Architecture

```
packages/
├── shared/        TypeScript types
├── adapter-sdk/   Adapter IPC protocol + runAdapter() harness
├── daemon/        tRPC API + Claude agent coordinator
└── frontend/      React dashboard (Vite + Tailwind v4)
adapters/
├── hue/           Philips Hue (mDNS discovery, link-button pairing)
├── caldav/        Calendar feeds
├── pirate-weather/ Weather forecasts
├── afvalinfo/     Waste collection
├── brink/         HVAC / heat recovery
└── ismartgate/    Gate controller
```

The daemon runs two executor tracks: **ChatCoordinator** (per-channel, stateful with SDK session resume) for conversations, and **EphemeralRunner** (stateless, parallel) for device events, proactive wakeups, and feedback. Both share a pool of in-process MCP tool servers.

Adapters run as separate Node.js processes communicating via NDJSON over stdio — a crash in one never takes down the system. The daemon supervises them with health pings and automatic restart. Adapters that declare `setup` or `pair` capabilities get an agent-guided setup flow in the UI.

## Getting started

### Quick install (Docker)

Requires [Docker](https://docs.docker.com/get-docker/) and a Claude authentication method.

```bash
curl -fsSL https://raw.githubusercontent.com/holms-ai/holms-backend/main/install.sh | bash
```

Sets up `~/.holms` with data persistence and auto-updates via Watchtower. Dashboard at [http://localhost:3100](http://localhost:3100).

**Authentication** — provide upfront or configure after in `~/.holms/.env`:

```bash
# Claude subscription (recommended) — generate a long-lived OAuth token
claude setup-token
CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-... curl -fsSL .../install.sh | bash

# Or use an API key from console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-api03-... curl -fsSL .../install.sh | bash
```

Options: `HOLMS_DIR=/opt/holms` (custom dir), `HOLMS_PORT=8080` (custom port), `--no-auto-update` (skip Watchtower).

### Development setup

Requires Node.js 20+ and [Claude Code](https://docs.anthropic.com/en/docs/claude-code) authenticated.

```bash
npm install
npm run build:adapters    # Separate from workspace — own node_modules
npm run dev               # Daemon (port 3100) + frontend (port 5173)
```

On first launch the agent starts an onboarding flow to set up adapters and create spaces.

### Configuration

Environment variables in `packages/daemon/.env` (Docker: `~/.holms/.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `HOLMS_PORT` | `3100` | Daemon API port |
| `HOLMS_DB_PATH` | `./holms.db` | SQLite database path |
| `HOLMS_ADAPTERS_DIR` | `~/.holms/adapters` | User adapter directory |
| `HOLMS_MODEL_COORDINATOR` | `claude-sonnet-4-6` | Main coordinator model |
| `HOLMS_MODEL_DEEP_REASON` | `claude-opus-4-6` | Deep reasoning model |
| `HOLMS_MODEL_LIGHTWEIGHT` | `claude-haiku-4-5-20251001` | Lightweight tasks model |

#### Apple MapKit (optional)

Enables interactive maps on the Zones page for geofencing. Without it, zones still work — just no map visualization. Requires an [Apple Developer](https://developer.apple.com/) MapKit JS key (Certificates → Keys → MapKit JS).

The install script prompts for this automatically. For manual setup, add to `.env`:

```
HOLMS_MAPKIT_KEY_PATH=/secrets/mapkit.p8
HOLMS_MAPKIT_KEY_ID=XXXXXXXXXX
HOLMS_MAPKIT_TEAM_ID=YYYYYYYYYY
```

And mount the `.p8` key file in `docker-compose.yml`:

```yaml
volumes:
  - ./keys/AuthKey_XXXXXXXXXX.p8:/secrets/mapkit.p8:ro
```

## Writing an adapter

Adapters are standalone Node.js packages using `@holms/adapter-sdk`. See `adapters/hue/` for a full example.

```
my-adapter/
├── adapter.json          # Manifest: type, entry, capabilities
├── package.json
├── src/index.ts          # import { runAdapter } from "@holms/adapter-sdk"
└── skills/               # Optional: agent setup instructions
```

An adapter registers entities with property domain mappings (illumination, climate, occupancy, access, media, power, etc.), pushes `state_changed` events, and responds to `observe`/`execute` requests. Optional: `discover` (network scanning) and `pair` (interactive pairing). Drop custom adapters into `~/.holms/adapters/`.

## Tech stack

[Claude Agent SDK](https://docs.anthropic.com/en/docs/claude-code/sdk) | [tRPC v11](https://trpc.io/) | SQLite ([better-sqlite3](https://github.com/WiseLibs/better-sqlite3)) | React 19 + Vite 6 + Tailwind v4 | Zod v4 | TypeScript ESM
