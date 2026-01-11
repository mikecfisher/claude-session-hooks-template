#!/usr/bin/env bun
/**
 * STOP HOOK
 * ==========
 * This hook fires when Claude attempts to stop/complete the conversation.
 *
 * USE CASES:
 * - Block stopping until certain conditions are met (e.g., tests pass)
 * - Require verification or confirmation before completion
 * - Implement "gates" that must be passed before finishing
 * - Add final reminders or checklists before completion
 * - Enforce quality checks before allowing task completion
 * - Limit the number of times stopping can be blocked (safety valve)
 *
 * INPUT (via stdin as JSON):
 * - session_id: string - Unique identifier for this session
 * - transcript_path: string - Path to the conversation transcript file
 * - cwd: string - Current working directory
 * - permission_mode?: string - The permission mode (default, acceptEdits, etc.)
 * - hook_event_name: "Stop"
 * - stop_hook_active: boolean - True if another hook already blocked this stop
 *
 * OUTPUT (JSON to stdout):
 * - decision?: "block" | "approve" | undefined - Whether to block or allow stopping
 * - reason?: string - If blocking, the message shown to Claude explaining why
 * - continue?: boolean - Whether to continue processing
 *
 * IMPORTANT:
 * - Always check stop_hook_active to prevent infinite blocking loops
 * - Implement a safety valve (max denials) to ensure the agent can eventually stop
 * - Use state management to track denial counts across stop attempts
 */

import type {
  StopHookInput,
  SyncHookJSONOutput,
} from "@anthropic-ai/claude-agent-sdk";

// Optional: Import your custom state management
// import { getState, updateState, clearState } from '../src/state';

// Safety valve: Maximum times we can block stopping before allowing it anyway
const MAX_STOP_DENIALS = 3;

// =============================================================================
// MAIN HOOK LOGIC
// =============================================================================

async function main() {
  // Read input from stdin
  const inputText = await Bun.stdin.text();
  const input: StopHookInput = JSON.parse(inputText);

  // Extract useful information from the input
  const { session_id, stop_hook_active } = input;

  // ---------------------------------------------------------------------------
  // SAFETY CHECK: Prevent infinite blocking loops
  // ---------------------------------------------------------------------------
  // If another hook already blocked this stop attempt, allow it to prevent
  // infinite loops where multiple hooks keep blocking each other.
  if (stop_hook_active) {
    console.error(
      `[Stop] Another hook already blocked stop, allowing through`
    );
    const output: SyncHookJSONOutput = { decision: undefined };
    console.log(JSON.stringify(output));
    return;
  }

  // ---------------------------------------------------------------------------
  // YOUR LOGIC HERE
  // ---------------------------------------------------------------------------
  // This is where you implement your stop-blocking behavior.
  // Examples:
  //
  // 1. Check session state for conditions:
  //    const state = await getState(session_id);
  //    if (state?.requiresVerification && !state.verified) {
  //      return blockStop('Please verify your changes before completing.');
  //    }
  //
  // 2. Check if tests passed:
  //    const state = await getState(session_id);
  //    if (state?.testsRequired && !state.testsPassed) {
  //      return blockStop('Tests must pass before completing. Run the tests.');
  //    }
  //
  // 3. Implement a denial counter with safety valve:
  //    const state = await getState(session_id) || { denialCount: 0 };
  //    if (state.shouldBlock && state.denialCount < MAX_STOP_DENIALS) {
  //      state.denialCount++;
  //      await saveState(state);
  //      return blockStop(`Verification required (${state.denialCount}/${MAX_STOP_DENIALS})`);
  //    }
  //    // Safety valve reached - allow stop
  //    await clearState(session_id);
  //
  // 4. Check for incomplete tasks:
  //    const state = await getState(session_id);
  //    const incompleteTasks = state?.tasks?.filter(t => !t.completed);
  //    if (incompleteTasks?.length > 0) {
  //      return blockStop(`${incompleteTasks.length} tasks still incomplete.`);
  //    }
  // ---------------------------------------------------------------------------

  // Example: Allow stop by default (replace with your logic)
  console.error(`[Stop] Stop attempt in session ${session_id} - allowing`);

  // To ALLOW stopping:
  const output: SyncHookJSONOutput = {
    decision: undefined, // undefined = don't interfere, allow stop
  };

  // To BLOCK stopping, uncomment and modify:
  // const output: SyncHookJSONOutput = {
  //   decision: 'block',
  //   reason: `STOP BLOCKED
  //
  // Your reason for blocking goes here.
  //
  // **What needs to be done:**
  // - Item 1
  // - Item 2
  // - Item 3
  //
  // Complete these items before attempting to stop again.`,
  // };

  // Write output to stdout
  console.log(JSON.stringify(output));
}

main().catch((error) => {
  console.error("[Stop] Error:", error);
  // On error, allow stopping to prevent getting stuck
  console.log(JSON.stringify({ decision: undefined }));
  process.exit(1);
});
