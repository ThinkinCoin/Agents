FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package.json .
RUN npm install --production

# Copy source
COPY . .

# Build (if TypeScript present)
RUN npm run build --if-present || true

CMD ["node", "dist/index.js"]
