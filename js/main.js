var socket = io('backend-server-address');

var socketid;

socket.on('connect', socket => {
    console.log('local peer connected? ', socket.connected);
    console.log('local peers socket id: ', socket.id);
    socketid = socket.id;
});

// add click listener to new room btn
document.getElementById('new-room').addEventListener('click', (event) => {
    createRoom();
});

// add event listener to join room btn
document.getElementById('join-room').addEventListener('click', (event) => {
    var roomid = document.getElementById('room-no').value;
    joinRoom(roomid);
});

// If local peer is the call initiator
function createRoom() {
    socket.emit('create-room', socket.id);
}

// If remote peer is the call initiator, remote peer needs to provide the roomid
function joinRoom(roomid) {
    socket.emit('join-room', roomid, socket.id);
}

socket.on('room-created', roomid => {
    alert(`Please note your room id: ${roomid}`);
    console.log(roomid);
    initiateVideoCall();
});

socket.on('joined-room', roomid => {
    console.log('joined room: ', roomid);
});

socket.on('message', msg => {
    if (msg.type === 'offer') {
        initiateVideoCall();
        localPeer.setRemoteDescription(new RTCSessionDescription(msg));
        answer();
    } else if (msg.type === 'answer') {
        localPeer.setRemoteDescription(new RTCSessionDescription(msg));
    } else if (msg.type === 'candidate') {
        var candidate = new RTCIceCandidate({
            sdpMLineIndex: msg.label,
            candidate: msg.candidate
        });
        localPeer.addIceCandidate(candidate);
    }
});

var localPeerVideoElement = document.getElementById('localVideo');
var localPeer; // peer who initiates the call
var localPeerStream; // video stream of localPeer

// get localPeers' video stream
navigator.mediaDevices.getUserMedia({ audio: false, video: true })
    .then(stream => {
        localPeerStream = stream;
        localPeerVideoElement.srcObject = stream;

        //initiateVideoCall();
    })
    .catch(error => {
        console.log(error);
    });


// initiate the video call process
function initiateVideoCall() {

    createPeerConnection();

    localPeer.addStream(localPeerStream);

    call();
}

/**
 *  The below code is for create peer connection
 */
var remotePeerVideoElement = document.getElementById('remoteVideo');
var remotePeer; // peer who is being called
var remotePeerStream; // video stream of remotePeer

function createPeerConnection() {
    try {

        localPeer = new RTCPeerConnection(null);

        // Events
        localPeer.onicecandidate = handleIceCandidate;
        localPeer.onaddstream = handleRemoteStreamAdded;
        localPeer.onremovestream = handleRemoteStreamRemoved;

    } catch (error) {
        console.log('Could not create peer connection');
    }
}

// local peer events
// when a remote peer is available to connect
function handleIceCandidate(event) {
    if (event.candidate) {
        //send message via socket
        socket.emit('message', {
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate
        });
    } else {
        console.log('no candidated');
    }
}

// when remote peers' stream is available, add it to video element
function handleRemoteStreamAdded(event) {
    remotePeer = event.stream;
    remotePeerVideoElement = remotePeerStream;
}

// when remote user disconnects, remove his stream
function handleRemoteStreamRemoved(event) {
    console.log('remote peers stream removed');
}
/**
 *  end of create peer connection code
 */


/**
*  below code corresponds to call() and answer() functions
*/
// send an offer to remote peer
function call() {
    console.log('sending an offer to remote peer');
    localPeer.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

// answer offer from remote peer
function answer() {
    console.log('sending answer to remote peer');
    localPeer.createAnswer().then(setLocalAndSendMessage, onCreateSessionDescriptionError);
}

// set local description and send it to remote peer
function setLocalAndSendMessage(sessionDescription) {

    localPeer.setLocalDescription(sessionDescription);
    console.log('local peer description set ', sessionDescription);

    // send message to remote peer containing local peers session description
    socket.emit('message', sessionDescription);
}

// handle create offer error
function handleCreateOfferError(event) {
    console.log('could not create offer ', event);
}

// handle create answer error
function onCreateSessionDescriptionError(error) {
    console.log('could not create answer ', error);
}
/**
 *  end of call() function code
 */

// close connection on page unload
window.onbeforeunload = () => {
    socket.emit('close-room', roomid);
    localPeer.close();
    localPeer = null;
}