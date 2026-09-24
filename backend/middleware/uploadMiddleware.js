const { Readable } = require('stream')
const multer = require('multer')
const cloudinary = require('../config/cloudinary')

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
  fileFilter(req, file, callback) {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      callback(new Error('Only jpg, png, and webp images are allowed'))
      return
    }

    callback(null, true)
  },
})

function uploadBuffer(file) {
  return new Promise((resolve, reject) => {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      reject(new Error('Image uploads are not configured'))
      return
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'jawabu-beauty-shop',
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          reject(error)
          return
        }

        resolve(result)
      }
    )

    Readable.from(file.buffer).pipe(stream)
  })
}

function single(fieldName) {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, async (error) => {
      if (error) {
        next(error)
        return
      }

      if (!req.file) {
        next()
        return
      }

      try {
        const result = await uploadBuffer(req.file)
        req.file.path = result.secure_url
        req.file.filename = result.public_id
        next()
      } catch (uploadError) {
        next(uploadError)
      }
    })
  }
}

module.exports = { single }
