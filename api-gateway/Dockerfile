# use the official node 18 image with alpine linux as base image
FROM node:18-alpine

WORKDIR /use/src/app

COPY package*.json ./

RUN npm ci --only=production

EXPOSE 3000

CMD ["node", "src/server.js"]