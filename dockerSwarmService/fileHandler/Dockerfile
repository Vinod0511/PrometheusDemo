FROM node:12.13.1-alpine3.9

#Docker build should be run with project's root folder (vod-orchestrator) as context
# Copy and Install common modules
WORKDIR /app
COPY ./queue/package.json ./queue/package.json
COPY ./fileHandler/package.json ./fileHandler/package.json

WORKDIR /app/queue
RUN npm install --production
WORKDIR /app/fileHandler
RUN npm install --production


WORKDIR /app
COPY ./queue ./queue
COPY ./fileHandler ./fileHandler
WORKDIR /app/fileHandler
CMD node index.js
