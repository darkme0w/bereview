const express = require('express')
const router = express.Router()
const author = require('../middlewares/auth.middlewares')
const {create, deleteBanner, listBanner} = require('../controllers/banner.controller')


router.get('/', listBanner)
router.post('/', author('ADMIN'), create)

router.delete('/', author('ADMIN'), deleteBanner)

module.exports = router;