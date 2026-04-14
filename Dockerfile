FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY server.js ./
COPY server/ ./server/
COPY public/ ./public/

RUN mkdir -p /app/output && chown -R node:node /app/output

ENV NODE_ENV=production

EXPOSE 3000

USER node

CMD ["node", "server.js"]