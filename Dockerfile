FROM node:20

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY server/package.json /usr/src/app/

RUN npm install

COPY . /usr/src/app/
COPY server/wait-for-it.sh /usr/src/app/wait-for-it.sh

EXPOSE 3000

CMD ["./wait-for-it.sh", "postgres:5432", "--", "node", "server/index.js"]