// backend/middleware/upload.js
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Dynamic folder based on route
const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const fullPath = (req.baseUrl || '') + (req.path || '');
    let subfolder = 'misc';

    if (fullPath.includes('/profile-photo')) subfolder = 'profile';
    else if (fullPath.includes('/listings')) subfolder = 'listings';
    else if (fullPath.includes('/requirements')) subfolder = 'requirements';
    else if (fullPath.includes('/deals')) subfolder = 'deals';
    else if (fullPath.includes('/messages')) subfolder = 'messages';

    return {
      folder: `wasteexchange/${subfolder}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = upload;