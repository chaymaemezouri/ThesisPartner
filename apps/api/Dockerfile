FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
ENV DATABASE_URL=postgresql://thesispartner:thesispartner@localhost:5432/thesispartner?schema=public
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/validation/package.json packages/validation/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/config/package.json packages/config/package.json
COPY apps ./apps
COPY packages ./packages
RUN npm ci
RUN npm run build -w @thesispartner/types
RUN npm run build -w @thesispartner/validation
RUN npm run build -w @thesispartner/api
RUN npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 3000
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy --schema apps/api/prisma/schema.prisma && node apps/api/dist/main.js"]
