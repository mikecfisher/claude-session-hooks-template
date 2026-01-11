/**
 * SESSION STATE MANAGEMENT
 * =========================
 * Simple utilities for persisting state across hook invocations.
 *
 * Since hooks run as separate processes, they need a way to share state.
 * This module provides simple file-based state persistence using the
 * system temp directory.
 *
 * USAGE:
 * 1. Define your state interface
 * 2. Use getState/saveState to read/write state
 * 3. Use clearState when the session ends or state should be reset
 *
 * EXAMPLE:
 * ```typescript
 * interface MyState {
 *   sessionId: string;
 *   promptCount: number;
 *   flags: { [key: string]: boolean };
 * }
 *
 * // In your hook:
 * const state = await getState<MyState>(session_id);
 * if (!state) {
 *   await saveState(session_id, { sessionId: session_id, promptCount: 1, flags: {} });
 * } else {
 *   state.promptCount++;
 *   await saveState(session_id, state);
 * }
 * ```
 */

import { tmpdir } from "os";
import { join } from "path";

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Prefix for state files. Change this to match your plugin name.
 */
const STATE_FILE_PREFIX = "session-hooks-template";

// =============================================================================
// STATE MANAGEMENT FUNCTIONS
// =============================================================================

/**
 * Get the file path for a session's state file.
 */
function getStatePath(sessionId: string): string {
  // Sanitize session ID for use in filename
  const safeId = sessionId.replace(/[^a-zA-Z0-9-_]/g, "_");
  return join(tmpdir(), `${STATE_FILE_PREFIX}-${safeId}.json`);
}

/**
 * Retrieve the current state for a session.
 * Returns null if no state exists.
 *
 * @param sessionId - The session ID to retrieve state for
 * @returns The state object or null if not found
 */
export async function getState<T>(sessionId: string): Promise<T | null> {
  const statePath = getStatePath(sessionId);

  try {
    const file = Bun.file(statePath);
    if (!(await file.exists())) {
      return null;
    }
    const content = await file.text();
    return JSON.parse(content) as T;
  } catch (error) {
    // File doesn't exist or is corrupted
    console.error(`[State] Error reading state: ${error}`);
    return null;
  }
}

/**
 * Save state for a session.
 * Uses atomic write (write to temp, then rename) for safety.
 *
 * @param sessionId - The session ID to save state for
 * @param state - The state object to save
 */
export async function saveState<T>(sessionId: string, state: T): Promise<void> {
  const statePath = getStatePath(sessionId);
  const tempPath = `${statePath}.tmp`;

  try {
    // Write to temp file first
    await Bun.write(tempPath, JSON.stringify(state, null, 2));

    // Rename for atomic update
    const fs = await import("fs/promises");
    await fs.rename(tempPath, statePath);
  } catch (error) {
    // Fallback to direct write if rename fails
    console.error(`[State] Atomic write failed, using direct: ${error}`);
    await Bun.write(statePath, JSON.stringify(state, null, 2));
  }
}

/**
 * Update state using a modifier function.
 * Handles the get -> modify -> save pattern atomically.
 *
 * @param sessionId - The session ID to update state for
 * @param updater - Function that receives current state and modifies it
 * @returns The updated state, or null if no state exists
 */
export async function updateState<T>(
  sessionId: string,
  updater: (state: T) => void
): Promise<T | null> {
  const state = await getState<T>(sessionId);
  if (!state) {
    return null;
  }

  updater(state);
  await saveState(sessionId, state);
  return state;
}

/**
 * Clear/delete state for a session.
 *
 * @param sessionId - The session ID to clear state for
 */
export async function clearState(sessionId: string): Promise<void> {
  const statePath = getStatePath(sessionId);

  try {
    const fs = await import("fs/promises");
    await fs.unlink(statePath);
  } catch {
    // Ignore errors (file may not exist)
  }
}

// =============================================================================
// EXAMPLE STATE INTERFACE (customize for your plugin)
// =============================================================================

/**
 * Example state interface - customize this for your plugin's needs.
 *
 * Common fields you might want:
 * - sessionId: Track which session this belongs to
 * - startedAt: When the session started
 * - promptCount: How many prompts have been processed
 * - flags: Boolean flags for various conditions
 * - history: Array of events/actions
 * - denialCount: For stop hooks, track how many times stop was blocked
 */
export interface ExampleSessionState {
  sessionId: string;
  startedAt: number;
  promptCount: number;
  flags: {
    [key: string]: boolean;
  };
  // Add your custom fields here
}

/**
 * Create initial state for a new session.
 */
export function createInitialState(sessionId: string): ExampleSessionState {
  return {
    sessionId,
    startedAt: Date.now(),
    promptCount: 0,
    flags: {},
  };
}
