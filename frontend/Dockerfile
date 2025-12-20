FROM node:18.19
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
ENV HOST=0.0.0.0
CMD ["npm", "start"]
