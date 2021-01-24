'use strict'
var { v4: uuid } = require('uuid');
var http = require('http');

var server = http.createServer()
    .listen(4554, () => {
        console.log('Server running on port 4554');
    });

var io = require('socket.io')(server, {
    cors: {
        origin: "http://127.0.0.1:5500",
        methods: ["GET", "POST"]
    }
});

var rooms = []; // { roomid: uuid, peer1: abc, peer2: xyz }

io.on('connection', socket => {

    console.log(socket.id);

    socket.on('create-room', userid => {
        console.log(`peer with socketid ${userid} wants to create a new room`);

        // check if a room exists where this peer is a user
        var _peerOnCall = rooms.filter(room => {
            return room.peer1 === userid || room.peer2 === userid
        });

        if (_peerOnCall.length === 0) {
            var newRoomId = uuid();
            rooms.push({ roomid: newRoomId, peer1: userid, peer2: null })
            socket.join(newRoomId);
            socket.broadcast.emit('room-created', newRoomId);
        }
    });

    socket.on('join-room', (roomid, userid) => {
        console.log(`peer with socketid ${userid} wants to join room ${roomid}`);

        // get the peer and update the room peer2
        rooms.filter(room => { return roomid === roomid })[0].peer2 = userid;
        console.log(rooms.filter(room => { return roomid === roomid })[0]);

        // add peer to room
        socket.join(roomid);
        socket.broadcast.emit('joined-room', roomid);
    });

    socket.on('message', msg => {
        console.log(msg);

        socket.broadcast.emit('message', msg);
    });

    socket.on('close-room', roomid => {
        rooms = rooms.filter(room => { return roomid != roomid });
        console.log(rooms);
    });
});

