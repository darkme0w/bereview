const express = require('express')
const router = express.Router()
const {create, findAllAdmin, findByCategory, 
    updatePositions,
    findConfigBestSeller,
    createTestData, getBestSellers,
    getProducts, getProductIds,
    getSuggestProducts, findProductByName,
    updatePositionsBestSeller,
    getBestSellerList
}
= require('../controllers/products.controller')
const authMiddleWares = require('../middlewares/auth.middlewares')
const roles = require('../constants/roles')

router.post('/', authMiddleWares(roles.ADMIN), create)
router.put('/', authMiddleWares(roles.ADMIN), create)
router.get('/', authMiddleWares(roles.ADMIN), findAllAdmin)
router.get('/find-by-category', authMiddleWares(roles.ADMIN), findByCategory)
router.post('/update-positions', authMiddleWares(roles.ADMIN), updatePositions)
router.get('/find-config-best-seller-position', authMiddleWares(roles.ADMIN), findConfigBestSeller)
router.get('/create-test', authMiddleWares(roles.ADMIN), createTestData)
router.get('/get-best-sellers', getBestSellers)
router.get('/get-products', getProducts)
router.post('/get-product-ids', getProductIds)
router.get('/get-suggest', getSuggestProducts)
router.get('/get-by-name', findProductByName)
router.get('/best-sellers', getBestSellerList)
router.post('/update-positions-best-seller', updatePositionsBestSeller)

module.exports = router;