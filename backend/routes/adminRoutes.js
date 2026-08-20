const express = require('express')

const router = express.Router()

const {
  getDashboardStats,
  getAllOrders
} = require('../controllers/adminController')

const {
  protect,
  admin
} = require('../middleware/authMiddleware')

router.get('/stats', protect, admin, getDashboardStats)
router.get('/orders', protect, admin, getAllOrders)

module.exports = router