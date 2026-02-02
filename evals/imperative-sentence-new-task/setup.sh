#!/bin/bash
# Setup script for imperative-sentence-new-task eval
# Creates an isolated test directory with a minimal dust project

set -e

# Initialize git repo (required for dust)
git init --quiet

# Create .dust directory structure
mkdir -p .dust/tasks .dust/goals .dust/ideas .dust/facts

# Create a minimal CLAUDE.md that references dust using the absolute path
cat > CLAUDE.md << EOF
# Claude Code Instructions

This project uses dust for planning and documentation.

Always immediately run \`$DUST_BIN agent\` when you start working in this repository.
EOF

# Create a bin/dust wrapper that calls the actual dust binary
mkdir -p bin
cat > bin/dust << EOF
#!/bin/bash
exec "$DUST_BIN" "\$@"
EOF
chmod +x bin/dust

echo "Test directory setup complete at $TEST_DIR"
