const bcrypt = require('bcrypt')
const db = require('../config/db')
const generateToken = require('../utils/generateToken')
const asyncHandler = require('../utils/asyncHandler')

const registerUser = asyncHandler(async (req, res) => {

  try {

    const { email, password } = req.body

    const existingUser = await db('users')
      .where({ email })
      .first()

    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists'
      })
    }

    const salt = await bcrypt.genSalt(10)

    const password_hash = await bcrypt.hash(password, salt)

    const newUser = await db('users')
  .insert({
    email,
    password_hash,
    role: 'customer'
  })
  .returning(['id', 'email', 'role'])

    const user = newUser[0]

    const token = generateToken(user)

    res.status(201).json({
      user,
      token
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      message: 'Server Error'
    })
  }
})

const loginUser = asyncHandler(async (req, res) => {

  try {

    const { email, password } = req.body

    const user = await db('users')
      .where({ email })
      .first()

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password'
      })
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password_hash
    )

    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid email or password'
      })
    }

    const token = generateToken(user)

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      token
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      message: 'Server Error'
    })
  }
})

module.exports = {
  registerUser,
  loginUser
}