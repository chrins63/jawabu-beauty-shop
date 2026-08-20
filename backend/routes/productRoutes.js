const express = require('express')

const {
  createProduct,
  getProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController')

const { protect, admin } = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/', getProducts)
router.get('/:id', getSingleProduct)
router.post('/', protect, admin, createProduct)
router.put('/:id', protect, admin, updateProduct)
router.delete('/:id', protect, admin, deleteProduct)

module.exports = router
