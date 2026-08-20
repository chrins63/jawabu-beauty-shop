const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')

const db = require('./config/db')
const authRoutes = require('./routes/authRoutes')
const productRoutes = require('./routes/productRoutes')
const bookingRoutes = require('./routes/bookingRoutes')
const serviceRoutes = require('./routes/serviceRoutes')
const orderRoutes = require('./routes/orderRoutes')
const reviewRoutes = require('./routes/reviewRoutes')
const wishlistRoutes = require('./routes/wishlistRoutes')
const cartRoutes = require('./routes/cartRoutes')
const paymentRoutes = require('./routes/paymentRoutes')
const uploadRoutes = require('./routes/uploadRoutes')
const adminRoutes = require('./routes/adminRoutes')
const errorHandler = require('./middleware/errorMiddleware')
const apiLimiter = require('./middleware/rateLimitMiddleware')
const { protect, admin } = require('./middleware/authMiddleware')

const app = express()
const isDev = process.env.NODE_ENV !== 'production'

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true)
        return
      }

      if (allowedOrigins.length === 0) {
        callback(null, isDev)
        return
      }

      callback(null, allowedOrigins.includes(origin))
    },
    credentials: true,
  })
)
app.use(helmet())
app.use(express.json({ limit: '1mb' }))
app.use(morgan(isDev ? 'dev' : 'combined'))

app.get('/health', (req, res) => {
  res.json({ ok: true })
})

app.use('/api', apiLimiter)

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/wishlist', wishlistRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/admin', adminRoutes)

app.get('/profile', protect, (req, res) => {
  res.json({
    message: 'Protected profile route',
    user: req.user,
  })
})

app.get('/admin', protect, admin, (req, res) => {
  res.json({
    message: 'Welcome Admin',
    user: req.user,
  })
})

if (isDev) {
  app.get('/db-test', async (req, res) => {
    try {
      const result = await db.raw('SELECT NOW()')

      res.json({
        success: true,
        database_time: result.rows[0],
      })
    } catch (error) {
      console.error(error)

      res.status(500).json({
        success: false,
        message: 'Database connection failed',
      })
    }
  })
}

app.use(errorHandler)

module.exports = app
