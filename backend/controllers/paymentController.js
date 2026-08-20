const db = require('../config/db')

const createPayment = async (req, res) => {
  try {
    const { order_id, payment_method } = req.body

    const order = await db('orders')
      .where({
        id: order_id,
        user_id: req.user.id,
      })
      .first()

    if (!order) {
      return res.status(404).json({
        message: 'Order not found',
      })
    }

    const existing = await db('payments').where({ order_id }).first()

    if (existing) {
      return res.status(409).json({
        message: 'Payment already recorded for this order',
        payment: existing,
      })
    }

    const [payment] = await db('payments')
      .insert({
        order_id,
        amount: order.total_amount,
        payment_method: payment_method || 'M-Pesa',
        transaction_id: null,
        status: 'pending',
      })
      .returning('*')

    res.status(201).json({
      message:
        'Payment recorded as pending. Complete it through the payment provider webhook.',
      payment,
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Server Error',
    })
  }
}

const getMyPayments = async (req, res) => {
  try {
    const payments = await db('payments')
      .join('orders', 'payments.order_id', 'orders.id')
      .select('payments.*')
      .where('orders.user_id', req.user.id)

    res.json(payments)
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Server Error',
    })
  }
}

module.exports = {
  createPayment,
  getMyPayments,
}
