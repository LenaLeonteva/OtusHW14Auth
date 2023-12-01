FROM node:18-slim

ENV HOST=0.0.0.0
ENV PORT=8000

USER node

RUN mkdir -p /home/node/app
WORKDIR /home/node/app

COPY --chown=node package*.json ./

RUN npm install

COPY --chown=node . .

RUN npm run build

EXPOSE ${PORT}
CMD [ "node", "." ]
