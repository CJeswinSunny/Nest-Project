FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy project files
COPY . .

# Create necessary directories
RUN mkdir -p uploads db

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
