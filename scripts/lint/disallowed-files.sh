disallowed=(
  "package-lock.json|This project uses bun — use bun.lock instead"
  "bun.lockb|This project uses bun — use bun.lock instead of the binary lockfile"
)

found=()
for entry in "${disallowed[@]}"; do
  pattern="${entry%%|*}"
  reason="${entry#*|}"
  while IFS= read -r file; do
    found+=("$file ($reason)")
  done < <(git ls-files -- "$pattern")
done

if [ ${#found[@]} -gt 0 ]; then
  echo "✗ Found disallowed files:"
  for file in "${found[@]}"; do
    echo "  $file"
  done
  exit 1
else
  echo "✓ No disallowed files"
fi
