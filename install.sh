#!/usr/bin/env bash
# MarketerClaw installer  v2.2
# Usage:
#   ./install.sh               → installs to ~/.openclaw/skills/ + ~/.openclaw/scripts/
#   ./install.sh --claude      → installs to ~/.claude/skills/   (Claude Code)
#   ./install.sh --hermes      → installs to ~/.hermes/skills/   (Hermes Agent)
#   ./install.sh /path/to/ws   → installs to /path/to/ws/skills/ + /path/to/ws/scripts/
#   ./install.sh --local       → installs to ./skills/ + ./scripts/ (current workspace)
#
# Works both from a checkout (./install.sh) and piped (curl … | bash). When
# piped there is no script file on disk, so the source is downloaded from
# MC_TARBALL_URL (default: main branch tarball on GitHub).

set -euo pipefail

MC_TARBALL_URL="${MC_TARBALL_URL:-https://codeload.github.com/Eleven1111/MarketerClaw/tar.gz/refs/heads/main}"

# Resolve source: a real checkout next to this script, or a fresh download.
# ${BASH_SOURCE[0]} is empty when the script is read from stdin, so a piped
# run never mistakes the caller's cwd (which may hold an older install) for
# the source.
SCRIPT_PATH="${BASH_SOURCE[0]:-}"
REPO_DIR=""
if [[ -n "$SCRIPT_PATH" && -f "$SCRIPT_PATH" ]]; then
  candidate="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
  if [[ -f "$candidate/skills/mc-cmo/SKILL.md" && -d "$candidate/scripts" ]]; then
    REPO_DIR="$candidate"
  fi
fi

if [[ -z "$REPO_DIR" ]]; then
  if ! command -v curl &>/dev/null || ! command -v tar &>/dev/null; then
    echo "  ✖ curl and tar are required to download MarketerClaw" >&2
    exit 1
  fi
  DOWNLOAD_DIR="$(mktemp -d)"
  trap 'rm -rf "$DOWNLOAD_DIR"' EXIT
  echo "  ⬇  Downloading MarketerClaw from $MC_TARBALL_URL"
  if ! curl -fsSL "$MC_TARBALL_URL" | tar -xz -C "$DOWNLOAD_DIR" --strip-components=1; then
    echo "  ✖ Download failed: $MC_TARBALL_URL" >&2
    exit 1
  fi
  if [[ ! -f "$DOWNLOAD_DIR/skills/mc-cmo/SKILL.md" ]]; then
    echo "  ✖ Downloaded archive does not look like MarketerClaw (skills/mc-cmo missing)" >&2
    exit 1
  fi
  REPO_DIR="$DOWNLOAD_DIR"
fi

SKILLS_SRC="$REPO_DIR/skills"
SCRIPTS_SRC="$REPO_DIR/scripts"

# Resolve target
case "${1:-}" in
  --local)  BASE_DIR="$(pwd)" ;;
  --claude) BASE_DIR="$HOME/.claude" ;;
  --hermes) BASE_DIR="$HOME/.hermes" ;;
  "")       BASE_DIR="$HOME/.openclaw" ;;
  *)        BASE_DIR="${1}" ;;
esac

TARGET_DIR="$BASE_DIR/skills"
SCRIPTS_DST="$BASE_DIR/scripts"

# Installing a checkout onto itself (e.g. ./install.sh --local from the repo
# root) would rm -rf each skill before copying it from the same path.
mkdir -p "$TARGET_DIR"
if [[ "$(cd "$SKILLS_SRC" && pwd -P)" == "$(cd "$TARGET_DIR" && pwd -P)" ]]; then
  echo "  ✓ Source and target are the same directory ($TARGET_DIR) — already installed in place, nothing to do."
  exit 0
fi

# Skills to install (all mc-* by default, or pass skill names as extra args)
if [[ $# -gt 1 ]]; then
  SKILLS=("${@:2}")
else
  SKILLS=()
  for dir in "$SKILLS_SRC"/mc-*/; do
    SKILLS+=("$(basename "$dir")")
  done
fi

for skill in "${SKILLS[@]}"; do
  if [[ ! "$skill" =~ ^mc-[a-z0-9-]+$ ]]; then
    echo "  ✖ Invalid skill name '$skill' (expected mc-<name>)" >&2
    exit 1
  fi
done

echo ""
echo "  MarketerClaw Installer v2.2"
echo "  ─────────────────────────────────────"
echo "  Source skills  : $SKILLS_SRC"
echo "  Source scripts : $SCRIPTS_SRC"
echo "  Target skills  : $TARGET_DIR"
echo "  Target scripts : $SCRIPTS_DST"
echo "  Skills         : ${SKILLS[*]}"
echo "  ─────────────────────────────────────"
echo ""

installed=0
for skill in "${SKILLS[@]}"; do
  src="$SKILLS_SRC/$skill"
  dst="$TARGET_DIR/$skill"

  if [[ ! -d "$src" ]]; then
    echo "  ⚠  Skipping '$skill' (not found in $SKILLS_SRC)"
    continue
  fi

  # Copy first, swap second: a failed copy never leaves the old skill deleted.
  rm -rf "$dst.mc-new"
  cp -R "$src" "$dst.mc-new"
  rm -rf "$dst"
  mv "$dst.mc-new" "$dst"
  echo "  ✅ $skill → $dst"
  installed=$((installed + 1))
done

# Install scripts/ alongside skills/ so mc-cmo can find them
if [[ -d "$SCRIPTS_SRC" ]]; then
  mkdir -p "$SCRIPTS_DST"
  cp -R "$SCRIPTS_SRC/." "$SCRIPTS_DST/"
  echo "  ✅ scripts → $SCRIPTS_DST"
else
  echo "  ⚠  scripts/ not found in repo — skipping (mc-cmo may not work)"
fi

# Seed the brand memory. Skills read memory/brand-memory.md relative to the
# workspace, so this only applies to --local; an existing file is never touched.
MEMORY_SEED="$REPO_DIR/memory/brand-memory.md"
if [[ "${1:-}" == "--local" && -f "$MEMORY_SEED" ]]; then
  if [[ -e "$BASE_DIR/memory/brand-memory.md" ]]; then
    echo "  ✓ memory/brand-memory.md already exists — left as is"
  else
    mkdir -p "$BASE_DIR/memory"
    cp "$MEMORY_SEED" "$BASE_DIR/memory/brand-memory.md"
    echo "  ✅ brand memory seed → $BASE_DIR/memory/brand-memory.md"
  fi
fi

echo ""
echo "  Installed $installed skill(s) to $TARGET_DIR"
echo "  Scripts installed to $SCRIPTS_DST"
echo ""
echo "  Usage in OpenClaw:"
echo "    新品上市，产品是轻养零糖茶，目标人群 25-35 岁都市白领..."
echo "    We're launching a DTC skincare brand in the US market..."
echo ""
