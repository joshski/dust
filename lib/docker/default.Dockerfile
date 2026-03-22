FROM oven/bun:1
RUN apt-get update && apt-get install -y git nodejs npm && rm -rf /var/lib/apt/lists/*
RUN npm install -g @anthropic-ai/claude-code @openai/codex
RUN useradd -m -s /bin/bash user
USER user
WORKDIR /workspace
