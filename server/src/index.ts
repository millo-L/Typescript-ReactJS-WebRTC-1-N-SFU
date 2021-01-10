import http from 'http';
import express from 'express';
import cors from 'cors';
import socketio from 'socket.io';

const app = express();
const server = http.createServer(app);

app.use(cors());

let receiverPCs: any;
let senderPCs: any;
let users: any;
let socketToRoom: any;

interface User {
    id: string;
    stream: MediaStream;
}

const pc_config = {
    "iceServers": [
        // {
        //   urls: 'stun:[STUN_IP]:[PORT]',
        //   'credentials': '[YOR CREDENTIALS]',
        //   'username': '[USERNAME]'
        // },
        {
            urls : 'stun:stun.l.google.com:19302'
        }
    ]
}

const createReceiverPeerConnection = (socketID: string, socket: socketio.Socket) => {
    let pc = new RTCPeerConnection(pc_config);

    receiverPCs = {...receiverPCs, [socketID]: pc};

    pc.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
        console.log(`socketID: ${socketID}'s receiverPeerConnection icecandidate`);
        socket.to(socketID).emit('SFUReceiverCandidate', {
            candidate: e.candidate
        });
    }

    pc.oniceconnectionstatechange = (e: Event) => {
        console.log(e);
    }

    pc.ontrack = (e: RTCTrackEvent) => {
        let roomID: string = socketToRoom[socketID];
        if (users[roomID]) {
            let usersInRoom: Array<User> = users[roomID];
            usersInRoom.push({
                id: socketID,
                stream: e.streams[0]
            });
        } else {
            users[roomID] = {
                id: socketID,
                stream: e.streams[0]
            }
        }
    }

    pc.close = () => {
        console.log(`socketID: ${socketID}'s receiverPeerConnection closed`);
    }

    return pc;
}

const createSenderPeerConnection = (socketID: string) => {

}   

const io = socketio.listen(server);

io.sockets.on('connection', (socket: socketio.Socket) => {

    socket.on('senderOffer', async(data: {sdp: RTCSessionDescription, offerSendID: string}) => {
        try {
            let pc: RTCPeerConnection = createReceiverPeerConnection(data.offerSendID, socket);
            await pc.setRemoteDescription(data.sdp);
            console.log(`receive socketID(${data.offerSendID})'s offer`);
            let sdp = await pc.createAnswer({offerToReceiveAudio: false, offerToReceiveVideo: false});
            console.log(`send answer to socketID(${data.offerSendID})`);
            socket.to(data.offerSendID).emit('getSenderAnswer', { sdp });
        } catch (error) {
            console.log(error);
        }
    });

    socket.on('senderCandidate', async(data: {candidate: RTCIceCandidate, candidateSendID: string}) => {
        try {
            let pc: RTCPeerConnection = receiverPCs[data.candidateSendID];
            console.log(`receive socketID(${data.candidateSendID})'s candidate`);
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            console.log(`add socketID(${data.candidateSendID})'s candidate success`);
        } catch (error) {
            console.log(error);
        }
    });
});

server.listen(8080, () => {
    console.log('server running on 8080');
})