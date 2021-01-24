const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const socket = require('socket.io');
const io = socket(server, {
    cors: {
        origin: "http://127.0.0.1:5500",
        methods: ["GET", "POST"]
    }
});

const rooms = {};

io.on("connection", socket => {

    console.log(socket.id);

    socket.on("join-room", roomId => {

        if (rooms[roomId]) {
            rooms[roomId].push(socket.id);
        } else {
            rooms[roomId] = [socket.id]
        }

        const otherUser = rooms[roomId].find(id => id !== socket.id);

        if (otherUser) {
            socket.emit("other-user", otherUser);
            socket.to(otherUser).emit("user-joined", socket.id);
        }
    });

    socket.on("offer", payload => {
        io.to(payload.target).emit("offer", payload);
    });

    socket.on("answer", payload => {
        io.to(payload.target).emit("answer", payload);
    });

    socket.on("ice-candidate", incoming => {
        io.to(incoming.target).emit("ice-candidate", incoming.candidate);
    });

});

server.listen(4554, () => { console.log('relay server running on port 4554') });