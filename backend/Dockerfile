FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Expose app port
EXPOSE 5000

# Run server
CMD ["node", "server.js"]
