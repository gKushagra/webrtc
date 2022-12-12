const express = require('express');
const http = require('http');
const app = express();
app.use(express.static(__dirname + '/client'));
const server = http.createServer(app);
const socket = require('socket.io');
var whitelist = ['http://localhost:8585/', 'https://rooms.softwright.in/']
const io = socket(server, {
    cors: {
        origin: function (origin, callback) {
            if (whitelist.indexOf(origin) !== -1) {
                callback(null, true)
            } else {
                callback(new Error('Not allowed by CORS'))
            }
        },
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

server.listen(8585, () => { console.log('Socket server listening on port 8585') });