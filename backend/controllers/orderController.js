const db = require('../config/db')

const createOrder = async (req, res) => {
  try {
    const user_id = req.user.id
    const { items } = req.body

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'No order items provided',
      })
    }

    const order = await db.transaction(async (trx) => {
      let total_amount = 0
      const lineItems = []

      for (const item of items) {
        const quantity = Number(item.quantity)

        if (!Number.isInteger(quantity) || quantity < 1) {
          const error = new Error('Invalid item quantity')
          error.statusCode = 400
          throw error
        }

        const product = await trx('products')
          .where({ id: item.product_id })
          .forUpdate()
          .first()

        if (!product) {
          const error = new Error(`Product ID ${item.product_id} not found`)
          error.statusCode = 404
          throw error
        }

        if (Number(product.stock_quantity) < quantity) {
          const error = new Error(`${product.name} does not have enough stock`)
          error.statusCode = 409
          throw error
        }

        const unitPrice = Number(product.price)
        total_amount += unitPrice * quantity

        lineItems.push({
          product_id: product.id,
          quantity,
          price_at_purchase: unitPrice,
        })

        await trx('products')
          .where({ id: product.id })
          .update({
            stock_quantity: Number(product.stock_quantity) - quantity,
          })
      }

      const [created] = await trx('orders')
        .insert({
          user_id,
          total_amount,
          status: 'pending',
        })
        .returning('*')

      await trx('order_status_history').insert({
        order_id: created.id,
        status: 'pending',
        changed_by: user_id,
        remarks: 'Order created',
      })

      for (const line of lineItems) {
        await trx('order_items').insert({
          order_id: created.id,
          product_id: line.product_id,
          quantity: line.quantity,
          price_at_purchase: line.price_at_purchase,
        })
      }

      return created
    })

    res.status(201).json({
      message: 'Order created successfully',
      order,
    })
  } catch (error) {
    console.error(error)

    res.status(error.statusCode || 500).json({
      message: error.message || 'Server Error',
    })
  }
}

const getMyOrders = async (req, res) => {
  try {
    const orders = await db('orders').where({ user_id: req.user.id })

    res.json(orders)
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Server Error',
    })
  }
}

module.exports = {
  createOrder,
  getMyOrders,
}
