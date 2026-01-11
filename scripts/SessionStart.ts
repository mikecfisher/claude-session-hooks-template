#!/usr/bin/env bun
/**
 * SESSION START HOOK
 * ===================
 * This hook fires when a Claude Code session begins.
 *
 * USE CASES:
 * - Initialize session state (create temp files, set up logging)
 * - Load configuration or context from external sources
 * - Inject initial context/instructions into the conversation
 * - Set up environment for the session
 * - Track session metrics or analytics
 *
 * INPUT (via stdin as JSON):
 * - session_id: string - Unique identifier for this session
 * - transcript_path: string - Path to the conversation transcript file
 * - cwd: string - Current working directory
 * - permission_mode?: string - The permission mode (default, acceptEdits, etc.)
 * - hook_event_name: "SessionStart"
 * - source: "startup" | "resume" | "clear" | "compact" - Why session started
 * - agent_type?: string - Type of agent if this is a subagent
 *
 * OUTPUT (JSON to stdout):
 * - hookSpecificOutput.additionalContext?: string - Context to inject
 * - continue?: boolean - Whether to continue (default: true)
 * - stopReason?: string - If continue is false, why we're stopping
 */

import type {
  SessionStartHookInput,
  SessionStartHookSpecificOutput,
  SyncHookJSONOutput,
} from "@anthropic-ai/claude-agent-sdk";

// =============================================================================
// MAIN HOOK LOGIC
// =============================================================================

async function main() {
  // Read input from stdin
  const inputText = await Bun.stdin.text();
  const input: SessionStartHookInput = JSON.parse(inputText);

  // Extract useful information from the input
  const { session_id, cwd, source, agent_type, transcript_path } = input;

  // ---------------------------------------------------------------------------
  // YOUR LOGIC HERE
  // ---------------------------------------------------------------------------
  // This is where you implement your session start behavior.
  // Examples:
  //
  // 1. Initialize state:
  //    await saveState({ sessionId: session_id, startedAt: Date.now() });
  //
  // 2. Load project configuration:
  //    const config = await loadProjectConfig(cwd);
  //
  // 3. Set up logging:
  //    await initializeSessionLog(session_id);
  //
  // 4. Inject context based on source:
  //    if (source === 'resume') {
  //      additionalContext = '<resumed-session>Welcome back!</resumed-session>';
  //    }
  // ---------------------------------------------------------------------------

  // Example: Log session start (replace with your logic)
  console.error(
    `[SessionStart] Session ${session_id} started (source: ${source})`
  );

  // Build the output
  // Set additionalContext to inject information into the conversation
  const hookSpecificOutput: SessionStartHookSpecificOutput = {
    hookEventName: "SessionStart",
    // Uncomment to inject context into the conversation:
    // additionalContext: `<session-context>
    //   Session ID: ${session_id}
    //   Working Directory: ${cwd}
    //   Started From: ${source}
    // </session-context>`,
  };

  const output: SyncHookJSONOutput = {
    continue: true, // Set to false to block the session from starting
    hookSpecificOutput,
  };

  // Write output to stdout
  console.log(JSON.stringify(output));
}

main().catch((error) => {
  console.error("[SessionStart] Error:", error);
  // On error, output a minimal valid response to not break the session
  console.log(JSON.stringify({ continue: true }));
  process.exit(1);
});
