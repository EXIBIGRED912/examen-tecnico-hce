FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/shell/package.json ./apps/shell/package.json
COPY apps/operations/package.json ./apps/operations/package.json
RUN --mount=type=cache,id=hce-frontend-npm,target=/root/.npm npm ci --prefer-offline --no-audit --no-fund

FROM dependencies AS build
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} NEXT_TELEMETRY_DISABLED=1
COPY . .

FROM build AS operations-build
RUN npm run build:operations

FROM build AS shell-build
ARG OPERATIONS_ORIGIN=http://frontend-operations:3000
ENV OPERATIONS_ORIGIN=${OPERATIONS_ORIGIN}
RUN npm run build:shell

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
USER node
EXPOSE 3000

FROM runtime AS operations
COPY --from=operations-build --chown=node:node /app/apps/operations/.next/standalone ./
COPY --from=operations-build --chown=node:node /app/apps/operations/.next/static ./apps/operations/.next/static
CMD ["node", "apps/operations/server.js"]

FROM runtime AS shell
COPY --from=shell-build --chown=node:node /app/apps/shell/.next/standalone ./
COPY --from=shell-build --chown=node:node /app/apps/shell/.next/static ./apps/shell/.next/static
CMD ["node", "apps/shell/server.js"]
