const db = require('../config/db')

const getAllOrders = async (req, res) => {

  try {

    const orders = await db('orders')
      .leftJoin('users', 'orders.user_id', 'users.id')
      .select(
        'orders.id',
        'orders.order_date',
        'orders.total_amount',
        'orders.status',
        'orders.created_at',
        'users.id as customer_id',
        'users.email'
      )
      .orderBy('orders.created_at', 'desc')

    res.json(orders)

  } catch (error) {

    console.error(error)

    res.status(500).json({
      message: 'Server Error'
    })

  }

}
const getDashboardStats = async (req, res) => {

  try {

    // Total users
    const totalUsers = await db('users')
      .count('* as count')
      .first()

    // Total products
    const totalProducts = await db('products')
      .count('* as count')
      .first()

    // Total orders
    const totalOrders = await db('orders')
      .count('* as count')
      .first()

    // Total bookings
    const totalBookings = await db('bookings')
      .count('* as count')
      .first()

    // Revenue
    const revenueResult = await db('orders')
      .sum('total_amount as total')
      .first()

    // Recent orders
    const recentOrders = await db('orders')
      .orderBy('created_at', 'desc')
      .limit(5)

    // Recent bookings
    const recentBookings = await db('bookings')
      .orderBy('created_at', 'desc')
      .limit(5)

    res.json({

      success: true,

      stats: {

        totalUsers: Number(totalUsers.count),

        totalProducts: Number(totalProducts.count),

        totalOrders: Number(totalOrders.count),

        totalBookings: Number(totalBookings.count),

        totalRevenue: Number(revenueResult.total || 0)

      },

      recentOrders,

      recentBookings

    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      message: 'Server Error'
    })
  }
}

module.exports = {
  getDashboardStats,
  getAllOrders
}
