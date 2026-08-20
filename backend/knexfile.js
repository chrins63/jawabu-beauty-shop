require('dotenv').config()

const connection = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false'
    ? false
    : { rejectUnauthorized: false },
}

const shared = {
  client: 'pg',
  connection,
  migrations: {
    directory: './migrations',
  },
  pool: {
    min: 2,
    max: 10,
  },
}

module.exports = {
  development: shared,
  production: shared,
}
