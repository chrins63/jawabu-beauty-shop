const db = require('../config/db')

const addToWishlist = async (req, res) => {

  try {

    const user_id = req.user.id

    const { product_id } = req.body

    const product = await db('products')
      .where({ id: product_id })
      .first()

    if (!product) {

      return res.status(404).json({
        message: 'Product not found'
      })
    }

    const existing = await db('wishlists')
      .where({
        user_id,
        product_id
      })
      .first()

    if (existing) {

      return res.status(400).json({
        message: 'Product already in wishlist'
      })
    }

    const [wishlist] = await db('wishlists')
      .insert({
        user_id,
        product_id
      })
      .returning('*')

    res.status(201).json({
      message: 'Added to wishlist',
      wishlist
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      message: 'Server Error'
    })
  }
}

const getWishlist = async (req, res) => {

  try {

    const wishlist = await db('wishlists')
      .join('products', 'wishlists.product_id', 'products.id')
      .select(
        'wishlists.id',
        'products.name',
        'products.price',
        'products.image_url'
      )
      .where('wishlists.user_id', req.user.id)

    res.json(wishlist)

  } catch (error) {

    console.error(error)

    res.status(500).json({
      message: 'Server Error'
    })
  }
}

const removeFromWishlist = async (req, res) => {

  try {

    const { id } = req.params

    const wishlistItem = await db('wishlists')
      .where({
        id,
        user_id: req.user.id
      })
      .first()

    if (!wishlistItem) {

      return res.status(404).json({
        message: 'Wishlist item not found'
      })
    }

    await db('wishlists')
      .where({ id })
      .del()

    res.json({
      message: 'Removed from wishlist'
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      message: 'Server Error'
    })
  }
}

module.exports = {
  addToWishlist,
  getWishlist,
  removeFromWishlist
}