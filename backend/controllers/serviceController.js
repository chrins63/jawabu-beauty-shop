const db = require('../config/db')


// CREATE SERVICE
const createService = async (req, res) => {

  try {

    const {
      name,
      description,
      price,
      duration_minutes
    } = req.body

    const newService = await db('services')
      .insert({
        name,
        description,
        price,
        duration_minutes
      })
      .returning('*')

    res.status(201).json({
      message: 'Service created successfully',
      service: newService[0]
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      message: 'Server Error'
    })

  }

}


// GET ALL SERVICES
const getServices = async (req, res) => {

  try {

    const services = await db('services')

    res.json(services)

  } catch (error) {

    console.error(error)

    res.status(500).json({
      message: 'Server Error'
    })

  }

}


module.exports = {
  createService,
  getServices
}