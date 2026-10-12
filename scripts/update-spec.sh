#!/usr/bin/env bash
# Re-download the Porkbun OpenAPI spec and regenerate the collection from it.
# Review the result with `git diff` before committing.
set -euo pipefail

SPEC_URL="https://porkbun.com/api/json/v3/spec"
SPEC_FILE="postman/specs/porkbun-openapi.json"
COLLECTION_NAME="Porkbun API v3"
COLLECTION_DIR="postman/collections/${COLLECTION_NAME}"

cd "$(dirname "$0")/.."

command -v postman >/dev/null || { echo "postman CLI not found: npm install -g postman-cli" >&2; exit 1; }
[ -d node_modules/yaml ] || npm install --no-audit --no-fund

echo "Downloading ${SPEC_URL}"
curl -fsSL "$SPEC_URL" | node -e '
  let raw = "";
  process.stdin.on("data", (c) => (raw += c)).on("end", () => {
    const spec = JSON.parse(raw);
    require("fs").writeFileSync(process.argv[1], JSON.stringify(spec, null, 2) + "\n");
    console.log(`Spec version ${spec.info.version}`);
  });
' "$SPEC_FILE"

# Regenerate from scratch so endpoints removed upstream don't linger.
rm -rf "$COLLECTION_DIR"
postman spec generate collection "$SPEC_FILE" -n "$COLLECTION_NAME" --folder-strategy Tags
node scripts/postprocess-collection.mjs "$COLLECTION_NAME"
postman collection lint "$COLLECTION_DIR"
node scripts/export-v2.mjs "$COLLECTION_NAME"

echo "Done. Review changes with: git status && git diff --stat"
