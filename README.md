# mcp-discord

> The most complete open-source MCP server for Discord.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org)
[![GitHub stars](https://img.shields.io/github/stars/goul4rt/mcp-discord.svg?style=social)](https://github.com/goul4rt/mcp-discord)
[![npm version](https://img.shields.io/npm/v/@goul4rt/mcp-discord)](https://npmjs.com/package/@goul4rt/mcp-discord)
[![npm downloads](https://img.shields.io/npm/dm/@goul4rt/mcp-discord)](https://npmjs.com/package/@goul4rt/mcp-discord)

Give any MCP client (Claude, Cursor, custom agents) full control over Discord — messages, moderation, channels, roles, and more. Born from production use at [delfus.app](https://delfus.app), open-sourced for the community.

**[Portugues (BR)](docs/pt-br/README.md)**

---

## Why mcp-discord?

- **30+ tools** across 8 categories — servers, channels, messages, reactions, members, roles, moderation, and monitoring
- **Dual-mode** — run standalone (own process) or integrate as a plugin into your existing discord.js bot
- **REST-only or Gateway** — choose between lightweight REST-only mode or full WebSocket gateway for real-time features
- **Two transports** — stdio (default, for Claude Desktop / Claude Code) or HTTP with Bearer token auth
- **Production-proven** — built and used in production at [delfus.app](https://delfus.app)

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) 18 or higher
- A [Discord bot token](https://discord.com/developers/applications)

### Install

```bash
# Clone the repository
git clone https://github.com/goul4rt/mcp-discord.git
cd mcp-discord

# Install dependencies
npm install

# Build
npm run build
```

### Configure

```bash
cp .env.example .env
```

Edit `.env` and add your Discord bot token:

```env
DISCORD_TOKEN=your-bot-token-here
```

### Run

```bash
# stdio transport (default — for MCP clients like Claude)
npm start

# HTTP transport (for remote/web clients)
npm run start:http
```

---

## MCP Client Configuration

### Claude Desktop / Claude Code

Add to your MCP config file:

```json
{
    "mcpServers": {
        "discord": {
            "command": "node",
            "args": ["dist/standalone.js"],
            "cwd": "/path/to/mcp-discord",
            "env": {
                "DISCORD_TOKEN": "your-bot-token-here"
            }
        }
    }
}
```

### With Gateway (real-time features)

```json
{
    "mcpServers": {
        "discord": {
            "command": "node",
            "args": ["dist/standalone.js"],
            "cwd": "/path/to/mcp-discord",
            "env": {
                "DISCORD_TOKEN": "your-bot-token-here",
                "DISCORD_USE_GATEWAY": "true"
            }
        }
    }
}
```

---

## Tools

### Server / Guild (2 tools)

| Tool | Description |
|------|-------------|
| `list_servers` | List all Discord servers the bot has access to |
| `get_server_info` | Get detailed info about a specific server |

### Channels (7 tools)

| Tool | Description |
|------|-------------|
| `get_channels` | List all channels in a server |
| `get_channel` | Get detailed info about a channel |
| `create_channel` | Create text, voice, category, announcement, forum, or stage channels |
| `edit_channel` | Edit channel name, topic, NSFW, slowmode, position, category |
| `delete_channel` | Permanently delete a channel |
| `create_thread` | Create a thread in a channel (optionally from a message) |
| `archive_thread` | Archive a thread |

### Messages (8 tools)

| Tool | Description |
|------|-------------|
| `send_message` | Send messages with text, rich embeds, and replies |
| `read_messages` | Read recent messages with pagination (up to 100) |
| `search_messages` | Search messages by content, author, or channel |
| `edit_message` | Edit a bot message |
| `delete_message` | Delete a single message |
| `delete_messages_bulk` | Bulk delete 2-100 messages (< 14 days old) |
| `pin_message` | Pin a message |
| `unpin_message` | Unpin a message |

### Reactions (2 tools)

| Tool | Description |
|------|-------------|
| `add_reaction` | Add emoji reaction (Unicode or custom) |
| `remove_reaction` | Remove a reaction |

### Members / Users (4 tools)

| Tool | Description |
|------|-------------|
| `list_members` | List server members with pagination |
| `get_member` | Get detailed member info (roles, nickname, join date) |
| `get_user` | Get info about any Discord user by ID |
| `search_members` | Search members by username or nickname |

### Roles (4 tools)

| Tool | Description |
|------|-------------|
| `list_roles` | List all roles with permissions, colors, and member counts |
| `create_role` | Create a new role |
| `add_role` | Add a role to a member |
| `remove_role` | Remove a role from a member |

### Moderation (4 tools)

| Tool | Description |
|------|-------------|
| `timeout_user` | Temporarily mute a user (up to 28 days) |
| `kick_user` | Kick a user from the server |
| `ban_user` | Ban a user with optional message deletion |
| `unban_user` | Unban a user |

### Monitoring (2 tools)

| Tool | Description |
|------|-------------|
| `get_audit_log` | View server audit log (bans, kicks, changes) |
| `check_mentions` | Find recent @mentions of the bot or a user |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  MCP Client                      │
│          (Claude, Cursor, custom)                │
└──────────────────┬──────────────────────────────┘
                   │ stdio or HTTP
┌──────────────────▼──────────────────────────────┐
│               MCP Server                         │
│         (transport + tool routing)                │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│            Tool Registry                         │
│         (30 tools, Zod validation)               │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│          DiscordProvider (interface)              │
├─────────────────────┬───────────────────────────┤
│ StandaloneProvider  │  IntegratedProvider        │
│ (own token + REST/  │  (uses host bot's          │
│  optional gateway)  │   existing connection)      │
└─────────────────────┴───────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│              Discord API                         │
└─────────────────────────────────────────────────┘
```

**Provider abstraction:** MCP tools never touch discord.js directly. They call the `DiscordProvider` interface, which has two implementations:

- **StandaloneProvider** — creates its own connection using a bot token. REST-first with optional gateway. Use when running as a separate process.
- **IntegratedProvider** — receives an existing discord.js `Client` from the host bot. Zero overhead, shared cache and gateway. Use when embedding in an existing bot.

---

## Integration Guide

To use mcp-discord as a plugin inside your existing discord.js bot:

```typescript
import { IntegratedProvider, createMcpServer } from 'mcp-discord';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Your existing discord.js client
const provider = new IntegratedProvider({ client: myDiscordClient });
await provider.connect();

const server = createMcpServer({ provider });
const transport = new StdioServerTransport();
await server.connect(transport);
```

The `IntegratedProvider` uses your bot's existing gateway connection — no extra WebSocket, no extra authentication, no extra memory.

---

## Configuration Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DISCORD_TOKEN` | Yes | — | Discord bot token |
| `DISCORD_USE_GATEWAY` | No | `false` | Connect to Discord WebSocket gateway for real-time features |
| `MCP_TRANSPORT` | No | `stdio` | Transport mode: `stdio` or `http` |
| `MCP_PORT` | No | `3100` | HTTP server port (only when `MCP_TRANSPORT=http`) |
| `MCP_AUTH_TOKEN` | No | — | Bearer token for HTTP transport authentication |

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code style, and how to add new tools.

---

## License

[MIT](LICENSE)

---

## Author

Created by [@goul4rt](https://github.com/goul4rt). Born from [delfus.app](https://delfus.app), open-sourced for the community.
