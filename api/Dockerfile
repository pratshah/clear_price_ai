FROM node:22-alpine AS builder
WORKDIR /app

# Copy workspace configuration and shared tsconfig
COPY package.json package-lock.json tsconfig.base.json ./
COPY api/package.json ./api/
COPY agents/package.json ./agents/

# Install dependencies
RUN npm ci

# Copy source code of workspaces
COPY api/src ./api/src
COPY api/tsconfig.json ./api/
COPY agents/src ./agents/src
COPY agents/tsconfig.json ./agents/

# Build the workspaces
RUN npm run build --workspace=@clearprice/agents
RUN npm run build --workspace=@clearprice/api

# Production Stage
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/api/package.json ./api/
COPY --from=builder /app/api/dist ./api/dist
COPY --from=builder /app/agents ./agents
ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "start", "--workspace=@clearprice/api"]
