const express = require('express')
const router = express.Router()
const {login, refreshToken} = require('../controllers/auth.controller')
const author = require('../middlewares/auth.middlewares')
const { success } = require('../utils/responseUtil')

router.post('/login', login)
router.post('/refresh-token', refreshToken)
router.get('/get-user', author(), (req, res) => {
    success(res, req.user)
})

module.exports = router;