const express = require('express')
const router = express.Router()
const author = require('../middlewares/auth.middlewares')
const {createOrUpdate, deleteBlog, findOne, findAll} = require('../controllers/blog.controller')

router.get('/', findAll)
router.post('/', author('ADMIN'), createOrUpdate)
router.put('/', author('ADMIN'), createOrUpdate)
router.get('/get-blog', findOne)

router.delete('/', author('ADMIN'), deleteBlog)

module.exports = router;