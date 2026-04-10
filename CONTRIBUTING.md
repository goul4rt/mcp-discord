# Contributing to mcp-discord

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

```bash
# Fork and clone
git clone https://github.com/<your-username>/mcp-discord.git
cd mcp-discord

# Install dependencies
npm install

# Create your environment file
cp .env.example .env
# Edit .env and add your Discord bot token

# Start in development mode (auto-reload)
npm run dev
```

## Code Style

This project uses ESLint and Prettier. Run before committing:

```bash
# Check for lint errors
npm run lint

# Auto-fix lint errors
npm run lint:fix

# Check formatting
npm run format

# Auto-fix formatting
npm run format:fix
```

## Adding a New Tool

Tools live in `src/tools/registry.ts`. Each tool has a name, description, Zod schema, and handler.

**Step 1:** Add the provider method to the interface in `src/providers/discord-provider.ts`:

```typescript
// In the DiscordProvider interface
myNewMethod(guildId: string): Promise<SomeType>;
```

**Step 2:** Implement the method in both providers:

- `src/providers/standalone-provider.ts`
- `src/providers/integrated-provider.ts`

**Step 3:** Register the tool in `src/tools/registry.ts`:

```typescript
{
    name: 'my_new_tool',
    description: 'What this tool does (shown to the LLM)',
    schema: z.object({
        guild_id: snowflakeId.describe('The server ID'),
    }),
    handler: async (input, provider) => provider.myNewMethod(input.guild_id),
},
```

**Step 4:** Add the tool to the appropriate category array (e.g., `serverTools`, `channelTools`).

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes and commit with descriptive messages
4. Run lint and format checks: `npm run lint && npm run format`
5. Run the build: `npm run build`
6. Push and open a Pull Request
7. Reference any related issues in the PR description

## Reporting Issues

Use the [issue templates](https://github.com/goul4rt/mcp-discord/issues/new/choose) and include:

- Node.js version
- Operating system
- Transport mode (stdio / http)
- Gateway mode (on / off)
- Steps to reproduce
