const stream = require('stream');
const { google } = require("googleapis");

const CLIENT_ID = process.env.OAUTH_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.OAUTH_GOOGLE_REDIRECT_URI;
const REFRESH_TOKEN = process.env.OAUTH_GOOGLE_CLIENT_REFRESH_TOKEN;

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oauth2Client.setCredentials({refresh_token: REFRESH_TOKEN});

const drive = google.drive({
	version: 'v3',
	auth: oauth2Client
})

const setFilePublic = async(fileId) =>{
	try {
		await drive.permissions.create({
			fileId,
			requestBody: {
				role: 'reader',
				type: 'anyone'
			}
		})
	} catch (error) {
		console.error(error);
	}
}

const uploadFile = async (fileObject) => {
	const bufferStream = new stream.PassThrough();
	bufferStream.end(fileObject.buffer);
	const { data: { id, name } } = await drive.files.create({
		media: {
			mimeType: fileObject.mimeType,
			body: bufferStream,
		},
		requestBody: {
			name: fileObject.originalname,
			parents: ['1k7F4tEUBlDckSeNawS2wvPBawkSuLMKL']
		},
		fields: 'id, name',
	});
	// await setFilePublic(id);
	// const uploadFileModel = await UploadFileModel.create({
	// 	fileId: id
	// })
	console.log(`Uploaded file ${name} ${id}`);
	return `https://drive.google.com/thumbnail?id=${id}`
};

const deleteFile = async (fileId) => {
	try {
		console.log('Delete File:::', fileId);
		const deleteFile = await drive.files.delete({
			fileId: fileId,
		})
		console.log(deleteFile.data, deleteFile.status)
	} catch (error) {
		console.error(error);
	}
}

module.exports = {
	uploadFile,
    deleteFile
}