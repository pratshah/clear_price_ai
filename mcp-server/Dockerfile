FROM node:22-alpine AS builder
WORKDIR /app

# Copy workspace configuration and shared tsconfig
COPY package.json package-lock.json tsconfig.base.json ./
COPY mcp-server/package.json ./mcp-server/

# Install dependencies for the workspace
RUN npm ci

# Copy mcp-server source code and tsconfig
COPY mcp-server/src ./mcp-server/src
COPY mcp-server/tsconfig.json ./mcp-server/

# Build the workspace
RUN npm run build --workspace=@clearprice/mcp-server

# Production Stage
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/mcp-server/package.json ./mcp-server/
COPY --from=builder /app/mcp-server/dist ./mcp-server/dist
ENV NODE_ENV=production
CMD ["npm", "start", "--workspace=@clearprice/mcp-server"]
