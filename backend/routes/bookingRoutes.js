const express = require('express')

const router = express.Router()

const {
  createBooking,
  getUserBookings
} = require('../controllers/bookingController')

const {
  protect
} = require('../middleware/authMiddleware')


// CREATE BOOKING
router.post('/', protect, createBooking)


// GET USER BOOKINGS
router.get('/', protect, getUserBookings)


module.exports = router