const { verifyToken } = require('../services/auth.service')
const _ = require('underscore');

module.exports = function (io) {
	io.on('connection', (socket) => {
		socket.auth = false;
		socket.on('authenticate', async function (data) {
			const verified = await verifyToken(data.token, process.env.JWT_ACCESS_TOKEN_SECRET);
			if (!!verified.message) {
				return;
			}
			socket.auth = true;
			socket.join(verified.payload.username)
		});

		setTimeout(function () {
			if (!socket.auth) {
				console.log("Disconnecting socket ", socket.id);
				socket.disconnect('unauthorized');
			}
		}, 2000);
	})
}