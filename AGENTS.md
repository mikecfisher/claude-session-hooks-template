# AI Agent Instructions

This is a **template repository** for building Claude Code session hook plugins. When working with this codebase, your goal is to help users create custom session behaviors.

## Understanding This Template

### What This Template Provides

1. **Five hook scripts** in `scripts/`:
   - `SessionStart.ts` - Fires when a session begins
   - `UserPromptSubmit.ts` - Fires on every user prompt
   - `Stop.ts` - Fires when Claude tries to stop
   - `PreToolUse.ts` - Fires before any tool executes
   - `PostToolUse.ts` - Fires after a tool completes

2. **Utilities** in `src/`:
   - `state.ts` - Persist data across hook invocations
   - `utils.ts` - Common helper functions

3. **Configuration** in `hooks/hooks.json` and `.claude-plugin/plugin.json`

### How Hooks Work

Hooks are TypeScript scripts that:
1. Receive JSON input via stdin
2. Process the input
3. Output JSON to stdout

Each hook has access to:
- `session_id` - Unique identifier for the session
- `cwd` - Current working directory
- Hook-specific data (prompt text, tool name, etc.)

## Common User Requests

### "I want to [action] when the user [trigger]"

**Pattern:** Use `UserPromptSubmit` hook

Example: "Remind the agent to run tests when the user mentions 'deploy'"

```typescript
// In scripts/UserPromptSubmit.ts
if (prompt.toLowerCase().includes('deploy')) {
  contextMessages.push('<reminder>Run tests before deploying!</reminder>');
}
```

### "I want to block [tool] when [condition]"

**Pattern:** Use `PreToolUse` hook

Example: "Block Bash commands containing 'rm -rf'"

```typescript
// In scripts/PreToolUse.ts
if (tool_name === 'Bash') {
  const command = (tool_input as { command?: string }).command || '';
  if (command.includes('rm -rf')) {
    return denyTool('Dangerous command blocked');
  }
}
```

### "I want to require [condition] before completing"

**Pattern:** Use `Stop` hook

Example: "Require tests to pass before allowing stop"

```typescript
// In scripts/Stop.ts
const state = await getState<MyState>(session_id);
if (state?.testsRequired && !state.testsPassed) {
  return blockStop('Tests must pass before completing');
}
```

### "I want to track [data] during the session"

**Pattern:** Use `PostToolUse` hook + state management

Example: "Track all files that were modified"

```typescript
// In scripts/PostToolUse.ts
if (tool_name === 'Write' || tool_name === 'Edit') {
  const filePath = (tool_input as { file_path?: string }).file_path;
  const state = await getState<MyState>(session_id) || { modifiedFiles: [] };
  if (filePath && !state.modifiedFiles.includes(filePath)) {
    state.modifiedFiles.push(filePath);
    await saveState(session_id, state);
  }
}
```

### "I want to auto-commit after file changes"

**Pattern:** Combine `PostToolUse` with git commands

Example implementation approach:
1. Track file changes in PostToolUse
2. In Stop hook, check if there are uncommitted changes
3. Either auto-commit or remind the agent to commit

## Implementation Guidelines

### Adding New Behavior

1. **Identify the right hook** based on when the behavior should trigger
2. **Read the existing template** - each script has detailed comments and examples
3. **Add your logic** in the "YOUR LOGIC HERE" section
4. **Use state** if you need to track data across hook invocations
5. **Test locally** with `claude plugin install . --scope local`

### State Management

Use `src/state.ts` for persisting data:

```typescript
// Define your state interface
interface MyState {
  sessionId: string;
  someFlag: boolean;
  someCounter: number;
}

// Read state
const state = await getState<MyState>(session_id);

// Create/update state
await saveState(session_id, {
  sessionId: session_id,
  someFlag: true,
  someCounter: 0
});

// Clear state
await clearState(session_id);
```

### Output Patterns

**Inject context** (visible to Claude, not user):
```typescript
hookSpecificOutput: {
  hookEventName: "UserPromptSubmit",
  additionalContext: "<reminder>Your message here</reminder>"
}
```

**Block a tool call**:
```typescript
hookSpecificOutput: {
  hookEventName: "PreToolUse",
  permissionDecision: "deny",
  permissionDecisionReason: "Blocked because..."
}
```

**Block stopping**:
```typescript
{
  decision: "block",
  reason: "Cannot stop because..."
}
```

### Safety Considerations

1. **Stop hook safety valve**: Always implement a max denial count to prevent infinite loops
2. **Check `stop_hook_active`**: Prevent double-blocking in Stop hooks
3. **Error handling**: Always output valid JSON, even on errors
4. **Logging**: Use `console.error()` for debugging, `console.log()` for output

## Customization Checklist

When a user wants to create their own plugin:

1. [ ] Rename in `package.json` and `.claude-plugin/plugin.json`
2. [ ] Update `STATE_FILE_PREFIX` in `src/state.ts`
3. [ ] Modify hook scripts for desired behavior
4. [ ] Remove unused hooks from `hooks/hooks.json`
5. [ ] Update README.md with plugin-specific documentation
6. [ ] Test with `claude plugin install . --scope local`

## Quick Reference

### Hook Input Types
```typescript
import type {
  SessionStartHookInput,
  UserPromptSubmitHookInput,
  StopHookInput,
  PreToolUseHookInput,
  PostToolUseHookInput,
} from "@anthropic-ai/claude-agent-sdk";
```

### Hook Output Types
```typescript
import type {
  SyncHookJSONOutput,
  SessionStartHookSpecificOutput,
  UserPromptSubmitHookSpecificOutput,
  PreToolUseHookSpecificOutput,
  PostToolUseHookSpecificOutput,
} from "@anthropic-ai/claude-agent-sdk";
```

### Tool Names
Common built-in tools: `Bash`, `Read`, `Edit`, `Write`, `Glob`, `Grep`, `Task`, `WebFetch`, `WebSearch`

## Testing

```bash
# Install locally
claude plugin install . --scope local

# Start a session to test
claude

# Uninstall when done testing
claude plugin uninstall session-hooks-template
```
