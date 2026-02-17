FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY src/ ./src/
ENV PORT=3100
EXPOSE 3100
CMD ["node", "src/index.js"]
