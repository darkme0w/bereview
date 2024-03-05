const express = require('express')
const router = express.Router()
const author = require('../middlewares/auth.middlewares')
const {createOrUpdate, deleteReview, findAll} = require('../controllers/review.controller')

router.get('/', findAll)
router.post('/', author('ADMIN'), createOrUpdate)
router.put('/', author('ADMIN'), createOrUpdate)

router.delete('/', author('ADMIN'), deleteReview)

module.exports = router;