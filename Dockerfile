# Backend Express para Cloud Run.
# Frontend (Cloudflare Pages) e desacoplado e nao entra nesse container.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY server ./server

# Cloud Run injeta a porta via $PORT (default 8080)
EXPOSE 8080

# Roda como user nao-root
USER node

CMD ["node", "server/src/index.js"]
