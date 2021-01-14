# Typescript-ReactJS-WebRTC-1-N-SFU

## Features
- 1:N communication (SFU server)
- React with Typescript
- Node.js as a MediaServer(SFU server)
- Docker

## How to start

### 1. Docker version
```sh
# server use 8080 port
# web use 3000 port
# You can connect to http://localhost:3000
cd Typescript-ReactJS-WebRTC-1-N-SFU
docker-compose up -d
```

### 2. Non-Docker version(Node.js and React.js)
You need to install Node.js
```sh
cd Typescript-ReactJS-WebRTC-1-N-SFU
npm install
node server.js
cd web
npm install
npm start
```

### Previous Upload was... 
- 1:N (peer to peer) WebRTC https://github.com/Seung3837/Typescript-ReactJS-WebRTC-1-N-P2P
