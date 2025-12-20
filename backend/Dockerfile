FROM node:18.19
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 8080
CMD ["node", "src/index.js"]
