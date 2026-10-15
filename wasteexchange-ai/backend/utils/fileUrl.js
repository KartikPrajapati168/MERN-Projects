// backend/utils/fileUrl.js
/**
 * Get public URL for an uploaded file.
 * - Cloudinary (multer-storage-cloudinary): file.path = full URL
 * - Local storage fallback: file.filename
 */
const getFileUrl = (file) => {
  if (!file) return '';
  if (file.path && typeof file.path === 'string' && file.path.startsWith('http')) {
    return file.path; // Cloudinary URL
  }
  if (file.secure_url) return file.secure_url; // Cloudinary alt field
  if (file.filename) return `/uploads/${file.filename}`; // local fallback
  return '';
};

const getFileUrls = (files) => {
  if (!Array.isArray(files)) return [];
  return files.map(getFileUrl).filter(Boolean);
};

module.exports = { getFileUrl, getFileUrls };