const express = require('express')
const roles = require('../constants/roles')
const router = express.Router()
const {create, listOrder, detailOrder, downloadReport, updateOrderProcess, deletedOrder, getNotificationUnreadCount} = require('../controllers/order.controller')
const author = require('../middlewares/auth.middlewares')

router.post('/', create)
router.post('/list-order', author(roles.ADMIN), listOrder)
router.get('/get-order', author(roles.ADMIN), detailOrder)
router.post('/get-order-download', author(roles.ADMIN), downloadReport)
router.post('/update-process', author(roles.ADMIN), updateOrderProcess)
router.delete('/delete', author(roles.ADMIN), deletedOrder)
router.get('/get-unread-count', author(roles.ADMIN), getNotificationUnreadCount)

module.exports = router