const express = require('express');
const roles = require('../constants/roles');
const router = express.Router()
const authMiddlewares = require('../middlewares/auth.middlewares')
const { createRestaurant, getRestaurant, deleteRestaurant} = require('../controllers/restaurant.controller')
const { getConfigs, updateConfig } = require('../controllers/config.controller')

router.post('/create-branch', authMiddlewares(roles.ADMIN), createRestaurant)
router.put('/update-branch', authMiddlewares(roles.ADMIN), createRestaurant)
router.get('/branch', getRestaurant)
router.delete('/delete-branch', deleteRestaurant)
router.get('/get-configs', getConfigs)
router.put('/update-config', updateConfig)

module.exports = router;