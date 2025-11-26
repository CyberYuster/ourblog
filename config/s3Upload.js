const path = require('path');
const multer = require('multer');
const { S3Client, DeleteObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs').promises;
const multerS3 = require('multer-s3');

const isProduction = process.env.NODE_ENV === 'production';

// AWS S3 Client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Storage configurations
const storage = isProduction 
  ? multerS3({
      s3: s3,
      bucket: process.env.AWS_BUCKET_NAME,
      acl: 'public-read',
      metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
      key: (req, file, cb) => cb(null, `uploads/${Date.now()}${path.extname(file.originalname)}`)
    })
  : multer.diskStorage({
      destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads')),
      filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
    });

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const validTypes = /jpeg|jpg|png|gif/;
    const isValidType = validTypes.test(file.mimetype);
    const isValidExt = validTypes.test(path.extname(file.originalname).toLowerCase());
    isValidType && isValidExt ? cb(null, true) : cb(new Error('Only image files are allowed!'));
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// File URL Generator
const getFileUrl = (filename) => {
  return isProduction
    ? `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${filename}`
    : `/uploads/${path.basename(filename)}`;
};

// Delete File
const deleteFile = async (fileUrl) => {
  try {
    if (isProduction) {
      const key = fileUrl.split('.com/')[1];
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key
      }));
    } else {
      const filename = path.basename(fileUrl);
      await fs.unlink(path.join(__dirname, `../public/uploads/${filename}`));
    }
    return true;
  } catch (error) {
    console.error('Delete error:', error);
    return false;
  }
};

// Update File (Delete old + Upload new)
const updateFile = async (oldFileUrl, newFile) => {
  if (oldFileUrl) await deleteFile(oldFileUrl);
  
  return new Promise((resolve, reject) => {
    upload.single('file')({ file: newFile }, {}, async (err) => {
      if (err) reject(err);
      resolve(getFileUrl(newFile.path || newFile.key));
    });
  });
};

module.exports = { upload, getFileUrl, deleteFile, updateFile };