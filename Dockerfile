FROM node:20

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY server/package.json /usr/src/app/

RUN npm install

COPY . /usr/src/app/

EXPOSE 3000

CMD ["node", "server/index.js"]