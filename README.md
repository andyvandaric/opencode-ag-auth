# opencode-antigravity-auth

[![npm version](https://img.shields.io/npm/v/opencode-antigravity-auth.svg)](https://www.npmjs.com/package/opencode-antigravity-auth)
[![npm beta](https://img.shields.io/npm/v/opencode-antigravity-auth/beta.svg?label=beta)](https://www.npmjs.com/package/opencode-antigravity-auth)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

OpenCode plugin for Google Antigravity OAuth authentication.

## Features

- **Dual Quota System** - Access both Antigravity quota (Claude, Gemini 3) and Gemini CLI quota from a single plugin
- **Multi-Account Rotation** - Add multiple Google accounts; automatically rotates when one is rate-limited
- **Plugin Compatible** - Works alongside other OpenCode plugins (opencodesync, etc.)
- **Extended Thinking** - Native support for Claude thinking budgets and Gemini 3 thinking levels
- **Auto Recovery** - Automatic session recovery from Claude tool_result_missing errors

## Installation

```bash
npm install opencode-antigravity-auth
```

Add to your OpenCode config (`~/.config/opencode/opencode.json`):

```json
{
  "plugins": ["opencode-antigravity-auth@latest"],
  "provider": "google",
  "model": "google/antigravity-gemini-3-flash"
}
```

On first run, a browser window opens for Google OAuth. Tokens are stored securely and refresh automatically.

<details>
<summary>Installation Guide for LLM Agents</summary>

### Step-by-Step Instructions

1. Edit the OpenCode configuration file:
   - Linux/Mac: `~/.config/opencode/opencode.json`
   - Windows: `%APPDATA%\opencode\opencode.json`

2. Add the plugin to the `plugins` array

3. Set `provider` to `"google"` and choose a model

### Complete Configuration Example

Create `~/.config/opencode/antigravity.json`
```jsonc
{
  // JSON Schema for IDE autocompletion
  "$schema": "https://raw.githubusercontent.com/anthropics/opencode-antigravity-auth/main/assets/antigravity.schema.json",

  // === General ===
  "quiet_mode": false,           // Suppress toast notifications (except recovery)
  "debug": false,                // Enable debug logging to file
  "log_dir": "/custom/log/path", // Custom debug log directory (optional)
  "auto_update": true,           // Auto-update plugin

  // === Thinking Blocks ===
  "keep_thinking": false,        // Preserve thinking blocks (may cause signature errors)

  // === Session Recovery ===
  "session_recovery": true,      // Auto-recover from tool_result_missing errors
  "auto_resume": true,           // Auto-send "continue" after recovery
  "resume_text": "continue",     // Custom resume prompt text

  // === Empty Response Handling ===
  "empty_response_max_attempts": 4,      // Max retries for empty responses
  "empty_response_retry_delay_ms": 2000, // Delay between retries (ms)

  // === Tool Handling ===
  "tool_id_recovery": true,       // Fix mismatched tool IDs from context compaction
  "claude_tool_hardening": true,  // Prevent Claude tool hallucinations

  // === Token Refresh ===
  "proactive_token_refresh": true,              // Background token refresh
  "proactive_refresh_buffer_seconds": 1800,     // Refresh 30min before expiry
  "proactive_refresh_check_interval_seconds": 300, // Check every 5min

  // === Rate Limiting ===
  "max_rate_limit_wait_seconds": 300, // Max wait time when rate limited (0=unlimited)
  "quota_fallback": false,            // Try alternate quota when rate limited

  // === Signature Cache (for keep_thinking=true) ===
  "signature_cache": {
    "enabled": true,
    "memory_ttl_seconds": 3600,      // 1 hour in-memory
    "disk_ttl_seconds": 172800,      // 48 hours on disk
    "write_interval_seconds": 60     // Background write interval
  }
}
```

Create `~/.config/opencode/opencode.json`
```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-antigravity-auth@latest"
  ],
  "provider": {
    "google": {
      "models": {
        "antigravity-gemini-3-pro-low": {
          "name": "Gemini 3 Pro Low (Antigravity)",
          "limit": { "context": 1048576, "output": 65535 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "antigravity-gemini-3-pro-high": {
          "name": "Gemini 3 Pro High (Antigravity)",
          "limit": { "context": 1048576, "output": 65535 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "antigravity-gemini-3-flash": {
          "name": "Gemini 3 Flash (Antigravity)",
          "limit": { "context": 1048576, "output": 65536 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "antigravity-claude-sonnet-4-5": {
          "name": "Claude Sonnet 4.5 (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "antigravity-claude-sonnet-4-5-thinking-low": {
          "name": "Claude Sonnet 4.5 Think Low (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "antigravity-claude-sonnet-4-5-thinking-medium": {
          "name": "Claude Sonnet 4.5 Think Medium (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "antigravity-claude-sonnet-4-5-thinking-high": {
          "name": "Claude Sonnet 4.5 Think High (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "antigravity-claude-opus-4-5-thinking-low": {
          "name": "Claude Opus 4.5 Think Low (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "antigravity-claude-opus-4-5-thinking-medium": {
          "name": "Claude Opus 4.5 Think Medium (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "antigravity-claude-opus-4-5-thinking-high": {
          "name": "Claude Opus 4.5 Think High (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        }
      }
    }
  }
}
```

### Beta Versions

For the latest development features, check the [dev branch README](https://github.com/anthropics/opencode-antigravity-auth/tree/dev) for beta installation instructions.

</details>

## Available Models

### Antigravity Quota

Models with `antigravity-` prefix use Antigravity quota:

| Model | Description |
|-------|-------------|
| `google/antigravity-gemini-3-flash` | Gemini 3 Flash (minimal thinking) |
| `google/antigravity-gemini-3-pro-low` | Gemini 3 Pro with low thinking |
| `google/antigravity-gemini-3-pro-high` | Gemini 3 Pro with high thinking |
| `google/antigravity-claude-sonnet-4-5` | Claude Sonnet 4.5 (no thinking) |
| `google/antigravity-claude-sonnet-4-5-thinking-low` | Sonnet with 8K thinking budget |
| `google/antigravity-claude-sonnet-4-5-thinking-medium` | Sonnet with 16K thinking budget |
| `google/antigravity-claude-sonnet-4-5-thinking-high` | Sonnet with 32K thinking budget |
| `google/antigravity-claude-opus-4-5-thinking-low` | Opus with 8K thinking budget |
| `google/antigravity-claude-opus-4-5-thinking-medium` | Opus with 16K thinking budget |
| `google/antigravity-claude-opus-4-5-thinking-high` | Opus with 32K thinking budget |

### Gemini CLI Quota

Models without `antigravity-` prefix use Gemini CLI quota:

| Model | Description |
|-------|-------------|
| `google/gemini-2.5-flash` | Gemini 2.5 Flash |
| `google/gemini-2.5-pro` | Gemini 2.5 Pro |
| `google/gemini-3-flash` | Gemini 3 Flash |
| `google/gemini-3-pro-low` | Gemini 3 Pro with low thinking |
| `google/gemini-3-pro-high` | Gemini 3 Pro with high thinking |

<details>
<summary>Full models configuration</summary>

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-antigravity-auth@latest"
  ],
  "provider": {
    "google": {
      "models": {
        "antigravity-gemini-3-pro-low": {
          "name": "Gemini 3 Pro Low (Antigravity)",
          "limit": { "context": 1048576, "output": 65535 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "antigravity-gemini-3-pro-high": {
          "name": "Gemini 3 Pro High (Antigravity)",
          "limit": { "context": 1048576, "output": 65535 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "antigravity-gemini-3-flash": {
          "name": "Gemini 3 Flash (Antigravity)",
          "limit": { "context": 1048576, "output": 65536 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "antigravity-claude-sonnet-4-5": {
          "name": "Claude Sonnet 4.5 (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "antigravity-claude-sonnet-4-5-thinking-low": {
          "name": "Claude Sonnet 4.5 Think Low (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "antigravity-claude-sonnet-4-5-thinking-medium": {
          "name": "Claude Sonnet 4.5 Think Medium (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "antigravity-claude-sonnet-4-5-thinking-high": {
          "name": "Claude Sonnet 4.5 Think High (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "antigravity-claude-opus-4-5-thinking-low": {
          "name": "Claude Opus 4.5 Think Low (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "antigravity-claude-opus-4-5-thinking-medium": {
          "name": "Claude Opus 4.5 Think Medium (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        },
        "antigravity-claude-opus-4-5-thinking-high": {
          "name": "Claude Opus 4.5 Think High (Antigravity)",
          "limit": { "context": 200000, "output": 64000 },
          "modalities": { "input": ["text", "image", "pdf"], "output": ["text"] }
        }
      }
    }
  }
}
```
</details>

## Configuration


### Environment Overrides

```bash
OPENCODE_ANTIGRAVITY_QUIET=1         # quiet_mode
OPENCODE_ANTIGRAVITY_DEBUG=1         # debug
OPENCODE_ANTIGRAVITY_LOG_DIR=/path   # log_dir
OPENCODE_ANTIGRAVITY_KEEP_THINKING=1 # keep_thinking
```

<details>
<summary>Create `~/.config/opencode/antigravity.json` (or `.opencode/antigravity.json` in project root):</summary>

```jsonc
{
  // JSON Schema for IDE autocompletion
  "$schema": "https://raw.githubusercontent.com/anthropics/opencode-antigravity-auth/main/assets/antigravity.schema.json",

  // === General ===
  "quiet_mode": false,           // Suppress toast notifications (except recovery)
  "debug": false,                // Enable debug logging to file
  "log_dir": "/custom/log/path", // Custom debug log directory (optional)
  "auto_update": true,           // Auto-update plugin

  // === Thinking Blocks ===
  "keep_thinking": false,        // Preserve thinking blocks (may cause signature errors)

  // === Session Recovery ===
  "session_recovery": true,      // Auto-recover from tool_result_missing errors
  "auto_resume": true,           // Auto-send "continue" after recovery
  "resume_text": "continue",     // Custom resume prompt text

  // === Empty Response Handling ===
  "empty_response_max_attempts": 4,      // Max retries for empty responses
  "empty_response_retry_delay_ms": 2000, // Delay between retries (ms)

  // === Tool Handling ===
  "tool_id_recovery": true,       // Fix mismatched tool IDs from context compaction
  "claude_tool_hardening": true,  // Prevent Claude tool hallucinations

  // === Token Refresh ===
  "proactive_token_refresh": true,              // Background token refresh
  "proactive_refresh_buffer_seconds": 1800,     // Refresh 30min before expiry
  "proactive_refresh_check_interval_seconds": 300, // Check every 5min

  // === Rate Limiting ===
  "max_rate_limit_wait_seconds": 300, // Max wait time when rate limited (0=unlimited)
  "quota_fallback": false,            // Try alternate quota when rate limited

  // === Signature Cache (for keep_thinking=true) ===
  "signature_cache": {
    "enabled": true,
    "memory_ttl_seconds": 3600,      // 1 hour in-memory
    "disk_ttl_seconds": 172800,      // 48 hours on disk
    "write_interval_seconds": 60     // Background write interval
  }
}
```

</details>

## Multi-Account Setup

Add multiple Google accounts for higher combined quotas. The plugin automatically rotates between accounts when one is rate-limited.

```bash
# Add accounts
opencode auth login
```

## Compatible Plugins

This plugin works alongside other OpenCode plugins. Some important notes:

### Plugin Ordering

If using `@tarquinen/opencode-dcp` (Dynamic Context Protocol), **our plugin must be listed first**:

```json
{
  "plugins": [
    "opencode-antigravity-auth@latest",
    "@tarquinen/opencode-dcp@1.1.2"
  ]
}
```

### Plugins You Don't Need

- **gemini-auth plugins** - Not needed. This plugin handles all Google OAuth authentication.

### Rate Limit Considerations

- **oh-my-opencode** - This plugin may make background API calls that consume your quota. If you're hitting rate limits unexpectedly, check if oh-my-opencode is making requests.

## Migration Guide (v1.2.7+)

<details>
<summary>If upgrading from v1.2.6 or earlier, follow these steps:</summary>

### Step 1: Clear Old Tokens

```bash
rm -rf ~/.config/opencode/antigravity-tokens/
```

### Step 2: Update opencode.json

Replace your old config with:

```json
{
  "plugins": ["opencode-antigravity-auth@latest"],
  "provider": "google",
  "model": "google/antigravity-gemini-3-flash"
}
```

### Step 3: Create antigravity.json (Optional)

If you had custom settings, migrate them to `~/.config/opencode/antigravity.json`:

```json
{
  "$schema": "https://raw.githubusercontent.com/anthropics/opencode-antigravity-auth/main/assets/antigravity.schema.json",
  "quiet_mode": false,
  "debug": false
}
```

### Step 4: Re-authenticate

Run OpenCode once. A browser window will open for Google OAuth:

```bash
opencode
```

### Breaking Changes

| Old (v1.2.6) | New (v1.2.7+) |
|--------------|---------------|
| `OPENCODE_ANTIGRAVITY_*` env vars | `~/.config/opencode/antigravity.json` |
| `gemini-3-pro` | `google/antigravity-gemini-3-pro-low` |
| `claude-sonnet-4-5` | `google/antigravity-claude-sonnet-4-5` |

</details>

## E2E Testing

The plugin includes regression tests for stability verification. Tests consume API quota.

```bash
# Sanity tests (7 tests, ~5 min)
npx tsx script/test-regression.ts --sanity

# Heavy tests (4 tests, ~30 min) - stress testing with 8-50 turn conversations
npx tsx script/test-regression.ts --heavy

# Concurrent tests (3 tests) - rate limit handling with 5-10 parallel requests
npx tsx script/test-regression.ts --category concurrency

# Run specific test
npx tsx script/test-regression.ts --test thinking-tool-use

# List tests without running
npx tsx script/test-regression.ts --dry-run
```

## Debugging

Enable debug logging:

```bash
# Via environment
OPENCODE_ANTIGRAVITY_DEBUG=1 opencode

# Via config
echo '{"debug": true}' > ~/.config/opencode/antigravity.json
```

Logs are written to `~/.config/opencode/antigravity-logs/` (or `log_dir` if configured).

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - Plugin internals and request flow
- [API Spec](docs/ANTIGRAVITY_API_SPEC.md) - Antigravity API reference

## License

MIT
