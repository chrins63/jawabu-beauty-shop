const db = require('../config/db')

const createReview = async (req, res) => {

  try {

    const user_id = req.user.id

    const {
      product_id,
      rating,
      comment
    } = req.body

    const product = await db('products')
      .where({ id: product_id })
      .first()

    if (!product) {

      return res.status(404).json({
        message: 'Product not found'
      })
    }

    const [review] = await db('reviews')
      .insert({
        user_id,
        product_id,
        rating,
        comment
      })
      .returning('*')

    res.status(201).json({
      message: 'Review added successfully',
      review
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      message: 'Server Error'
    })
  }
}

const getProductReviews = async (req, res) => {

  try {

    const { productId } = req.params

    const reviews = await db('reviews')
      .where({ product_id: productId })

    res.json(reviews)

  } catch (error) {

    console.error(error)

    res.status(500).json({
      message: 'Server Error'
    })
  }
}

module.exports = {
  createReview,
  getProductReviews
}