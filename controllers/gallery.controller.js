const Gallery = require('../models/galleryModel');
const path = require('path');
const fs = require('fs').promises;

/**
 * @desc    Get all photos for user
 * @route   GET /api/v1/gallery
 * @access  Private
 */
exports.getPhotos = async (req, res, next) => {
  try {
    const photos = await Gallery.find({ userId: req.user.id })
      .sort({ uploadedAt: -1 })
      .select('-__v');

    res.status(200).json({
      success: true,
      count: photos.length,
      data: photos
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload new photo
 * @route   POST /api/v1/gallery/upload
 * @access  Private
 */
exports.uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error('Please upload a photo');
      error.statusCode = 400;
      throw error;
    }

    const { title } = req.body;
    
    if (!title || title.trim() === '') {
      const error = new Error('Please provide a photo title');
      error.statusCode = 400;
      throw error;
    }

    const photo = await Gallery.create({
      userId: req.user.id,
      title: title.trim(),
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`
    });

    res.status(201).json({
      success: true,
      data: photo
    });
  } catch (error) {
    // Delete uploaded file if database save failed
    if (req.file) {
      const filepath = path.join(__dirname, '../public/uploads', req.file.filename);
      await fs.unlink(filepath).catch(err => console.error('Failed to delete file:', err));
    }
    next(error);
  }
};

/**
 * @desc    Delete photo
 * @route   DELETE /api/v1/gallery/:id
 * @access  Private
 */
exports.deletePhoto = async (req, res, next) => {
  try {
    const photo = await Gallery.findById(req.params.id);

    if (!photo) {
      const error = new Error('Photo not found');
      error.statusCode = 404;
      throw error;
    }

    // Check ownership
    if (photo.userId.toString() !== req.user.id) {
      const error = new Error('Not authorized to delete this photo');
      error.statusCode = 403;
      throw error;
    }

    // Delete file from disk
    const filepath = path.join(__dirname, '../public/uploads', photo.filename);
    await fs.unlink(filepath).catch(err => console.error('File not found on disk:', err));

    // Delete from database
    await photo.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Photo deleted'
    });
  } catch (error) {
    next(error);
  }
};
