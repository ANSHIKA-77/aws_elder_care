// controllers/gallery.controller.js
const Gallery = require('../models/galleryModel');
const path = require('path');
const fs = require('fs').promises;
const { resolveTargetUser, resolveGroupUserIds } = require('../middleware/resolveTargetUser');

/**
 * @route   GET /api/v1/gallery
 * @desc    Get all photos.
 *          Client → own photos. Caretaker → all group members' photos (merged).
 *          Pass ?clientId=xxx to filter to one client.
 * @access  Private
 */
exports.getPhotos = async (req, res, next) => {
  try {
    const userIds = await resolveGroupUserIds(req);
    const query = req.user.groupId
      ? { $or: [{ userId: { $in: userIds } }, { groupId: req.user.groupId }] }
      : { userId: { $in: userIds } };

    const photos = await Gallery.find(query)
      .sort({ uploadedAt: -1 })
      .select('-__v');

    res.status(200).json({ success: true, count: photos.length, data: photos });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/v1/gallery/upload
 * @desc    Upload a new photo.
 *          Caretaker can upload a photo FOR a client via ?clientId=xxx.
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

    // Determine which user this photo belongs to
    const targetUserId = await resolveTargetUser(req);

    const photo = await Gallery.create({
      userId: targetUserId,
      groupId: req.user.groupId || null,
      title: title.trim(),
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`
    });

    res.status(201).json({ success: true, data: photo });
  } catch (err) {
    // Clean up uploaded file if anything failed
    if (req.file) {
      const filepath = path.join(__dirname, '../public/uploads', req.file.filename);
      await fs.unlink(filepath).catch(e => console.error('Failed to delete file:', e));
    }
    next(err);
  }
};

/**
 * @route   DELETE /api/v1/gallery/:id
 * @desc    Delete a photo.
 *          Owner (client) can always delete their own photos.
 *          Caretaker can delete any photo belonging to their group.
 * @access  Private
 */
exports.deletePhoto = async (req, res, next) => {
  try {
    const userIds = await resolveGroupUserIds(req);

    const photo = await Gallery.findById(req.params.id);

    if (!photo) {
      const error = new Error('Photo not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify the photo belongs to someone in the requester's group
    const isAuthorised = userIds.some(uid => uid.toString() === photo.userId.toString()) ||
      (req.user.groupId && photo.groupId && req.user.groupId.toString() === photo.groupId.toString());
    if (!isAuthorised) {
      const error = new Error('Not authorised to delete this photo');
      error.statusCode = 403;
      throw error;
    }

    // Delete file from disk
    const filepath = path.join(__dirname, '../public/uploads', photo.filename);
    await fs.unlink(filepath).catch(e => console.error('File not found on disk:', e));

    await photo.deleteOne();

    res.status(200).json({ success: true, message: 'Photo deleted' });
  } catch (err) {
    next(err);
  }
};
