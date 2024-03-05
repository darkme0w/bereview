const socketIo = require('socket.io');
const indexIo = require('./index')

let io;

function init(server) {
    io = socketIo(server);

    indexIo(io)
}

function getIo() {
    if (!io) {
        throw new Error('Socket.IO instance not initialized');
    }

    return io;
}

module.exports = {
    init,
    getIo,
};
