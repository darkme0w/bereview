const BaseResponse = (res, status, content, message) => {
	status = status || 200;
	content = content || {};
	message = message || '';
	res.status(status);
	res.json({status, content, message});
}

const success = (res, content = null, message = 'OK') => {
	return BaseResponse(res, 200, content, message)
}

const notFound = (res, content = null, message = 'Not found') => {
	return BaseResponse(res, 404, content, message)
}

const invalidData = (res, content = null, message = 'Invalid data') => {
	return BaseResponse(res, 400, content, message)
}

const serverInternal = (res, content = null, message = 'Server internal error') => {
	return BaseResponse(res, 500, content, message)
}

const conflict = (res, content = null, message = 'Conflict') => {
	return BaseResponse(res, 409, content, message)
}

const forbidden = (res, content = null, message = 'Forbidden') => {
	return BaseResponse(res, 403, content, message)
}

const unauthorized = (res, content = null, message = 'Unauthorized') => {
	return BaseResponse(res, 401, content, message)
}

const invalidToken = (res, content = null, message = 'Invalid Token') => {
	return BaseResponse(res, 498, content, message)
}

module.exports = {success, notFound, invalidData, serverInternal, conflict, forbidden, unauthorized, invalidToken}