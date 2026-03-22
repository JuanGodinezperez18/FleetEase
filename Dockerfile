# Dockerfile - ULTRA OPTIMIZADO
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Instalar solo dependencias de producción
FROM base AS deps  
COPY package.json package-lock.json ./
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Build optimizado
FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# Runtime mínimo (imagen final ~50MB vs ~200MB)
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Solo archivos necesarios para ejecutar
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
