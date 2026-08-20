const express = require('express')

const router = express.Router()

const {
  createService,
  getServices
} = require('../controllers/serviceController')

const {
  protect,
  admin
} = require('../middleware/authMiddleware')


// CREATE SERVICE (ADMIN ONLY)
router.post('/', protect, admin, createService)


// GET ALL SERVICES
router.get('/', getServices)


module.exports = router