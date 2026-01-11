# Session Hooks Template

A template for creating Claude Code session hook plugins. Fork this repo to build your own custom session behaviors.

## What Are Session Hooks?

Claude Code plugins can hook into various session events to:
- **Inject context** into conversations
- **Block or modify** tool calls
- **Enforce conditions** before task completion
- **Track state** across the session
- **Trigger external actions** based on events

This template provides ready-to-use hook scripts for all major hook types with extensive documentation and examples.

## Quick Start

1. **Fork/Clone this template**
   ```bash
   # Clone the template
   git clone https://github.com/johnlindquist/claude-session-hooks-template.git my-plugin
   cd my-plugin

   # Install dependencies
   bun install
   ```

2. **Customize the plugin**
   - Edit `package.json` and `.claude-plugin/plugin.json` with your plugin name
   - Modify the hook scripts in `scripts/` for your use case
   - Update `STATE_FILE_PREFIX` in `src/state.ts`

3. **Install and test**
   ```bash
   # Install as local plugin
   claude plugin install . --scope local

   # Test your changes
   claude  # Start a session and try your hooks
   ```

## Available Hooks

| Hook | File | When It Fires |
|------|------|---------------|
| **SessionStart** | `scripts/SessionStart.ts` | When a session begins |
| **UserPromptSubmit** | `scripts/UserPromptSubmit.ts` | On every user prompt |
| **Stop** | `scripts/Stop.ts` | When Claude tries to stop |
| **PreToolUse** | `scripts/PreToolUse.ts` | Before any tool executes |
| **PostToolUse** | `scripts/PostToolUse.ts` | After a tool completes |

### Hook Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                      Claude Code Session                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  SessionStart ─────► User types prompt                       │
│                           │                                   │
│                           ▼                                   │
│                   UserPromptSubmit ◄───── Inject context?     │
│                           │                                   │
│                           ▼                                   │
│                   Claude processes...                         │
│                           │                                   │
│                   ┌───────┴───────┐                          │
│                   ▼               ▼                          │
│              PreToolUse      (No tools)                      │
│                   │               │                          │
│                   ▼               │                          │
│              Tool executes        │                          │
│                   │               │                          │
│                   ▼               │                          │
│              PostToolUse          │                          │
│                   │               │                          │
│                   └───────┬───────┘                          │
│                           ▼                                   │
│                      Stop ◄───── Block? Allow?               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Hook Details

### SessionStart

**File:** `scripts/SessionStart.ts`

Fires when a Claude Code session begins. Use it to:
- Initialize session state
- Load configuration
- Inject initial context

**Input fields:**
- `session_id` - Unique session identifier
- `source` - Why session started: `"startup"` | `"resume"` | `"clear"` | `"compact"`
- `cwd` - Current working directory

**Output options:**
- `additionalContext` - Text to inject into the conversation

### UserPromptSubmit

**File:** `scripts/UserPromptSubmit.ts`

Fires on every user prompt. Use it to:
- Analyze prompts for keywords/patterns
- Inject context based on prompt content
- Track prompt history

**Input fields:**
- `session_id` - Unique session identifier
- `prompt` - The user's prompt text
- `cwd` - Current working directory

**Output options:**
- `additionalContext` - Text to inject after the prompt

### Stop

**File:** `scripts/Stop.ts`

Fires when Claude attempts to stop. Use it to:
- Block stopping until conditions are met
- Require verification before completion
- Implement quality gates

**Input fields:**
- `session_id` - Unique session identifier
- `stop_hook_active` - True if another hook already blocked this stop

**Output options:**
- `decision` - `"block"` to prevent stopping, `undefined` to allow
- `reason` - Message explaining why stop is blocked

**Important:** Always check `stop_hook_active` and implement a safety valve (max denials) to prevent infinite loops.

### PreToolUse

**File:** `scripts/PreToolUse.ts`

Fires before a tool executes. Use it to:
- Block dangerous tool calls
- Modify tool inputs
- Implement custom permissions

**Input fields:**
- `session_id` - Unique session identifier
- `tool_name` - Name of the tool (e.g., `"Bash"`, `"Edit"`, `"Read"`)
- `tool_input` - The tool's input parameters
- `tool_use_id` - Unique ID for this tool call

**Output options:**
- `permissionDecision` - `"allow"` | `"deny"` | `"ask"`
- `permissionDecisionReason` - Explanation for the decision
- `updatedInput` - Modified input to use instead

### PostToolUse

**File:** `scripts/PostToolUse.ts`

Fires after a tool completes successfully. Use it to:
- Track changes made during the session
- Inject context based on results
- Trigger side effects (logging, notifications, etc.)

**Input fields:**
- `session_id` - Unique session identifier
- `tool_name` - Name of the tool that ran
- `tool_input` - The tool's input parameters
- `tool_response` - The tool's output/result
- `tool_use_id` - Unique ID for this tool call

**Output options:**
- `additionalContext` - Text to inject after the tool result

## Configuration

### hooks/hooks.json

This file registers which hooks are active and how they're matched:

```json
{
  "hooks": {
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "..." }] }],
    "UserPromptSubmit": [{ "matcher": "*", "hooks": [...] }],
    "PreToolUse": [{ "matcher": "Bash|Edit", "hooks": [...] }]
  }
}
```

**Matchers:**
- `"*"` - Match all (default)
- `"Bash"` - Match specific tool
- `"Bash|Edit|Write"` - Match multiple tools (regex OR)

### State Management

Use `src/state.ts` to persist data across hook invocations:

```typescript
import { getState, saveState, clearState } from '../src/state';

// Define your state interface
interface MyState {
  promptCount: number;
  flags: Record<string, boolean>;
}

// In your hook
const state = await getState<MyState>(session_id);
if (!state) {
  await saveState(session_id, { promptCount: 1, flags: {} });
} else {
  state.promptCount++;
  await saveState(session_id, state);
}
```

## Use Case Ideas

### Auto-Commit After File Writes
Track file changes in PostToolUse, commit them automatically with meaningful messages.

### Test Enforcement
In the Stop hook, check if tests have been run and passed before allowing completion.

### Security Gate
Use PreToolUse to block dangerous Bash commands (e.g., `rm -rf`, `sudo`).

### Context Injection
In UserPromptSubmit, detect keywords and inject project-specific guidelines.

### Prompt Analysis
Analyze user prompts for patterns and enforce thoroughness expectations.

### Rate Limiting
Track tool usage in state and block excessive calls in PreToolUse.

### Session Logging
Log all prompts and tool calls to an external service for analytics.

## File Structure

```
session-hooks-template/
├── .claude-plugin/
│   └── plugin.json         # Plugin manifest
├── hooks/
│   └── hooks.json          # Hook registration
├── scripts/
│   ├── SessionStart.ts     # Session start hook
│   ├── UserPromptSubmit.ts # User prompt hook
│   ├── Stop.ts             # Stop hook
│   ├── PreToolUse.ts       # Pre-tool hook
│   └── PostToolUse.ts      # Post-tool hook
├── src/
│   ├── state.ts            # State management utilities
│   └── utils.ts            # Common helper functions
├── package.json
├── tsconfig.json
├── README.md
└── AGENTS.md               # AI agent instructions
```

## Development

```bash
# Install dependencies
bun install

# Type check
bun run typecheck

# Run tests (if you add any)
bun test
```

## Debugging

- Use `console.error()` in hooks for logging (goes to stderr, visible in Claude Code logs)
- Use `console.log()` only for the final JSON output
- Check the temp directory for state files: `ls /tmp/session-hooks-template-*`

## Publishing

1. Update `package.json` and `.claude-plugin/plugin.json` with your details
2. Push to GitHub
3. Users can install with:
   ```bash
   claude plugin install your-plugin-name@your-username
   ```

## License

MIT
