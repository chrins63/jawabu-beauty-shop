const jwt = require('jsonwebtoken')
const db = require('../config/db')

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization

    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Not authorized, no token',
      })
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: 'Server misconfigured',
      })
    }

    const token = header.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await db('users')
      .select('id', 'email', 'role')
      .where({ id: decoded.id })
      .first()

    if (!user) {
      return res.status(401).json({
        message: 'Not authorized, user not found',
      })
    }

    req.user = user
    next()
  } catch (error) {
    console.error(error)

    res.status(401).json({
      message: 'Not authorized, token failed',
    })
  }
}

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next()
    return
  }

  res.status(403).json({
    message: 'Admin access only',
  })
}

module.exports = {
  protect,
  admin,
}
