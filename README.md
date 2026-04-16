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

## Table of Contents

- [Why mcp-discord?](#why-mcp-discord)
- [Getting Started (for MCP/Claude Users)](#getting-started-mcp)
- [Getting Started (for Bot Developers)](#getting-started-bot)
- [Usage Examples](#usage-examples)
- [Tools](#tools)
- [Troubleshooting](#troubleshooting)
- [Architecture](#architecture)
- [Integration Guide](#integration-guide)
- [Configuration](#configuration-reference)

---

## Why mcp-discord?

- **80+ tools** across 8 categories — servers, channels, messages, reactions, members, roles, moderation, and monitoring
- **Dual-mode** — run standalone (own process) or integrate as a plugin into your existing discord.js bot
- **REST-only or Gateway** — choose between lightweight REST-only mode or full WebSocket gateway for real-time features
- **Two transports** — stdio (default, for Claude Desktop / Claude Code) or HTTP with Bearer token auth
- **Production-proven** — built and used in production at [delfus.app](https://delfus.app)

---

## Getting Started: For MCP/Claude Users {#getting-started-mcp}

### Prerequisites

- [Node.js](https://nodejs.org) 18 or higher
- A [Discord bot token](https://discord.com/developers/applications)

### Installation

Install via npm:

```bash
npm install @goul4rt/mcp-discord
```

### Configure Claude Desktop / Claude Code

Add to your MCP config (usually `~/Library/Application\ Support/Claude/claude_desktop_config.json` on Mac):

```json
{
    "mcpServers": {
        "discord": {
            "command": "node",
            "args": ["-e", "require('@goul4rt/mcp-discord').runStandalone()"],
            "env": {
                "DISCORD_TOKEN": "your-bot-token-here"
            }
        }
    }
}
```

### First Command

Restart Claude, then ask:

> "List all Discord servers I have access to"

Claude will automatically invoke the `list_servers` tool and show you the results.

### With Real-Time Features (Optional)

To enable real-time Discord gateway features (like monitoring new messages as they arrive), add this to your config:

```json
{
    "mcpServers": {
        "discord": {
            "command": "node",
            "args": ["-e", "require('@goul4rt/mcp-discord').runStandalone()"],
            "env": {
                "DISCORD_TOKEN": "your-bot-token-here",
                "DISCORD_USE_GATEWAY": "true"
            }
        }
    }
}
```

---

## Getting Started: For Bot Developers {#getting-started-bot}

### Prerequisites

- [Node.js](https://nodejs.org) 18 or higher
- A [Discord bot token](https://discord.com/developers/applications)
- Existing discord.js bot (or create one from scratch)

### Clone & Install

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

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your Discord bot token:

```env
DISCORD_TOKEN=your-bot-token-here
```

### Run Standalone (Separate Process)

Run the MCP server as a separate process (stdio transport):

```bash
npm start
```

Or HTTP transport (for remote clients):

```bash
npm run start:http
```

### Integrate Into Your Existing Bot

Use `IntegratedProvider` to embed mcp-discord into your existing discord.js bot:

```typescript
import { IntegratedProvider, createMcpServer } from 'mcp-discord';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const provider = new IntegratedProvider({ client: myDiscordClient });
await provider.connect();

const server = createMcpServer({ provider });
const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## Usage Examples

### For Claude/MCP Users

Ask Claude naturally — it will automatically invoke the right tool:

**Example 1: Send a message**
```text
> "Send a message to the #general channel saying 'Hello everyone!'"

Claude invokes: `send_message` with `channelId`, `content`
```

**Example 2: Search for a member**
```text
> "Find all members in my server with 'admin' in their username"

Claude invokes: `search_members` with `username` filter
```

**Example 3: Moderate a user**
```text
> "Timeout the user @Spam for 24 hours with reason 'Spam'"

Claude invokes: `timeout_user` with userId, duration, reason
```

**Example 4: View audit log**
```text
> "Show me the last 10 bans in the server"

Claude invokes: `get_audit_log` with action filter
```

### For Bot Developers

Use these examples as a starting point for your own MCP server or bot integration:

**Example 1: Send a message**

```typescript
import { IntegratedProvider } from 'mcp-discord';

const provider = new IntegratedProvider({ client: myBot });
await provider.connect();

const result = await provider.sendMessage(channelId, {
    content: 'Hello @members! New announcement:',
    embeds: [{ title: 'Update', description: 'System online' }]
});
```

**Example 2: Search members**

```typescript
const members = await provider.searchMembers(serverId, {
    username: 'admin'
});

console.log(\`Found \${members.length} members matching search\`);
members.forEach(m => console.log(\`\${m.user.username} - roles: \${m.roles.length}\`));
```

**Example 3: Moderate a user**

```typescript
await provider.timeoutUser(serverId, userId, {
    duration: 24 * 60 * 60 * 1000, // 24 hours in ms
    reason: 'Spam',
    moderatorId: botId
});
```

**Example 4: Fetch audit log**

```typescript
const auditLog = await provider.getAuditLog(serverId, {
    limit: 10,
    actionType: 'BAN' // Filter by specific action
});

auditLog.entries.forEach(entry => {
    console.log(\`\${entry.action}: \${entry.targetId} by \${entry.executorId}\`);
});
```

**Example 5: Create a role**

```typescript
const newRole = await provider.createRole(serverId, {
    name: 'Muted',
    color: 0xFF0000, // Red
    mentionable: false
});

console.log(\`Created role: \${newRole.name}\`);
```

**Example 6: Create a thread**

```typescript
const thread = await provider.createThread(channelId, {
    name: 'Bug: Login fails on Safari',
    messageId: originalMessageId,
    autoArchiveDuration: 1440 // 1 day
});
```

**Example 7: List all roles**

```typescript
const roles = await provider.listRoles(serverId);

roles.forEach(role => {
    console.log(\`\${role.name} - members: \${role.memberCount}\`);
});
```

**Example 8: Add a reaction**

```typescript
await provider.addReaction(channelId, messageId, {
    emoji: '👍' // Unicode emoji
});
// Or custom emoji:
await provider.addReaction(channelId, messageId, {
    emoji: '<:myemoji:123456789>'
});
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

## Troubleshooting

### Discord Token Not Working

**Symptoms:** "Invalid token" error or 401 Unauthorized from Discord API

**Solution:**
1. Verify you copied the **token** (not the client secret) from [Discord Developer Portal](https://discord.com/developers/applications)
2. Ensure the token hasn't been regenerated (regenerating old token invalidates it)
3. Check `.env` file has exact format: `DISCORD_TOKEN=token-here` (no quotes)
4. Verify bot has at least one permission configured in Developer Portal → OAuth2 → Scopes

### Can't See Commands in Claude

**Symptoms:** Claude says "I don't have access to Discord tools" or tools don't appear

**Solution:**
1. Ensure the MCP server is running:
   - For stdio: `npm start` should show "MCP server listening"
   - For HTTP: `npm run start:http` should show "HTTP server on port 3100"
2. Restart Claude/Claude Code app after adding the config
3. Check config file path:
   - **Mac:** `~/Library/Application\ Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux:** `~/.config/Claude/claude_desktop_config.json`
4. Verify `node` command is available in your PATH (type `node --version` in terminal)

### Gateway Connection Timeout (Real-Time Features)

**Symptoms:** When using `DISCORD_USE_GATEWAY=true`, connection hangs or times out

**Solution:**
1. Check your firewall allows WebSocket connections to Discord:
   ```bash
   # Test connectivity to Discord gateway
   curl -I https://gateway.discord.gg
   ```
2. Verify bot has GATEWAY intents enabled in Discord Developer Portal:
   - Go to Applications → Your Bot → Bot → Privileged Gateway Intents
   - Enable: Message Content Intent, Server Members Intent
3. Try without gateway first (`DISCORD_USE_GATEWAY=false`) to isolate the issue

### "Bot Lacks Permissions" for Tool

**Symptoms:** Tool executes but fails with "Missing Permissions: SEND_MESSAGES" (or similar)

**Solution:**
1. Check role hierarchy: Bot role must be higher than the role/member it's trying to manage
   - Go to Server Settings → Roles
   - Ensure @bot role is above target role
2. Verify the bot's role has required permissions:
   - Go to Server Settings → Roles → @bot role
   - Enable the permission in question (e.g., "Send Messages", "Manage Messages")
3. If permission is channel-specific, check Channel Settings → Permissions
   - Verify bot role isn't being denied the permission

---

## Architecture

```text
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
│         (80+ tools, Zod validation)               │
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
