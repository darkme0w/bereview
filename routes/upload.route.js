const express = require('express')
const router = express.Router()
const authMiddlewares = require('../middlewares/auth.middlewares')
const {create} = require('../controllers/upload.controller')
const multer = require('multer')
const upload = multer()

router.post('/', authMiddlewares(), upload.single('files'), create)

module.exports = router