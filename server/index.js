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

    if (receiverPCs[socketID]) receiverPCs[socketID] = pc;
    else receiverPCs = {...receiverPCs, [socketID]: pc};

    pc.onicecandidate = (e) => {
        //console.log(`socketID: ${socketID}'s receiverPeerConnection icecandidate`);
        socket.emit('getSenderCandidate', {
            candidate: e.candidate
        });
    }

    pc.oniceconnectionstatechange = (e) => {
        //console.log(e);
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
        //console.log(users);
        socket.to(roomID).broadcast.emit('userEnter', {id: socketID});
    }

    pc.close = () => {
        console.log(`socketID: ${socketID}'s receiverPeerConnection closed`);
    }

    return pc;
}

const createSenderPeerConnection = (receiverSocketID, senderSocketID, socket, roomID) => {
    let pc = wrtc.RTCPeerConnection(pc_config);

    if (senderPCs[receiverSocketID]) {
        senderPCs[receiverSocketID].filter(user => user.id !== senderSocketID);
        senderPCs[receiverSocketID].push({id: senderSocketID, pc: pc});
    }
    else senderPCs = {...senderPCs, [receiverSocketID]: [{id: senderSocketID, pc: pc}]};

    pc.onicecandidate = (e) => {
        //console.log(`socketID: ${socketID}'s senderPeerConnection icecandidate`);
        socket.to(receiverSocketID).emit('getReceiverCandidate', {
            id: senderSocketID,
            candidate: e.candidate
        });
    }

    pc.oniceconnectionstatechange = (e) => {
        //console.log(e);
    }

    /*
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
        pc.add
        console.log(users);
        socket.to(roomID).broadcast.emit('userEnter', {id: socketID});
    }
    */

    const sendUser = users[roomID].filter(user => user.id === senderSocketID);
    sendUser[0].stream.getTracks().forEach(track => {
        pc.addTrack(track, sendUser[0].stream);
    });

    pc.close = () => {
        console.log(`socketID: ${socketID}'s receiverPeerConnection closed`);
    }

    return pc;
}   

const io = socketio.listen(server);

io.sockets.on('connection', (socket) => {

    socket.on('senderOffer', async(data) => {
        try {
            //console.log(data);
            socketToRoom[data.offerSendID] = data.roomID;
            let pc = createReceiverPeerConnection(data.offerSendID, socket, data.roomID);
            await pc.setRemoteDescription(data.sdp);
            //console.log(`receive socketID(${data.offerSendID})'s offer`);
            let sdp = await pc.createAnswer({offerToReceiveAudio: false, offerToReceiveVideo: false});
            pc.setLocalDescription(sdp);
            //console.log(`send answer to socketID(${data.offerSendID})`);
            socket.emit('getSenderAnswer', { sdp });
        } catch (error) {
            console.log(error);
        }
    });

    socket.on('senderCandidate', async(data) => {
        try {
            let pc = receiverPCs[data.senderSocketID];
            //console.log(`receive socketID(${data.senderSocketID})'s candidate`);
            await pc.addIceCandidate(new wrtc.RTCIceCandidate(data.candidate));
            //console.log(`add socketID(${data.senderSocketID})'s candidate success`);
        } catch (error) {
            console.log(error);
        }
    });

    socket.on('receiverOffer', async(data) => {
        try {
            let pc = createSenderPeerConnection(data.receiverSocketID, data.senderSocketID, socket, data.roomID);
            await pc.setRemoteDescription(data.sdp);
            //console.log(`receiverSocketID(${data.receiverSocketID}) offer to senderSocketID(${data.senderSocketID})`);
            let sdp = await pc.createAnswer({offerToReceiveAudio: true, offerToReceiveVideo: true});
            pc.setLocalDescription(sdp);
            //console.log(`send answer of senderSocketID(${data.senderSocketID}) to receiverSocketID(${data.receiverSocketID})`);
            socket.to(data.receiverSocketID).emit('getReceiverAnswer', { id: data.senderSocketID, sdp });
        } catch (error) {
            console.log(error);
        }
    });

    socket.on('receiverCandidate', async(data) => {
        try {
            const senderPC = senderPCs[socket.id].filter(sPC => sPC.id === data.senderSocketID);
            //console.log(`get receiverSocketID(${socket.id})'s candidate`);
            await senderPC[0].pc.addIceCandidate(new wrtc.RTCIceCandidate(data.candidate));
            //console.log(`add socketID(${socket.id})'s candidate success`);
        } catch (error) {
            console.log(error);
        }
    });
});

server.listen(8080, () => {
    console.log('server running on 8080');
})