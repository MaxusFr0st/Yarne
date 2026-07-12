FROM node:20-alpine AS build
WORKDIR /app

# Vite bakes VITE_* at image build time — declare every var used in the app.
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_APPLE_CLIENT_ID
ARG VITE_APPLE_REDIRECT_URI
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ENV VITE_APPLE_CLIENT_ID=${VITE_APPLE_CLIENT_ID}
ENV VITE_APPLE_REDIRECT_URI=${VITE_APPLE_REDIRECT_URI}

COPY package.json package-lock.json ./
RUN npm install --include=dev

COPY . .
RUN node ./node_modules/vite/bin/vite.js build && node scripts/generate-serve-headers.mjs

FROM node:20-alpine AS runtime
WORKDIR /app

RUN npm install -g serve
COPY --from=build /app/dist ./dist
COPY scripts/generate-serve-headers.mjs ./scripts/generate-serve-headers.mjs
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
RUN chmod +x ./scripts/docker-entrypoint.sh

EXPOSE 8080
CMD ["./scripts/docker-entrypoint.sh"]
