# Authoring MCP Tools

This document is the contract every contributor (human or agent) must follow when adding new tools to `mcp-discord`. Read it before touching `src/tools/registry.ts`, the provider capabilities, or the providers themselves.

## Naming

- Tool names use **snake_case** and **never** carry a `discord_` prefix. The MCP client already namespaces by server.
- Names start with a verb whose category matches the file: `list_*`, `get_*`, `create_*`, `edit_*`, `delete_*`, `set_*`, `add_*`, `remove_*`, `send_*`, `read_*`, `search_*`, `pin_*`, `unpin_*`, `archive_*`, `kick_*`, `ban_*`, `unban_*`, `timeout_*`.
- Names are unique across the registry. Before adding a tool, grep for the name in `src/tools/registry.ts`.

## Capability boundaries

- Every tool corresponds to one method on a `*Capability` interface in `src/providers/capabilities/`.
- A new tool category gets a new capability file. **Never** add unrelated methods to an existing capability — that breaks the parallel-PR worktree story.
- The composed `DiscordProvider` interface in `src/providers/discord-provider.ts` only extends capabilities. It defines no methods directly except the lifecycle ones (`connect`, `disconnect`, `isReady`, `getBotUserId`).

## Handler return shapes

- **Mutators** (create, edit, delete, ban, etc.) return `{ success: true, <relevant_id> }`. Always include the id of the affected resource so the LLM can chain calls.
- **Queries** (list, get, read, search) return the mapped data directly. No `{ success: true }` wrapper.
- Errors propagate via thrown exceptions; the MCP server wraps them automatically.

## REST vs gateway

`StandaloneProvider` runs in two modes: gateway (full discord.js Client) and REST-only. Some Discord features (forum thread events, presence, voice state) only work via gateway.

- Each new method MUST be implemented in **both** providers.
- For features that work over REST: implement them in `StandaloneProvider`'s REST branch and `IntegratedProvider` (which always has gateway access).
- For features that **require** gateway: in `StandaloneProvider`'s REST-only branch, throw a clear error:
  ```typescript
  if (!this.client) {
      throw new Error('<tool_name> requires gateway mode (set DISCORD_USE_GATEWAY=true)');
  }
  ```
- Never silently fall through to a different behavior in REST-only mode.

## Mappers

- Every new return type needs **two** mappers in `src/utils/mappers.ts`:
  - `mapXxx(djsObject)` — converts a discord.js cache object to the flat type
  - `mapApiXxx(rawJson, ...fallbacks)` — converts the raw REST API JSON (snake_case) to the flat type
- The flat type lives in `src/types/discord.ts`. Define it once and import it from both providers and the registry.
- Keep mappers pure — no async, no provider access, no side effects.

## Tests

Every tool needs:
1. **Schema validation tests** in `src/tools/registry.test.ts`:
   - One happy-path parse
   - At least one negative case (missing required field, invalid type, out-of-range number)
   - Default value verification if the schema has `.default(...)`
2. **Handler delegation test**: call `tool.handler(validInput, stubProvider)` and assert the correct provider method was called with correctly transformed arguments.
3. **Mapper tests** in `src/utils/mappers.test.ts` if you added a new mapper. Cover the happy path plus null/missing optional fields.

The stub provider is composed from per-category partials in `src/tools/__test_helpers__/stubs/`. When you add methods to a capability, you MUST add stub functions in the matching partial file. TypeScript will fail the build if you forget.

## Comments and docstrings

- **Default to no comments.** The code should explain itself.
- The only acceptable comment is one explaining a non-obvious **why** — a hidden constraint, a Discord API quirk, an intentional workaround. Never explain what the code does.
- Tool definitions in the registry never carry JSDoc. The `description` field is the user-facing documentation.
- Capability interface methods never carry JSDoc. The flat types in `src/types/discord.ts` are self-documenting.

## File scope per category

When you implement a new category in a worktree branch, you may edit:
- `src/types/discord.ts` (append your types only)
- `src/utils/mappers.ts` (append your mappers only)
- `src/providers/capabilities/<your-category>.ts` (populate it)
- `src/providers/integrated-provider.ts` (only inside your pre-seeded section header)
- `src/providers/standalone-provider.ts` (only inside your pre-seeded section header)
- `src/tools/registry.ts` (only the pre-seeded `<your-category>Tools` array)
- `src/tools/__test_helpers__/stubs/<your-category>.ts` (populate it)
- `src/tools/registry.test.ts` (append a new `describe` block at the bottom)

You may **not** edit:
- `src/server.ts`, `src/index.ts`, `src/standalone.ts`
- `src/providers/discord-provider.ts` (the composition is sealed)
- `src/providers/base-provider.ts`
- Any other category's capability file, stub file, or tool section
- Files outside `src/`

## Commits

- One commit per logical sub-step: types → capability → integrated provider → standalone provider → mappers → tools → tests.
- Each commit must leave the build clean (`npm run build` exits 0) and the test suite green (`npm test` passes).
- TDD red-green for at least one tool per category: write the failing test first, watch it fail, then implement.
- **Never** add `Co-Authored-By: Claude` (or any LLM attribution) to commit messages.
