ARG BUILD_IMAGE=node:22-bookworm-slim

# Build stage — compiles TypeScript
FROM $BUILD_IMAGE AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Deps stage — runtime dependencies only
FROM $BUILD_IMAGE AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Runtime — distroless, non-root, only the compiled output
FROM gcr.io/distroless/nodejs22-debian13:nonroot
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
EXPOSE 3006

CMD ["dist/server.js"]