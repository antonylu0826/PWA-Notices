FROM node:20-alpine

WORKDIR /app

# Install build tools for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/

# Ensure data directory exists (volume will mount here)
RUN mkdir -p data

EXPOSE 3001

CMD ["node", "src/app.js"]
