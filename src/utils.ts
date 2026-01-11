/**
 * UTILITY FUNCTIONS
 * ==================
 * Common utilities for hook scripts.
 *
 * These helpers handle common patterns like:
 * - Reading hook input from stdin
 * - Writing hook output to stdout
 * - Logging to stderr (visible in Claude Code logs but not output)
 * - Text analysis utilities
 */

import type {
  HookInput,
  SyncHookJSONOutput,
  PreToolUseHookSpecificOutput,
  PostToolUseHookSpecificOutput,
  UserPromptSubmitHookSpecificOutput,
  SessionStartHookSpecificOutput,
} from "@anthropic-ai/claude-agent-sdk";

// =============================================================================
// INPUT/OUTPUT HELPERS
// =============================================================================

/**
 * Read and parse hook input from stdin.
 * All hooks receive JSON input via stdin.
 */
export async function readHookInput<T extends HookInput>(): Promise<T> {
  const text = await Bun.stdin.text();
  return JSON.parse(text) as T;
}

/**
 * Write hook output to stdout.
 * All hooks must output valid JSON to stdout.
 */
export function writeHookOutput(output: SyncHookJSONOutput): void {
  console.log(JSON.stringify(output));
}

/**
 * Log a message to stderr (visible in logs, not in output).
 * Use this for debugging - stderr doesn't affect hook behavior.
 */
export function log(prefix: string, message: string): void {
  console.error(`[${prefix}] ${message}`);
}

// =============================================================================
// COMMON OUTPUT BUILDERS
// =============================================================================

/**
 * Build a "continue with no changes" output.
 * Use this when your hook doesn't need to modify anything.
 */
export function continueOutput(): SyncHookJSONOutput {
  return { continue: true };
}

/**
 * Build output that injects additional context.
 * The context appears in the conversation after the triggering event.
 */
export function injectContext(
  hookEventName: string,
  context: string
): SyncHookJSONOutput {
  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName,
      additionalContext: context,
    } as
      | UserPromptSubmitHookSpecificOutput
      | SessionStartHookSpecificOutput
      | PostToolUseHookSpecificOutput,
  };
}

/**
 * Build output for PreToolUse that allows the tool call.
 */
export function allowTool(reason?: string): SyncHookJSONOutput {
  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: reason,
    } as PreToolUseHookSpecificOutput,
  };
}

/**
 * Build output for PreToolUse that denies the tool call.
 */
export function denyTool(reason: string): SyncHookJSONOutput {
  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    } as PreToolUseHookSpecificOutput,
  };
}

/**
 * Build output for Stop hook that blocks stopping.
 */
export function blockStop(reason: string): SyncHookJSONOutput {
  return {
    decision: "block",
    reason,
  };
}

/**
 * Build output for Stop hook that allows stopping.
 */
export function allowStop(): SyncHookJSONOutput {
  return {
    decision: undefined,
  };
}

// =============================================================================
// TEXT ANALYSIS UTILITIES
// =============================================================================

/**
 * Count words in a string.
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Check if text contains any of the given keywords (case-insensitive).
 */
export function containsKeywords(
  text: string,
  keywords: string[]
): { found: boolean; matches: string[] } {
  const lowerText = text.toLowerCase();
  const matches = keywords.filter((kw) => lowerText.includes(kw.toLowerCase()));
  return {
    found: matches.length > 0,
    matches,
  };
}

/**
 * Extract text after a separator (like "---").
 * Useful for prompts that have context followed by instructions.
 */
export function extractAfterSeparator(
  text: string,
  separator = "---"
): { before: string; after: string | null } {
  const separatorIndex = text.lastIndexOf(separator);
  if (separatorIndex === -1) {
    return { before: text, after: null };
  }
  return {
    before: text.slice(0, separatorIndex).trim(),
    after: text.slice(separatorIndex + separator.length).trim(),
  };
}

// =============================================================================
// XML TAG HELPERS
// =============================================================================

/**
 * Wrap content in an XML tag for context injection.
 * Claude recognizes XML-style tags as structured context.
 *
 * @example
 * xmlTag('reminder', 'Remember to run tests')
 * // Returns: '<reminder>Remember to run tests</reminder>'
 */
export function xmlTag(tagName: string, content: string): string {
  return `<${tagName}>${content}</${tagName}>`;
}

/**
 * Wrap content in an XML tag with attributes.
 *
 * @example
 * xmlTagWithAttrs('warning', { level: 'high' }, 'Be careful!')
 * // Returns: '<warning level="high">Be careful!</warning>'
 */
export function xmlTagWithAttrs(
  tagName: string,
  attrs: Record<string, string | number | boolean>,
  content: string
): string {
  const attrString = Object.entries(attrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");
  return `<${tagName} ${attrString}>${content}</${tagName}>`;
}
