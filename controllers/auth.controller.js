const UserSchema = require('../models/Users.model')
const randToken = require('rand-token')
const bcrypt = require('bcrypt')
const { invalidData, serverInternal, success, forbidden, notFound } = require('../utils/responseUtil')
const { generateToken, decodeToken } = require('../services/auth.service')
const redisClient = require('../services/redisClient')

const ONE_MONTH_TIME = 60 * 60 * 24 * 30;

const login = async (req, res) => {
	const data = req.body
	if (!!data && !!data.username && !!data.password) {
		const user = await UserSchema.findOne({ username: data.username });
		if (!user) return notFound(res, {}, 'Tài khoản không tồn tại')
		const isPasswordValid = bcrypt.compareSync(data.password, user.password);
		if (!isPasswordValid) {
			return forbidden(res, {}, 'Mật khẩu không chính xác')
		}
		const accessToken = await generateToken(
			{ username: user.username },
			process.env.JWT_ACCESS_TOKEN_SECRET,
			process.env.JWT_ACCESS_TOKEN_LIFE
		);
		if (!accessToken) return unauthorized(res, {}, 'Đăng nhập không thành công')
		let refreshToken = randToken.generate(process.env.JWT_REFRESH_TOKEN_SIZE);
		if (user?.refreshToken) {
			refreshToken = user.refreshToken
		} else {
			user.refreshToken = refreshToken
		}
		user.lastLogin = new Date();
		try {
			let data = await redisClient.get("refreshTokenCount");
			data = parseInt(data) ?? 1
			if (isNaN(data)) {
				data = 1
			}
			data = data + 1
			redisClient.set("refreshTokenCount", data);
			redisClient.set(`rfId_${data}`, refreshToken, "EX", ONE_MONTH_TIME);
			await user.save();
			return success(res, { accessToken: accessToken, rfId: data });
		} catch (error) {
			console.log(error)
			return serverInternal(res, null, error)
		}
	}
	invalidData(res)
}

const refreshToken = async (req, res) => {

	const accessTokenFromHeader = req.header('Authorization')?.replace('Bearer ', '');
	if (!accessTokenFromHeader) {
		return invalidData(res, null, 'Token not found')
	}

	const { rfId } = req.query
	if (!rfId) {
		return invalidData(res)
	}

	const accessTokenSecret = process.env.JWT_ACCESS_TOKEN_SECRET;
	const accessTokenLife = process.env.JWT_ACCESS_TOKEN_LIFE;

	const decoded = await decodeToken(
		accessTokenFromHeader,
		accessTokenSecret,
	);

	if (!decoded) {
		return invalidData(res, null, 'Token not valid')
	}

	const username = decoded.payload.username;

	const user = await UserSchema.findOne({ username });
	if (!user) {
		return notFound(res, null)
	}
	const refreshToken = await redisClient.get(`rfId_${rfId}`)
	if (!refreshToken) {
		return invalidData(res, null, 'Expire refresh token')
	}
	if (refreshToken !== user.refreshToken) {
		return invalidData(res, 'Refresh token not valid')
	}
	const dataForAccessToken = { username };
	const accessToken = await generateToken(
		dataForAccessToken,
		accessTokenSecret,
		accessTokenLife,
	);
	if (!accessToken) {
		return invalidData(res, 'Create token not success')
	}
	return success(res, { accessToken })
};

module.exports = {
	login,
	refreshToken
}