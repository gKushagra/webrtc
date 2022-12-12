// load elements
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');

const controls = document.getElementById('controls');
const videos = document.getElementById('videos');

const copyBtn = document.getElementById('ctrl-copy');
const micBtn = document.getElementById('ctrl-audio');
const videoBtn = document.getElementById('ctrl-video');
const callBtn = document.getElementById('ctrl-call');

setInterval(() => {
    remoteVideo.width = window.innerWidth;
    remoteVideo.height = window.innerHeight;

    localVideo.width = window.innerWidth * 0.20;
    localVideo.height = window.innerHeight * 0.20;
    localVideo.style.bottom = 0;
    localVideo.style.right = 0;
    localVideo.style.borderRadius = "10px";
}, 1000);

copyBtn.addEventListener('click', () => {
    // log(window.location);
    // window.prompt("Copy room link: Ctrl+C, Enter", window.location);
    var textarea = document.createElement("textarea");
    textarea.textContent = window.location;
    textarea.style.position = "fixed";  // Prevent scrolling to bottom of page in Microsoft Edge.
    document.body.appendChild(textarea);
    textarea.select();
    try {
        return document.execCommand("copy");  // Security exception may be thrown by some browsers.
    }
    catch (ex) {
        console.warn("Copy to clipboard failed.", ex);
        return false;
    }
    finally {
        document.body.removeChild(textarea);
    }
});

micBtn.addEventListener('click', () => {
    var enabled = localVideoStream.getAudioTracks()[0].enabled;
    if (enabled) {
        localVideoStream.getAudioTracks()[0].enabled = false;
        micBtn.innerHTML = '<i class="bi bi-mic-mute"></i>';
    } else {
        localVideoStream.getAudioTracks()[0].enabled = true;
        micBtn.innerHTML = '<i class="bi bi-mic"></i>';
    }
});

videoBtn.addEventListener('click', () => {
    var enabled = localVideoStream.getVideoTracks()[0].enabled;
    if (enabled) {
        localVideoStream.getVideoTracks()[0].enabled = false;
        videoBtn.innerHTML = '<i class="bi bi-camera-video-off"></i>';
    } else {
        localVideoStream.getVideoTracks()[0].enabled = true;
        videoBtn.innerHTML = '<i class="bi bi-camera-video"></i>';
    }
});

callBtn.addEventListener('click', () => {
    // localPeer.close();
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    localVideoStream = null;
    videos.innerHTML = '<h5 style="color: white;">Call Ended</h5>'
    setTimeout(() => {
        window.location.replace('/');
    }, 1000);
});

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
            localVideoStream.getAudioTracks()[0].enabled = false;
            initSocketConnection();
        })
        .catch(error => {
            log(error);
        });
}

function initSocketConnection() {
    socket = io('http://localhost:8585');

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