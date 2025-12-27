#!/usr/bin/env npx tsx
import { spawn } from "child_process";

type Category = "thinking-order" | "tool-pairing" | "multi-tool";

interface MultiTurnTest {
  name: string;
  model: string;
  category: Category;
  turns: string[];
  errorPatterns: string[];
  timeout: number;
}

interface TestResult {
  success: boolean;
  error?: string;
  duration: number;
  turnsCompleted: number;
}

const ERROR_PATTERNS = [
  "thinking block order",
  "Expected thinking or redacted_thinking",
  "tool_use ids were found without tool_result",
  "tool_result_missing",
  "thinking_disabled_violation",
  "orphaned tool_use",
  "must start with thinking block",
  "error: tool_use without matching tool_result",
  "cannot be modified",
  "must remain as they were",
];

const TESTS: MultiTurnTest[] = [
  // Issue #50: Thinking block order bug - simple single-turn tool use
  {
    name: "thinking-tool-use",
    model: "google/antigravity-claude-sonnet-4-5-thinking-low",
    category: "thinking-order",
    turns: [
      "Read package.json and tell me the package name",
    ],
    errorPatterns: ERROR_PATTERNS,
    timeout: 90000,
  },
  {
    name: "thinking-bash-tool",
    model: "google/antigravity-claude-sonnet-4-5-thinking-low",
    category: "thinking-order",
    turns: [
      "Run: echo 'hello' and tell me the output",
    ],
    errorPatterns: ERROR_PATTERNS,
    timeout: 90000,
  },

  // Tool pairing - simple two-turn
  {
    name: "tool-pairing-sequential",
    model: "google/antigravity-claude-sonnet-4-5-thinking-low",
    category: "tool-pairing",
    turns: [
      "Run: echo 'first'",
      "Run: echo 'second'",
    ],
    errorPatterns: ERROR_PATTERNS,
    timeout: 120000,
  },

  // Opus model basic test
  {
    name: "opus-thinking-basic",
    model: "google/antigravity-claude-opus-4-5-thinking-low",
    category: "thinking-order",
    turns: [
      "What is 7 * 8? Use bash to verify: echo $((7*8))",
    ],
    errorPatterns: ERROR_PATTERNS,
    timeout: 120000,
  },

  // Bug: "thinking blocks in latest assistant message cannot be modified"
  // Tests multi-turn with thinking blocks to verify they're preserved unchanged
  {
    name: "thinking-modification-continue",
    model: "google/antigravity-claude-sonnet-4-5-thinking-low",
    category: "thinking-order",
    turns: [
      "Read package.json and tell me the version",
      "Now read tsconfig.json and tell me the target",
      "Compare the two files briefly",
    ],
    errorPatterns: ERROR_PATTERNS,
    timeout: 120000,
  },
];

async function runTurn(
  prompt: string,
  model: string,
  sessionId: string | null,
  sessionTitle: string,
  timeout: number
): Promise<{ output: string; stderr: string; code: number; sessionId: string | null }> {
  return new Promise((resolve) => {
    const args = sessionId
      ? ["run", prompt, "--session", sessionId, "--model", model]
      : ["run", prompt, "--model", model, "--title", sessionTitle];

    const proc = spawn("opencode", args, {
      stdio: ["ignore", "pipe", "pipe"],
      timeout,
      cwd: process.cwd(),
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    const timeoutId = setTimeout(() => {
      proc.kill("SIGTERM");
    }, timeout);

    proc.on("close", (code) => {
      clearTimeout(timeoutId);

      let extractedSessionId = sessionId;
      if (!extractedSessionId) {
        const match = stdout.match(/session[:\s]+([a-zA-Z0-9_-]+)/i) ||
                      stderr.match(/session[:\s]+([a-zA-Z0-9_-]+)/i);
        if (match) {
          extractedSessionId = match[1] ?? null;
        }
      }

      resolve({
        output: stdout,
        stderr: stderr,
        code: code ?? 1,
        sessionId: extractedSessionId,
      });
    });

    proc.on("error", (err) => {
      clearTimeout(timeoutId);
      resolve({
        output: "",
        stderr: err.message,
        code: 1,
        sessionId: null,
      });
    });
  });
}

async function runMultiTurnTest(test: MultiTurnTest): Promise<TestResult> {
  const start = Date.now();
  let sessionId: string | null = null;
  let turnsCompleted = 0;

  for (let index = 0; index < test.turns.length; index++) {
    const prompt = test.turns[index]!;
    const turnStart = Date.now();
    const result = await runTurn(
      prompt,
      test.model,
      sessionId ?? null,
      `regression-${test.name}`,
      test.timeout
    );

    const combined = result.output + result.stderr;

    for (const pattern of test.errorPatterns) {
      if (combined.toLowerCase().includes(pattern.toLowerCase())) {
        return {
          success: false,
          error: `Turn ${index + 1}: Found error pattern "${pattern}"`,
          duration: Date.now() - start,
          turnsCompleted,
        };
      }
    }

    if (result.code !== 0 && result.code !== null) {
      const isTimeout = Date.now() - turnStart >= test.timeout - 1000;
      if (isTimeout) {
        return {
          success: false,
          error: `Turn ${index + 1}: Timeout after ${test.timeout}ms`,
          duration: Date.now() - start,
          turnsCompleted,
        };
      }
    }

    sessionId = result.sessionId;
    turnsCompleted++;
  }

  return {
    success: true,
    duration: Date.now() - start,
    turnsCompleted,
  };
}

function parseArgs(): {
  filterName: string | null;
  filterCategory: Category | null;
  dryRun: boolean;
  help: boolean;
} {
  const args = process.argv.slice(2);
  const getArg = (flag: string): string | null => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] !== undefined ? args[idx + 1]! : null;
  };
  return {
    filterName: getArg("--test") ?? getArg("--name"),
    filterCategory: getArg("--category") as Category | null,
    dryRun: args.includes("--dry-run"),
    help: args.includes("--help") || args.includes("-h"),
  };
}

function showHelp(): void {
  console.log(`
Multi-Turn Regression Test Suite for Antigravity Plugin

Tests for known bugs:
  - Issue #50: Thinking block order errors
  - Tool pairing: tool_use without tool_result
  - Multi-tool: Complex tool chains

Usage:
  npx tsx script/test-regression.ts [options]

Options:
  --test <name>         Run specific test by name
  --category <cat>      Run tests by category (thinking-order|tool-pairing|multi-tool)
  --dry-run             List tests without running
  --help, -h            Show this help

Examples:
  npx tsx script/test-regression.ts --dry-run
  npx tsx script/test-regression.ts --category thinking-order
  npx tsx script/test-regression.ts --test thinking-tool-use-basic
`);
}

async function main(): Promise<void> {
  const { filterName, filterCategory, dryRun, help } = parseArgs();

  if (help) {
    showHelp();
    return;
  }

  let tests = TESTS;
  if (filterName) {
    tests = tests.filter((t) => t.name === filterName);
  }
  if (filterCategory) {
    tests = tests.filter((t) => t.category === filterCategory);
  }

  if (tests.length === 0) {
    console.error("No tests match the specified filters");
    process.exit(1);
  }

  console.log(`\n🧪 Multi-Turn Regression Tests (${tests.length} tests)\n${"=".repeat(55)}\n`);

  if (dryRun) {
    console.log("Tests to run:\n");
    for (const test of tests) {
      console.log(`  ${test.name}`);
      console.log(`    Model: ${test.model}`);
      console.log(`    Category: ${test.category}`);
      console.log(`    Turns: ${test.turns.length}`);
      console.log();
    }
    return;
  }

  const results: { test: MultiTurnTest; result: TestResult }[] = [];

  for (const test of tests) {
    console.log(`Testing: ${test.name}`);
    console.log(`  Model: ${test.model}`);
    console.log(`  Turns: ${test.turns.length}`);
    process.stdout.write("  Status: ");

    const result = await runMultiTurnTest(test);
    results.push({ test, result });

    if (result.success) {
      console.log(`✅ PASS (${result.turnsCompleted}/${test.turns.length} turns, ${(result.duration / 1000).toFixed(1)}s)`);
    } else {
      console.log(`❌ FAIL`);
      console.log(`    Error: ${result.error}`);
      console.log(`    Completed: ${result.turnsCompleted}/${test.turns.length} turns`);
    }
    console.log();
  }

  const passed = results.filter((r) => r.result.success).length;
  const failed = results.filter((r) => !r.result.success).length;

  console.log("=".repeat(55));
  console.log(`\nSummary: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.log("Failed tests:");
    for (const r of results.filter((r) => !r.result.success)) {
      console.log(`  ❌ ${r.test.name}: ${r.result.error}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
