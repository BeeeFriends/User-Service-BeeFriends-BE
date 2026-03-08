FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run user:prisma:generate
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/apps/user-service/apps/user-service/src/main"]
