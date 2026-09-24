const db = require('../config/db')

// CREATE PRODUCT
const createProduct = async (req, res) => {

  try {

    const {
      name,
      description,
      price,
      stock_quantity,
      image_url,
      category_id
    } = req.body

    const newProduct = await db('products')
      .insert({
        name,
        description,
        price,
        stock_quantity,
        image_url,
        category_id
      })
      .returning('*')

    res.status(201).json(newProduct[0])

  } catch (error) {

    console.error(error)

    res.status(500).json({
      message: 'Server Error'
    })
  }
}

// GET ALL PRODUCTS
const getProducts = async (req, res) => {

  try {

    const page = parseInt(req.query.page) || 1

    const limit = parseInt(req.query.limit) || 10

    const offset = (page - 1) * limit

    const search = req.query.search || ''

    const category = req.query.category || ''

    const allowedSorts = new Set([
      'created_at',
      'name',
      'price',
      'stock_quantity',
      'id',
    ])

    const requestedSort = String(req.query.sort || 'created_at')
    const sort = allowedSorts.has(requestedSort) ? requestedSort : 'created_at'

    const order = String(req.query.order || 'desc').toLowerCase() === 'asc'
      ? 'asc'
      : 'desc'

    let query = db('products')

    // Search
    if (search) {

      query = query.whereILike('name', `%${search}%`)
    }

    // Category filter
    if (category) {

      query = query.where({ category_id: category })
    }

    // Count total
    const totalQuery = query.clone()

    const totalProducts = await totalQuery.count('* as count').first()

    // Pagination + sorting
    const products = await query
      .limit(limit)
      .offset(offset)
      .orderBy(sort, order)

    res.json({

      success: true,

      currentPage: page,

      totalPages: Math.ceil(totalProducts.count / limit),

      totalProducts: Number(totalProducts.count),

      products

    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      message: 'Server Error'
    })
  }
}
// GET SINGLE PRODUCT
const getSingleProduct = async (req, res) => {

  try {

    const product = await db('products')
      .where({ id: req.params.id })
      .first()

    if (!product) {

      return res.status(404).json({
        message: 'Product not found'
      })
    }

    res.json(product)

  } catch (error) {

    console.error(error)

    res.status(500).json({
      message: 'Server Error'
    })
  }
}

const PRODUCT_FIELDS = [
  'name',
  'description',
  'price',
  'stock_quantity',
  'image_url',
  'category_id',
]

// UPDATE PRODUCT
const updateProduct = async (req, res) => {

  try {

    const updates = {}

    for (const field of PRODUCT_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: 'No valid product fields provided',
      })
    }

    const updated = await db('products')
      .where({ id: req.params.id })
      .update(updates)
      .returning('*')

    if (!updated.length) {

      return res.status(404).json({
        message: 'Product not found'
      })
    }

    res.json(updated[0])

  } catch (error) {

    console.error(error)

    res.status(500).json({
      message: 'Server Error'
    })
  }
}

// DELETE PRODUCT
const deleteProduct = async (req, res) => {

  try {

    const deleted = await db('products')
      .where({ id: req.params.id })
      .del()

    if (!deleted) {

      return res.status(404).json({
        message: 'Product not found'
      })
    }

    res.json({
      message: 'Product deleted successfully'
    })

  } catch (error) {

    console.error(error)

    res.status(500).json({
      message: 'Server Error'
    })
  }
}
module.exports = {
  createProduct,
  getProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct
}