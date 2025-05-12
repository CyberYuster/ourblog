require('dotenv').config();
const path = require('path');
const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');

const isProduction = process.env.NODE_ENV === 'production';

// Local storage configuration
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  }
});

// AWS S3 configuration
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const s3Storage = multerS3({
  s3: s3,
  bucket: process.env.AWS_BUCKET_NAME,
  acl: 'public-read',
  metadata: (req, file, cb) => {
    cb(null, { fieldName: file.fieldname });
  },
  key: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `uploads/${Date.now()}${ext}`);
  }
});

// Unified upload middleware
const upload = multer({
  storage: isProduction ? s3Storage : localStorage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    mimetype && extname ? cb(null, true) : cb(new Error('Images only!'));
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Public URL generator
const getFileUrl = (filename) => {
  if (isProduction) {
    return `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${filename}`;
  } else {
    return `/uploads/${path.basename(filename)}`;
  }
};

module.exports = { upload, getFileUrl };