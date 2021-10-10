FROM node:alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ENV PATH /usr/src/app/node_modules/.bin:$PATH

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build
RUN npm install -g serve -y

EXPOSE 5000
CMD [ "npx", "serve", "-s", "build" ]
