#!/usr/bin/env bun
/**
 * POST-TOOL USE HOOK
 * ===================
 * This hook fires AFTER a tool has executed successfully.
 *
 * USE CASES:
 * - Log tool results for auditing/debugging
 * - Inject additional context based on tool results
 * - Track changes made during the session (e.g., files edited)
 * - Trigger side effects after certain tool completions
 * - Auto-commit after file writes
 * - Update session state based on tool results
 * - Notify external systems about tool usage
 *
 * INPUT (via stdin as JSON):
 * - session_id: string - Unique identifier for this session
 * - transcript_path: string - Path to the conversation transcript file
 * - cwd: string - Current working directory
 * - permission_mode?: string - The permission mode (default, acceptEdits, etc.)
 * - hook_event_name: "PostToolUse"
 * - tool_name: string - Name of the tool that was called
 * - tool_input: unknown - The input parameters that were passed
 * - tool_response: unknown - The response/output from the tool
 * - tool_use_id: string - Unique ID for this tool invocation
 *
 * OUTPUT (JSON to stdout):
 * - hookSpecificOutput.additionalContext?: string - Context to inject after the result
 * - hookSpecificOutput.updatedMCPToolOutput?: unknown - Modified output for MCP tools
 * - continue?: boolean - Whether to continue processing (default: true)
 *
 * MATCHING:
 * In hooks.json, use "matcher" to filter which tools trigger this hook:
 * - "*" matches all tools
 * - "Write|Edit" matches Write or Edit operations
 * - "Bash" matches only Bash commands
 */

import type {
  PostToolUseHookInput,
  PostToolUseHookSpecificOutput,
  SyncHookJSONOutput,
} from "@anthropic-ai/claude-agent-sdk";

// =============================================================================
// MAIN HOOK LOGIC
// =============================================================================

async function main() {
  // Read input from stdin
  const inputText = await Bun.stdin.text();
  const input: PostToolUseHookInput = JSON.parse(inputText);

  // Extract useful information from the input
  const { session_id, tool_name, tool_input, tool_response, tool_use_id } =
    input;

  // Array to collect context messages to inject
  const contextMessages: string[] = [];

  // ---------------------------------------------------------------------------
  // YOUR LOGIC HERE
  // ---------------------------------------------------------------------------
  // This is where you implement your post-tool-use behavior.
  // Examples:
  //
  // 1. Track file changes:
  //    if (tool_name === 'Write' || tool_name === 'Edit') {
  //      const filePath = (tool_input as { file_path?: string }).file_path;
  //      const state = await getState(session_id) || { modifiedFiles: [] };
  //      if (filePath && !state.modifiedFiles.includes(filePath)) {
  //        state.modifiedFiles.push(filePath);
  //        await saveState(state);
  //      }
  //    }
  //
  // 2. Auto-commit after writes (example with git):
  //    if (tool_name === 'Write') {
  //      const filePath = (tool_input as { file_path?: string }).file_path;
  //      if (filePath) {
  //        // Note: This is just logging, actual git would need Bash
  //        console.error(`[PostToolUse] Would commit: ${filePath}`);
  //        contextMessages.push(`<auto-tracked>File ${filePath} tracked for commit</auto-tracked>`);
  //      }
  //    }
  //
  // 3. Log tool results:
  //    console.error(`[PostToolUse] ${tool_name} completed (ID: ${tool_use_id})`);
  //    console.error(`[PostToolUse] Result preview: ${JSON.stringify(tool_response).slice(0, 200)}`);
  //
  // 4. Inject reminders after certain tools:
  //    if (tool_name === 'Bash') {
  //      const command = (tool_input as { command?: string }).command || '';
  //      if (command.includes('npm test') || command.includes('bun test')) {
  //        contextMessages.push('<test-reminder>Tests completed. Review any failures.</test-reminder>');
  //      }
  //    }
  //
  // 5. Track test results:
  //    if (tool_name === 'Bash') {
  //      const command = (tool_input as { command?: string }).command || '';
  //      const response = String(tool_response);
  //      if (command.includes('test')) {
  //        const state = await getState(session_id) || {};
  //        state.lastTestResult = response.includes('PASS') ? 'passed' : 'failed';
  //        await saveState(state);
  //      }
  //    }
  // ---------------------------------------------------------------------------

  // Example: Log tool completion (replace with your logic)
  console.error(`[PostToolUse] ${tool_name} completed (ID: ${tool_use_id})`);

  // Build the output
  const hookSpecificOutput: PostToolUseHookSpecificOutput = {
    hookEventName: "PostToolUse",
    // Inject collected context (if any)
    additionalContext:
      contextMessages.length > 0 ? contextMessages.join("\n") : undefined,
    // For MCP tools, you can modify the output:
    // updatedMCPToolOutput: modifiedResponse,
  };

  const output: SyncHookJSONOutput = {
    continue: true,
    hookSpecificOutput,
  };

  // Write output to stdout
  console.log(JSON.stringify(output));
}

main().catch((error) => {
  console.error("[PostToolUse] Error:", error);
  // On error, output a minimal valid response to not break the flow
  console.log(JSON.stringify({ continue: true }));
  process.exit(1);
});
