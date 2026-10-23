#!/usr/bin/env bash
# Regenerate the compiled Tailwind CSS from scripts/tailwind-input.css and the
# classes used in the HTML entry points and src/. The output is committed and
# versioned by Tailwind release, so the Netlify build never runs Tailwind: it
# only bundles the file with Vite. Re-run this whenever Tailwind classes change
# or the design system in scripts/ds/ is replaced.
#
# The Tailwind CLI is pinned in the root package.json and package-lock.json, so
# `npm ci` installs exactly the version named below.
#
# Fonts are not vendored: tokens/fonts.css points at static.joseli.to, which
# sends `access-control-allow-origin: *` and caches immutably. A declared face
# costs no download until some text actually uses it.
#
# Usage: ./scripts/build-css.sh           rebuild the file
#        ./scripts/build-css.sh --check   fail if the committed file is stale
set -euo pipefail

TAILWIND_VERSION="4.3.3"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
OUTPUT="${ROOT_DIR}/src/assets/tailwind-${TAILWIND_VERSION}.css"
TAILWIND="${ROOT_DIR}/node_modules/.bin/tailwindcss"

[ -x "${TAILWIND}" ] || { echo "Tailwind CLI missing; run npm install" >&2; exit 1; }

installed="$(node -p "require('${ROOT_DIR}/node_modules/tailwindcss/package.json').version")"
[ "${installed}" = "${TAILWIND_VERSION}" ] || {
  echo "Installed Tailwind is ${installed}, expected ${TAILWIND_VERSION}" >&2
  exit 1
}

if [ "${1:-}" = "--check" ]; then
  fresh="$(mktemp -t tailwind).css"
  trap 'rm -f "${fresh}"' EXIT
  "${TAILWIND}" -i "${SCRIPT_DIR}/tailwind-input.css" -o "${fresh}" --minify 2>/dev/null
  cmp -s "${fresh}" "${OUTPUT}" || {
    echo "src/assets/tailwind-${TAILWIND_VERSION}.css is stale; run ./scripts/build-css.sh" >&2
    exit 1
  }
  echo "Compiled CSS is up to date"
  exit 0
fi

mkdir -p "$(dirname "${OUTPUT}")"
"${TAILWIND}" -i "${SCRIPT_DIR}/tailwind-input.css" -o "${OUTPUT}" --minify
echo "Built ${OUTPUT} ($(wc -c < "${OUTPUT}" | tr -d ' ') bytes)"
echo "Reminder: src/main.ts and 404.html must reference tailwind-${TAILWIND_VERSION}.css"
