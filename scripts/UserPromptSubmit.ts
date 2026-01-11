#!/usr/bin/env bun
/**
 * USER PROMPT SUBMIT HOOK
 * ========================
 * This hook fires every time the user submits a prompt to Claude.
 *
 * USE CASES:
 * - Analyze user prompts for keywords/patterns
 * - Inject additional context or instructions based on the prompt
 * - Track prompt history for the session
 * - Modify or enhance the prompt before Claude sees it
 * - Implement prompt filtering or validation
 * - Trigger external actions based on prompt content
 *
 * INPUT (via stdin as JSON):
 * - session_id: string - Unique identifier for this session
 * - transcript_path: string - Path to the conversation transcript file
 * - cwd: string - Current working directory
 * - permission_mode?: string - The permission mode (default, acceptEdits, etc.)
 * - hook_event_name: "UserPromptSubmit"
 * - prompt: string - The user's prompt text
 *
 * OUTPUT (JSON to stdout):
 * - hookSpecificOutput.additionalContext?: string - Context to inject (appears after prompt)
 * - continue?: boolean - Whether to continue processing (default: true)
 * - stopReason?: string - If continue is false, why we're stopping
 *
 * TIPS:
 * - Use additionalContext to inject XML-tagged instructions
 * - Context is visible to Claude but not shown to the user
 * - You can save state to a temp file to persist across prompts
 * - Use stderr (console.error) for logging, stdout for the JSON output
 */

import type {
  UserPromptSubmitHookInput,
  UserPromptSubmitHookSpecificOutput,
  SyncHookJSONOutput,
} from "@anthropic-ai/claude-agent-sdk";

// Optional: Import your custom state management
// import { getState, saveState } from '../src/state';

// =============================================================================
// MAIN HOOK LOGIC
// =============================================================================

async function main() {
  // Read input from stdin
  const inputText = await Bun.stdin.text();
  const input: UserPromptSubmitHookInput = JSON.parse(inputText);

  // Extract useful information from the input
  const { session_id, cwd, prompt } = input;

  // Array to collect context messages to inject
  const contextMessages: string[] = [];

  // ---------------------------------------------------------------------------
  // YOUR LOGIC HERE
  // ---------------------------------------------------------------------------
  // This is where you implement your prompt analysis/modification behavior.
  // Examples:
  //
  // 1. Detect keywords and inject context:
  //    if (prompt.toLowerCase().includes('deploy')) {
  //      contextMessages.push('<deployment-warning>Remember to run tests first!</deployment-warning>');
  //    }
  //
  // 2. Track prompt for session state:
  //    const state = await getState(session_id) || { prompts: [] };
  //    state.prompts.push({ text: prompt, timestamp: Date.now() });
  //    await saveState(state);
  //
  // 3. Analyze prompt length/complexity:
  //    const wordCount = prompt.split(/\s+/).length;
  //    if (wordCount > 100) {
  //      contextMessages.push('<long-prompt>This is a detailed request.</long-prompt>');
  //    }
  //
  // 4. Inject project-specific context:
  //    const projectConfig = await loadProjectConfig(cwd);
  //    if (projectConfig.guidelines) {
  //      contextMessages.push(`<project-guidelines>${projectConfig.guidelines}</project-guidelines>`);
  //    }
  // ---------------------------------------------------------------------------

  // Example: Log prompt receipt (replace with your logic)
  console.error(
    `[UserPromptSubmit] Received prompt (${prompt.length} chars) in session ${session_id}`
  );

  // Build the output
  const hookSpecificOutput: UserPromptSubmitHookSpecificOutput = {
    hookEventName: "UserPromptSubmit",
    // Inject collected context (if any)
    additionalContext:
      contextMessages.length > 0 ? contextMessages.join("\n") : undefined,
  };

  const output: SyncHookJSONOutput = {
    continue: true, // Set to false to block the prompt
    hookSpecificOutput,
  };

  // Write output to stdout
  console.log(JSON.stringify(output));
}

main().catch((error) => {
  console.error("[UserPromptSubmit] Error:", error);
  // On error, output a minimal valid response to not break the session
  console.log(JSON.stringify({ continue: true }));
  process.exit(1);
});
