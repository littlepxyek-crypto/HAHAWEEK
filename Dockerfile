FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY bin ./bin
COPY src ./src
COPY scripts ./scripts
COPY docs ./docs
RUN mkdir -p /app/data /app/docs/runtime && chown -R node:node /app
USER node
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=20s --start-period=20s --retries=3 CMD node src/health.js
# Long-running loop: health -> ingestion pass -> sleep. A non-retryable
# (BLOCKED/UNKNOWN) state stops cycling instead of restart-looping.
CMD ["node", "src/runner.js"]
