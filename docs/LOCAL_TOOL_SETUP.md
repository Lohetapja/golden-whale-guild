# Local Tool Setup

Golden Whale Guild does not need API keys, accounts, backend services, analytics,
or real payment credentials to run, build, or deploy.

Keep local tool credentials outside the repository:

- Do not commit PixelLab, Codex, Claude, or MCP tokens.
- Do not commit real `Authorization` headers.
- Do not commit `~/.codex/config.toml`, `~/.claude` config, or workspace
  `.codex/` / `.claude/` directories.
- Store local-only values in your operating system secret store or in ignored
  local config files.
- If a token is exposed anywhere, revoke it and generate a new one. Making a
  repository private does not secure a leaked token.

Use `.env.example` only as a placeholder reference. Never copy real values into
tracked docs or examples.
