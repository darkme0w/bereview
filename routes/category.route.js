const express = require('express')
const router = express.Router()
const {findAll} = require('../controllers/category.controller')
const authMiddlewares = require('../middlewares/auth.middlewares')

router.get('/', authMiddlewares(), findAll)

module.exports = router;