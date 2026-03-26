#!/bin/bash
SKILL_DIR="$1"
TITLE="$2"
if [ -z "$SKILL_DIR" ] || [ -z "$TITLE" ]; then
  echo "ERROR: Usage: ./upload_skill.sh <skill-folder-path> <display-title>"
  exit 1
fi
FOLDER_NAME=$(basename "$SKILL_DIR")
FILE_ARGS=""
while IFS= read -r -d '' file; do
  REL_PATH="$FOLDER_NAME/$(realpath --relative-to="$SKILL_DIR" "$file")"
  FILE_ARGS="$FILE_ARGS -F \"files[]=@${file};filename=${REL_PATH}\""
done < <(find "$SKILL_DIR" -type f -print0)
eval curl -s -X POST "https://api.anthropic.com/v1/skills" \
  -H "\"x-api-key: $API_KEY\"" \
  -H "\"anthropic-version: 2023-06-01\"" \
  -H "\"anthropic-beta: skills-2025-10-02\"" \
  -F "\"display_title=$TITLE\"" \
  $FILE_ARGS
