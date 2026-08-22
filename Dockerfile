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

RUN npm install --workspace=server --omit=dev --no-audit --no-fund && npm cache clean --force

# Persistent data & uploads directories
RUN mkdir -p /app/data /app/uploads /app/server/data /app/server/uploads

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const p = process.env.PORT || 4000; fetch('http://127.0.0.1:' + p + '/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

CMD ["node", "server/dist/index.js"]
