FROM oven/bun:1
RUN apt-get update && apt-get install -y git nodejs npm curl && rm -rf /var/lib/apt/lists/*
RUN npm install -g @anthropic-ai/claude-code @openai/codex
# Install system libraries required by Playwright browsers (Chromium, Firefox, WebKit)
RUN npx -y playwright install-deps
RUN useradd -m -s /bin/bash user
USER user
WORKDIR /workspace
