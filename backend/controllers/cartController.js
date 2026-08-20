const db = require('../config/db')

const addToCart = async (req, res) => {

  try {

    const user_id = req.user.id

    const {
      product_id,
      quantity
    } = req.body

    const product = await db('products')
      .where({ id: product_id })
      .first()

    if (!product) {

      return res.status(404).json({
        message: 'Product not found'
      })
    }

    const existing = await db('cart_items')
      .where({
        user_id,
        product_id
      })
      .first()

    if (existing) {

      await db('cart_items')
        .where({ id: existing.id })
        .update({
          quantity: existing.quantity + quantity
        })

      return res.json({
        message: 'Cart updated'
      })
    }

    const [cartItem] = await db('cart_items')
      .insert({
        user_id,
        product_id,
        quantity
      })
      .returning('*')

    res.status(201).json({
      message: 'Added to cart',
      cartItem
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      message: 'Server Error'
    })
  }
}

const getCart = async (req, res) => {

  try {

    const cart = await db('cart_items')
      .join('products', 'cart_items.product_id', 'products.id')
      .select(
        'cart_items.id',
        'cart_items.quantity',
        'products.name',
        'products.price',
        'products.image_url'
      )
      .where('cart_items.user_id', req.user.id)

    res.json(cart)

  } catch (error) {

    console.error(error)

    res.status(500).json({
      message: 'Server Error'
    })
  }
}

const updateCartItem = async (req, res) => {

  try {

    const { id } = req.params

    const { quantity } = req.body

    await db('cart_items')
      .where({
        id,
        user_id: req.user.id
      })
      .update({
        quantity
      })

    res.json({
      message: 'Cart item updated'
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      message: 'Server Error'
    })
  }
}

const removeCartItem = async (req, res) => {

  try {

    const { id } = req.params

    await db('cart_items')
      .where({
        id,
        user_id: req.user.id
      })
      .del()

    res.json({
      message: 'Cart item removed'
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      message: 'Server Error'
    })
  }
}

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem
}