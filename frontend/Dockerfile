FROM node:22-bookworm-slim

WORKDIR /app

RUN npm config set strict-ssl false

COPY package.json package-lock.json ./

RUN npm ci --no-audit --no-fund

RUN npm install @next/swc-linux-x64-gnu --no-audit --no-fund

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]