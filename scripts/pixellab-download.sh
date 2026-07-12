#!/usr/bin/env bash
# Batch-download completed PixelLab assets by ID into public/assets/**.
#
# Usage: scripts/pixellab-download.sh <manifest.tsv>
# Manifest lines (tab-separated), blank lines and #comments ignored:
#   <endpoint>\t<id>\t<dest-path-relative-to-repo>
# endpoint is the PixelLab MCP resource: map-objects | isometric-tiles | objects
#
# Every integrated asset MUST pass through here so filenames are real and the
# bytes actually exist on disk before the manifest references them.
set -u
manifest="${1:?usage: pixellab-download.sh manifest.tsv}"
base="https://api.pixellab.ai/mcp"
ok=0; fail=0
while IFS=$'\t' read -r endpoint id dest; do
  [ -z "${endpoint:-}" ] && continue
  case "$endpoint" in \#*) continue;; esac
  mkdir -p "$(dirname "$dest")"
  code=$(curl -sS -L -o "$dest" -w "%{http_code}" "$base/$endpoint/$id/download")
  if [ "$code" = "200" ] && [ -s "$dest" ]; then
    # verify it is a real PNG
    if head -c 8 "$dest" | grep -q $'\x89PNG'; then
      echo "OK   $dest"
      ok=$((ok+1))
    else
      echo "BAD  $dest (not a PNG, http $code)"
      rm -f "$dest"; fail=$((fail+1))
    fi
  else
    echo "FAIL $dest (http $code)"
    rm -f "$dest"; fail=$((fail+1))
  fi
done < "$manifest"
echo "--- downloaded $ok, failed $fail ---"
