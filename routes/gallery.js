const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verifyToken } = require('../middleware/auth.middleware');
const {
  getPhotos,
  uploadPhoto,
  deletePhoto
} = require('../controllers/gallery.controller');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

// Apply authentication to all routes
router.use(verifyToken);

/**
 * @route   GET /api/v1/gallery
 * @desc    Get all photos for logged-in user
 * @access  Private
 */
router.get('/', getPhotos);

/**
 * @route   POST /api/v1/gallery/upload
 * @desc    Upload new photo
 * @access  Private
 */
router.post('/upload', upload.single('photo'), uploadPhoto);

/**
 * @route   DELETE /api/v1/gallery/:id
 * @desc    Delete photo
 * @access  Private
 */
router.delete('/:id', deletePhoto);

module.exports = router;
