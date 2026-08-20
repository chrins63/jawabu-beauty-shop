const db = require('../config/db')


// CREATE BOOKING
const createBooking = async (req, res) => {

  try {

    const {
      service_id,
      booking_date,
      start_time,
      end_time
    } = req.body

    const user_id = req.user.id

    const newBooking = await db('bookings')
      .insert({
        user_id,
        service_id,
        booking_date,
        start_time,
        end_time,
        status: 'pending'
      })
      .returning('*')

    res.status(201).json({
      message: 'Booking created successfully',
      booking: newBooking[0]
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      message: 'Server Error'
    })

  }

}


// GET USER BOOKINGS
const getUserBookings = async (req, res) => {

  try {

    const bookings = await db('bookings')
      .where({
        user_id: req.user.id
      })

    res.json(bookings)

  } catch (error) {

    console.error(error)

    res.status(500).json({
      message: 'Server Error'
    })

  }

}


module.exports = {
  createBooking,
  getUserBookings
}