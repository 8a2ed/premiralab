FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm install
COPY . .
RUN npm run build

# ─── Runtime (lean image) ─────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies (excludes tsx, typescript, etc.)
COPY --from=build /app/package.json          ./package.json
COPY --from=build /app/server/package.json   ./server/package.json
COPY --from=build /app/server/dist           ./server/dist
COPY --from=build /app/client/dist           ./client/dist

RUN npm ci --workspace=server --omit=dev && npm cache clean --force

# Persistent data & uploads directories
RUN mkdir -p /app/server/data /app/server/uploads

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

# Run as non-root user
USER node

CMD ["node", "server/dist/index.js"]
