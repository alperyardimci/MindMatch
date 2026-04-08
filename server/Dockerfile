FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src/ src/
COPY tsconfig.json .
EXPOSE 8080
ENV PORT=8080
CMD ["npx", "tsx", "src/index.ts"]
