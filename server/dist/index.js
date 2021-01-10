"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const socket_io_1 = __importDefault(require("socket.io"));
const app = express_1.default();
const server = http_1.default.createServer(app);
app.use(cors_1.default());
let receiverPCs;
let senderPCs;
let users;
let socketToRoom;
const pc_config = {
    "iceServers": [
        // {
        //   urls: 'stun:[STUN_IP]:[PORT]',
        //   'credentials': '[YOR CREDENTIALS]',
        //   'username': '[USERNAME]'
        // },
        {
            urls: 'stun:stun.l.google.com:19302'
        }
    ]
};
const createReceiverPeerConnection = (socketID, socket) => {
    let pc = new RTCPeerConnection(pc_config);
    receiverPCs = Object.assign(Object.assign({}, receiverPCs), { [socketID]: pc });
    pc.onicecandidate = (e) => {
        console.log(`socketID: ${socketID}'s receiverPeerConnection icecandidate`);
        socket.to(socketID).emit('SFUReceiverCandidate', {
            candidate: e.candidate
        });
    };
    pc.oniceconnectionstatechange = (e) => {
        console.log(e);
    };
    pc.ontrack = (e) => {
        let roomID = socketToRoom[socketID];
        if (users[roomID]) {
            let usersInRoom = users[roomID];
            usersInRoom.push({
                id: socketID,
                stream: e.streams[0]
            });
        }
        else {
            users[roomID] = {
                id: socketID,
                stream: e.streams[0]
            };
        }
    };
    pc.close = () => {
        console.log(`socketID: ${socketID}'s receiverPeerConnection closed`);
    };
    return pc;
};
const createSenderPeerConnection = (socketID) => {
};
const io = socket_io_1.default.listen(server);
io.sockets.on('connection', (socket) => {
    socket.on('senderOffer', (data) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            let pc = createReceiverPeerConnection(data.offerSendID, socket);
            yield pc.setRemoteDescription(data.sdp);
            console.log(`receive socketID(${data.offerSendID})'s offer`);
            let sdp = yield pc.createAnswer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
            console.log(`send answer to socketID(${data.offerSendID})`);
            socket.to(data.offerSendID).emit('getSenderAnswer', { sdp });
        }
        catch (error) {
            console.log(error);
        }
    }));
    socket.on('senderCandidate', (data) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            let pc = receiverPCs[data.candidateSendID];
            console.log(`receive socketID(${data.candidateSendID})'s candidate`);
            yield pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            console.log(`add socketID(${data.candidateSendID})'s candidate success`);
        }
        catch (error) {
            console.log(error);
        }
    }));
});
server.listen(8080, () => {
    console.log('server running on 8080');
});
