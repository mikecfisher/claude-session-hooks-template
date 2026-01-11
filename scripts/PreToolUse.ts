#!/usr/bin/env bun
/**
 * PRE-TOOL USE HOOK
 * ==================
 * This hook fires BEFORE a tool is executed.
 *
 * USE CASES:
 * - Validate tool inputs before execution
 * - Block dangerous or unauthorized tool calls
 * - Modify tool inputs before they're passed to the tool
 * - Log all tool usage for auditing
 * - Implement custom permission logic
 * - Add rate limiting or quotas for tool usage
 * - Auto-approve certain safe tool patterns
 *
 * INPUT (via stdin as JSON):
 * - session_id: string - Unique identifier for this session
 * - transcript_path: string - Path to the conversation transcript file
 * - cwd: string - Current working directory
 * - permission_mode?: string - The permission mode (default, acceptEdits, etc.)
 * - hook_event_name: "PreToolUse"
 * - tool_name: string - Name of the tool being called (e.g., "Bash", "Edit", "Read")
 * - tool_input: unknown - The input parameters for the tool
 * - tool_use_id: string - Unique ID for this specific tool invocation
 *
 * OUTPUT (JSON to stdout):
 * - hookSpecificOutput.permissionDecision?: "allow" | "deny" | "ask" - Override permission
 * - hookSpecificOutput.permissionDecisionReason?: string - Explain the decision
 * - hookSpecificOutput.updatedInput?: object - Modified input to use instead
 * - continue?: boolean - Whether to continue processing (default: true)
 *
 * TOOL NAMES (common built-in tools):
 * - Bash: Execute shell commands
 * - Read: Read file contents
 * - Edit: Edit files (find & replace)
 * - Write: Write/create files
 * - Glob: Find files by pattern
 * - Grep: Search file contents
 * - Task: Launch subagents
 * - WebFetch: Fetch web content
 * - WebSearch: Search the web
 *
 * MATCHING:
 * In hooks.json, use "matcher" to filter which tools trigger this hook:
 * - "*" matches all tools
 * - "Bash" matches only Bash
 * - "Edit|Write" matches Edit or Write (regex)
 */

import type {
  PreToolUseHookInput,
  PreToolUseHookSpecificOutput,
  SyncHookJSONOutput,
} from "@anthropic-ai/claude-agent-sdk";

// =============================================================================
// MAIN HOOK LOGIC
// =============================================================================

async function main() {
  // Read input from stdin
  const inputText = await Bun.stdin.text();
  const input: PreToolUseHookInput = JSON.parse(inputText);

  // Extract useful information from the input
  const { session_id, tool_name, tool_input, tool_use_id } = input;

  // ---------------------------------------------------------------------------
  // YOUR LOGIC HERE
  // ---------------------------------------------------------------------------
  // This is where you implement your pre-tool-use behavior.
  // Examples:
  //
  // 1. Block dangerous Bash commands:
  //    if (tool_name === 'Bash') {
  //      const command = (tool_input as { command?: string }).command || '';
  //      if (command.includes('rm -rf /') || command.includes('sudo')) {
  //        return denyTool('Dangerous command blocked');
  //      }
  //    }
  //
  // 2. Auto-approve safe read operations:
  //    if (tool_name === 'Read') {
  //      const filePath = (tool_input as { file_path?: string }).file_path || '';
  //      if (filePath.endsWith('.md') || filePath.endsWith('.txt')) {
  //        return allowTool('Safe file type');
  //      }
  //    }
  //
  // 3. Modify tool input (e.g., add logging to Bash commands):
  //    if (tool_name === 'Bash') {
  //      const originalCommand = (tool_input as { command?: string }).command;
  //      return modifyInput({
  //        ...tool_input,
  //        command: `echo "[LOG] Running: ${originalCommand}" && ${originalCommand}`
  //      });
  //    }
  //
  // 4. Log all tool usage:
  //    console.error(`[PreToolUse] Tool: ${tool_name}, ID: ${tool_use_id}`);
  //    console.error(`[PreToolUse] Input: ${JSON.stringify(tool_input)}`);
  //
  // 5. Implement rate limiting:
  //    const state = await getState(session_id) || { toolCounts: {} };
  //    state.toolCounts[tool_name] = (state.toolCounts[tool_name] || 0) + 1;
  //    if (state.toolCounts[tool_name] > 100) {
  //      return denyTool('Rate limit exceeded for this tool');
  //    }
  //    await saveState(state);
  // ---------------------------------------------------------------------------

  // Example: Log tool usage (replace with your logic)
  console.error(`[PreToolUse] ${tool_name} called (ID: ${tool_use_id})`);

  // Build the output - by default, don't interfere with the tool call
  const hookSpecificOutput: PreToolUseHookSpecificOutput = {
    hookEventName: "PreToolUse",
    // Uncomment to override permission:
    // permissionDecision: 'allow',  // or 'deny' or 'ask'
    // permissionDecisionReason: 'Auto-approved by hook',

    // Uncomment to modify the tool input:
    // updatedInput: { ...tool_input, modified: true },
  };

  const output: SyncHookJSONOutput = {
    continue: true,
    hookSpecificOutput,
  };

  // Write output to stdout
  console.log(JSON.stringify(output));
}

// =============================================================================
// HELPER FUNCTIONS (uncomment and use as needed)
// =============================================================================

// function allowTool(reason: string): void {
//   const output: SyncHookJSONOutput = {
//     continue: true,
//     hookSpecificOutput: {
//       hookEventName: 'PreToolUse',
//       permissionDecision: 'allow',
//       permissionDecisionReason: reason,
//     },
//   };
//   console.log(JSON.stringify(output));
//   process.exit(0);
// }

// function denyTool(reason: string): void {
//   const output: SyncHookJSONOutput = {
//     continue: true,
//     hookSpecificOutput: {
//       hookEventName: 'PreToolUse',
//       permissionDecision: 'deny',
//       permissionDecisionReason: reason,
//     },
//   };
//   console.log(JSON.stringify(output));
//   process.exit(0);
// }

// function modifyInput(newInput: Record<string, unknown>): void {
//   const output: SyncHookJSONOutput = {
//     continue: true,
//     hookSpecificOutput: {
//       hookEventName: 'PreToolUse',
//       updatedInput: newInput,
//     },
//   };
//   console.log(JSON.stringify(output));
//   process.exit(0);
// }

main().catch((error) => {
  console.error("[PreToolUse] Error:", error);
  // On error, output a minimal valid response to not break the tool call
  console.log(JSON.stringify({ continue: true }));
  process.exit(1);
});
