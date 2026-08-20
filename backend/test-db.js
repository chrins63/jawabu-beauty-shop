require('dotenv').config()

const db = require('./src/config/db')

async function testConnection() {
  try {
    await db.raw('SELECT 1')
    console.log('✅ Database connected successfully')
    process.exit(0)
  } catch (error) {
    console.error('❌ Database connection failed')
    console.error(error)
    process.exit(1)
  }
}

testConnection()