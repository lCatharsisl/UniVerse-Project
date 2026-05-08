FROM node:20.19.0-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20.19.0-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY data ./data

RUN mkdir -p uploads logs data && chown -R node:node /app
USER node

EXPOSE 3000
CMD ["node", "dist/server.js"]
