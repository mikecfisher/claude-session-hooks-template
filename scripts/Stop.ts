#!/usr/bin/env bun
/**
 * QUALITY GATE STOP HOOK
 * ======================
 * This hook blocks Claude from stopping until quality gates pass.
 *
 * WORKFLOW:
 * 1. Check if stop_hook_active → allow (prevent infinite loops)
 * 2. Check safety valve (denialCount >= MAX) → allow (prevent stuck sessions)
 * 3. Check git status for changed files → if none, allow
 * 4. Run quality gates sequentially: typecheck, lint, knip, test
 * 5. If any fail → block and return errors for Claude to fix
 * 6. If all pass → allow stop
 *
 * QUALITY GATES (run in order, stop on first failure):
 * - bun run typecheck
 * - bun run lint
 * - bun run knip
 * - bun run test
 */

import type {
  StopHookInput,
  SyncHookJSONOutput,
} from "@anthropic-ai/claude-agent-sdk";
import { getState, saveState, type StopHookState } from "../src/state";

// Safety valve: Maximum times we can block stopping before allowing it anyway
const MAX_STOP_DENIALS = 5;

// Quality gate commands to run (in order)
const QUALITY_GATES = [
  { name: "typecheck", command: "bun", args: ["run", "typecheck"] },
  { name: "lint", command: "bun", args: ["run", "lint"] },
  { name: "knip", command: "bun", args: ["run", "knip"] },
  { name: "test", command: "bun", args: ["run", "test"] },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get list of changed files from git status.
 * Returns empty array if no changes or not in a git repo.
 */
async function getChangedFiles(): Promise<string[]> {
  try {
    const proc = Bun.spawn(["git", "status", "--porcelain"], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const output = await new Response(proc.stdout).text();
    await proc.exited;

    if (proc.exitCode !== 0) {
      console.error("[Stop] Not in a git repository or git error");
      return [];
    }

    // Parse git status output
    // Format: XY filename (where X=staged, Y=unstaged status)
    const files = output
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        // Handle renamed files: "R  old -> new"
        const match = line.match(/^..\s+(.+?)(?:\s+->\s+(.+))?$/);
        return match ? match[2] || match[1] : line.slice(3);
      })
      .filter((file): file is string => file !== undefined);

    return files;
  } catch (error) {
    console.error("[Stop] Error getting changed files:", error);
    return [];
  }
}

/**
 * Check if a script exists in package.json.
 */
async function scriptExists(scriptName: string): Promise<boolean> {
  try {
    const packageJson = Bun.file("package.json");
    if (!(await packageJson.exists())) {
      return false;
    }
    const content = await packageJson.json();
    return !!content.scripts?.[scriptName];
  } catch {
    return false;
  }
}

interface QualityGateResult {
  name: string;
  passed: boolean;
  output: string;
  skipped?: boolean;
}

/**
 * Run a single quality gate command.
 */
async function runQualityGate(gate: {
  name: string;
  command: string;
  args: string[];
}): Promise<QualityGateResult> {
  // Check if the script exists in package.json
  const scriptName = gate.args[gate.args.length - 1] ?? gate.name;
  if (!(await scriptExists(scriptName))) {
    console.error(`[Stop] Skipping ${gate.name}: script not found`);
    return { name: gate.name, passed: true, output: "", skipped: true };
  }

  try {
    console.error(`[Stop] Running ${gate.name}...`);

    const proc = Bun.spawn([gate.command, ...gate.args], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    await proc.exited;

    const output = [stdout, stderr].filter(Boolean).join("\n").trim();
    const passed = proc.exitCode === 0;

    console.error(`[Stop] ${gate.name}: ${passed ? "PASSED" : "FAILED"}`);

    return { name: gate.name, passed, output };
  } catch (error) {
    console.error(`[Stop] Error running ${gate.name}:`, error);
    return {
      name: gate.name,
      passed: false,
      output: `Error running ${gate.name}: ${error}`,
    };
  }
}

/**
 * Run all quality gates sequentially, stopping on first failure.
 */
async function runQualityGates(): Promise<QualityGateResult | null> {
  for (const gate of QUALITY_GATES) {
    const result = await runQualityGate(gate);
    if (!result.passed && !result.skipped) {
      return result;
    }
  }
  return null; // All passed
}

/**
 * Create a block response with the given reason.
 */
function blockStop(reason: string): SyncHookJSONOutput {
  return {
    decision: "block",
    reason,
  };
}

/**
 * Create an allow response.
 */
function allowStop(): SyncHookJSONOutput {
  return {
    decision: undefined,
  };
}

// =============================================================================
// MAIN HOOK LOGIC
// =============================================================================

async function main() {
  // Read input from stdin
  const inputText = await Bun.stdin.text();
  const input: StopHookInput = JSON.parse(inputText);

  const { session_id, stop_hook_active } = input;

  // ---------------------------------------------------------------------------
  // 1. Check stop_hook_active to prevent infinite blocking loops
  // ---------------------------------------------------------------------------
  if (stop_hook_active) {
    console.error(`[Stop] Another hook already blocked stop, allowing through`);
    console.log(JSON.stringify(allowStop()));
    return;
  }

  // ---------------------------------------------------------------------------
  // 2. Check safety valve (denialCount >= MAX)
  // ---------------------------------------------------------------------------
  const state = await getState<StopHookState>(session_id);
  const denialCount = state?.denialCount ?? 0;

  if (denialCount >= MAX_STOP_DENIALS) {
    console.error(
      `[Stop] Safety valve triggered (${denialCount}/${MAX_STOP_DENIALS}), allowing stop`
    );
    console.log(JSON.stringify(allowStop()));
    return;
  }

  // ---------------------------------------------------------------------------
  // 3. Check git status for changed files
  // ---------------------------------------------------------------------------
  const changedFiles = await getChangedFiles();

  if (changedFiles.length === 0) {
    console.error(`[Stop] No changed files detected, allowing stop`);
    console.log(JSON.stringify(allowStop()));
    return;
  }

  console.error(`[Stop] Detected ${changedFiles.length} changed file(s)`);

  // ---------------------------------------------------------------------------
  // 4. Run quality gates
  // ---------------------------------------------------------------------------
  const failedGate = await runQualityGates();

  // ---------------------------------------------------------------------------
  // 5. If any fail → block and return errors
  // ---------------------------------------------------------------------------
  if (failedGate) {
    // Increment denial count
    const newDenialCount = denialCount + 1;
    await saveState<StopHookState>(session_id, {
      sessionId: session_id,
      denialCount: newDenialCount,
    });

    console.error(
      `[Stop] Quality gate failed: ${failedGate.name} (denial ${newDenialCount}/${MAX_STOP_DENIALS})`
    );

    // Truncate output if too long
    const maxOutputLength = 2000;
    let output = failedGate.output;
    if (output.length > maxOutputLength) {
      output = output.slice(0, maxOutputLength) + "\n... (output truncated)";
    }

    const reason = `## Quality Gate Failed: ${failedGate.name}

The \`${failedGate.name}\` check failed. Please fix the errors below before completing.

**Attempt ${newDenialCount}/${MAX_STOP_DENIALS}** (will auto-allow after ${MAX_STOP_DENIALS} attempts)

### Errors:
\`\`\`
${output}
\`\`\`

**Changed files:**
${changedFiles.map((f) => `- ${f}`).join("\n")}

Please fix these issues and try again.`;

    console.log(JSON.stringify(blockStop(reason)));
    return;
  }

  // ---------------------------------------------------------------------------
  // 6. If all pass → allow stop
  // ---------------------------------------------------------------------------
  console.error(`[Stop] All quality gates passed, allowing stop`);
  console.log(JSON.stringify(allowStop()));
}

main().catch((error) => {
  console.error("[Stop] Error:", error);
  // On error, allow stopping to prevent getting stuck
  console.log(JSON.stringify({ decision: undefined }));
  process.exit(1);
});
