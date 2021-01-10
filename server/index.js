let http = require('http');
let express = require('express');
let cors = require('cors');
let socketio = require('socket.io');
let wrtc = require('wrtc');

const app = express();
const server = http.createServer(app);

app.use(cors());

let receiverPCs = {};
let senderPCs = {};
let users = {};
let socketToRoom = {};

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

const isIncluded = (array, id) => {
    let len = array.length;
    for (let i = 0; i < len; i++) {
        if (array[i].id === id) return true;
    }
    return false;
}

const createReceiverPeerConnection = (socketID, socket, roomID) => {
    let pc = new wrtc.RTCPeerConnection(pc_config);

    receiverPCs = {...receiverPCs, [socketID]: pc};

    pc.onicecandidate = (e) => {
        console.log(`socketID: ${socketID}'s receiverPeerConnection icecandidate`);
        socket.emit('SFUReceiverCandidate', {
            candidate: e.candidate
        });
    }

    pc.oniceconnectionstatechange = (e) => {
        console.log(e);
    }

    pc.ontrack = (e) => {
        if (users[roomID]) {
            if (!isIncluded(users[roomID], socketID)) {
                users[roomID].push({
                    id: socketID,
                    stream: e.streams[0]
                });
            }
        } else {
            users[roomID] = [{
                id: socketID,
                stream: e.streams[0]
            }];
        }
        console.log(users);
    }

    pc.close = () => {
        console.log(`socketID: ${socketID}'s receiverPeerConnection closed`);
    }

    return pc;
}

const createSenderPeerConnection = (socketID) => {

}   

const io = socketio.listen(server);

io.sockets.on('connection', (socket) => {

    socket.on('senderOffer', async(data) => {
        try {
            socketToRoom[data.offerSendID] = data.roomID;
            let pc = createReceiverPeerConnection(data.offerSendID, socket, data.roomID);
            await pc.setRemoteDescription(data.sdp);
            console.log(`receive socketID(${data.offerSendID})'s offer`);
            let sdp = await pc.createAnswer({offerToReceiveAudio: false, offerToReceiveVideo: false});
            console.log(`send answer to socketID(${data.offerSendID})`);
            socket.emit('getSenderAnswer', { sdp });
        } catch (error) {
            console.log(error);
        }
    });

    socket.on('senderCandidate', async(data) => {
        try {
            let pc = receiverPCs[data.candidateSendID];
            console.log(`receive socketID(${data.candidateSendID})'s candidate`);
            await pc.addIceCandidate(new wrtc.RTCIceCandidate(data.candidate));
            console.log(`add socketID(${data.candidateSendID})'s candidate success`);
        } catch (error) {
            console.log(error);
        }
    });
});

server.listen(8080, () => {
    console.log('server running on 8080');
})