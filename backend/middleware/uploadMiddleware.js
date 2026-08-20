const multer = require('multer')

const cloudinary = require('../config/cloudinary')

const {
  CloudinaryStorage
} = require('multer-storage-cloudinary')

const storage = new CloudinaryStorage({

  cloudinary,

  params: {

    folder: 'jawabu-beauty-shop',

    allowed_formats: ['jpg', 'jpeg', 'png', 'webp']

  }

})

const upload = multer({

  storage,

  limits: {
    fileSize: 2 * 1024 * 1024
  }

})

module.exports = upload