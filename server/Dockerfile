# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN --mount=type=secret,id=proxy_ca,required=false \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --ignore-scripts
COPY server/tsconfig.json server/tsconfig.build.json ./
COPY server/src ./src
RUN npm run build

FROM node:24-alpine AS runtime
ARG GIT_COMMIT_SHA=unknown
ENV NODE_ENV=production
ENV GIT_COMMIT_SHA=$GIT_COMMIT_SHA
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN --mount=type=secret,id=proxy_ca,required=false \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 8787
STOPSIGNAL SIGTERM
CMD ["node", "dist/index.js"]
