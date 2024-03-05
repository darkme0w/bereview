const UserSchema = require('../models/Users.model')
const {verifyToken} = require('../services/auth.service')
const {forbidden, unauthorized} = require('../utils/responseUtil')

module.exports = function authorize(roles = []) {
	if (typeof roles === 'string') {
		roles = [roles];
	}
	return [
		async (req, res, next) => {
			const accessTokenFromHeader = req.header('Authorization')?.replace('Bearer ', '');
			if (!accessTokenFromHeader) {
				return forbidden(res)
			}
			const verified = await verifyToken(accessTokenFromHeader, process.env.JWT_ACCESS_TOKEN_SECRET);
			if(!!verified.message) {
				return unauthorized(res, verified.message, verified.message.message)
			}
			req.user = await UserSchema.findOne({username: verified.payload.username});
			if (roles.length && !roles.includes(req.user.role)) {
				return forbidden(res, null, 'Unauthorized')
			}
			next();
		}
	];
}
