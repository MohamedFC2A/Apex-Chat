FROM node:20-alpine

# Install build dependencies for native modules if needed (optional but recommended)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy dependency configs
COPY package*.json ./

# Install dependencies (ignoring scripts/postinstall if any to speed up)
RUN npm ci

# Copy all project source code
COPY . .

# Build both frontend and backend
RUN npm run build

# Expose server port
EXPOSE 5000

# Set production env
ENV NODE_ENV=production

# Start application
CMD ["npm", "start"]
