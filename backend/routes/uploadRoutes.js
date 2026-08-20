const express = require('express')

const router = express.Router()

const upload = require('../middleware/uploadMiddleware')

const { protect } = require('../middleware/authMiddleware')

router.post(
  '/',
  protect,
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload error'
        })
      }
      next()
    })
  },
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      })
    }

    res.status(200).json({
      success: true,
      imageUrl: req.file.path,
      filename: req.file.filename,
      mimetype: req.file.mimetype
    })
  }
)

module.exports = router