# DevSphere frontend — React + Vite.
#   dev:  docker compose up                 (Vite dev server with hot reload, source mounted)
#   prod: docker build --target prod .      (static build served by nginx; or deploy dist/ to Vercel)

# glibc-based image: Vite 8's native toolchain (Rolldown, lightningcss) segfaults on Alpine/musl.
FROM node:24-slim AS deps
WORKDIR /app
RUN chown node:node /app
# Install as the unprivileged user so the dev server can write its cache (node_modules/.vite).
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
FROM deps AS dev
COPY --chown=node:node . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# ---------------------------------------------------------------------------
FROM deps AS build
COPY --chown=node:node . .
# Public, build-time only. Keep it "/api" when nginx proxies the API on the same domain (compose.prod.yaml),
# or set the full API URL when the frontend and API live on different domains.
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
