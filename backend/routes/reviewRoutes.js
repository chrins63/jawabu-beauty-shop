const express = require('express')

const router = express.Router()

const {
  createReview,
  getProductReviews
} = require('../controllers/reviewController')

const { protect } = require('../middleware/authMiddleware')

router.post('/', protect, createReview)

router.get('/:productId', getProductReviews)

module.exports = router