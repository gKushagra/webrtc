// load elements
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');

// declare some variables
var currentRoomId;
var localVideoStream;
var socket;
var remoteUserId;
var remotePeer;

setTimeout(() => {
    getRoomId();
}, 1000);

function getRoomId() {
    var params = new URLSearchParams(window.location.search);
    currentRoomId = params.get("token");
    log(currentRoomId);

    loadLocalMedia();
}

function loadLocalMedia() {
    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        .then(stream => {
            localVideo.srcObject = stream;
            localVideoStream = stream;

            initSocketConnection();
        })
        .catch(error => {
            log(error);
        });
}

function initSocketConnection() {
    socket = io('http://localhost:4554');

    socket.emit("join-room", currentRoomId);

    socket.on("other-user", userId => {
        callRemoteUser(userId);
        remoteUserId = userId;
    });

    socket.on("user-joined", userId => {
        remoteUserId = userId;
    });

    socket.on("offer", handleReceiveCall);

    socket.on("answer", handleAnswer);

    socket.on("ice-candidate", handleNewIceCandidate);
}

function callRemoteUser(userId) {
    remotePeer = createPeer(userId);
    localVideoStream.getTracks().forEach(track => {
        remotePeer.addTrack(track, localVideoStream);
    });
}

function createPeer(userId) {
    const peer = new RTCPeerConnection(null);

    peer.onicecandidate = handleOnIceCandidateEvent;
    peer.ontrack = handleOnTrackEvent;
    peer.onnegotiationneeded = () => handleOnNegotiationNeededEvent(userId);

    return peer;
}

function handleOnNegotiationNeededEvent(userId) {
    remotePeer.createOffer().then(offer => {
        return remotePeer.setLocalDescription(offer);
    }).then(() => {
        const payload = {
            target: userId,
            caller: socket.id,
            sdp: remotePeer.localDescription
        }

        socket.emit("offer", payload);
    }).catch(error => {
        log(error);
    });
}

function handleReceiveCall(incoming) {
    remotePeer = createPeer();
    const descp = new RTCSessionDescription(incoming.sdp);
    remotePeer.setRemoteDescription(descp).then(() => {
        localVideoStream.getTracks().forEach(track => {
            remotePeer.addTrack(track, localVideoStream);
        });
    }).then(() => {
        return remotePeer.createAnswer();
    }).then(answer => {
        return remotePeer.setLocalDescription(answer);
    }).then(() => {
        const payload = {
            target: incoming.caller,
            caller: socket.id,
            sdp: remotePeer.localDescription
        }

        socket.emit("answer", payload);
    }).catch(error => {
        log(error);
    });
}

// to complete handshake cycle
function handleAnswer(message) {
    const descp = new RTCSessionDescription(message.sdp);
    remotePeer.setRemoteDescription(descp).catch(error => { log(error) });
}

function handleOnIceCandidateEvent(e) {
    if (e.candidate) {
        const payload = {
            target: remoteUserId,
            candidate: e.candidate
        }

        socket.emit("ice-candidate", payload);
    }
}

function handleNewIceCandidate(incoming) {
    const candidate = new RTCIceCandidate(incoming);

    remotePeer.addIceCandidate(candidate).catch(error => { log(error) });
}

// handle remote peers stream
function handleOnTrackEvent(e) {
    remoteVideo.srcObject = e.streams[0];
}

// helper method to log events
function log(message) {
    console.log(`[${new Date().getHours() + ":" + new Date().getMinutes()}]::${message}`);
}