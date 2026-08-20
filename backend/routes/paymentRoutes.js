const express = require('express')

const router = express.Router()

const {
  createPayment,
  getMyPayments
} = require('../controllers/paymentController')

const { protect } = require('../middleware/authMiddleware')

router.post('/', protect, createPayment)

router.get('/', protect, getMyPayments)

module.exports = router