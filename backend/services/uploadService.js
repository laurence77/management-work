const multer = require('multer');
const path = require('path');
const { supabaseAdmin } = require('../config/supabase');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

class UploadService {
  // Upload image to Supabase Storage
  static async uploadImage(file, folder = 'celebrities') {
    try {
      if (!file) {
        throw new Error('No file provided');
      }

      // Generate unique filename
      const fileExt = path.extname(file.originalname);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabaseAdmin.storage
        .from('images')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('images')
        .getPublicUrl(filePath);

      return {
        path: filePath,
        url: publicUrl,
        filename: fileName,
        size: file.size,
        mimetype: file.mimetype
      };
    } catch (error) {
      console.error('Upload service error:', error);
      throw error;
    }
  }

  // Delete image from Supabase Storage
  static async deleteImage(filePath) {
    try {
      if (!filePath) {
        throw new Error('No file path provided');
      }

      const { data, error } = await supabaseAdmin.storage
        .from('images')
        .remove([filePath]);

      if (error) {
        console.error('Supabase delete error:', error);
        throw new Error(`Delete failed: ${error.message}`);
      }

      return { success: true, data };
    } catch (error) {
      console.error('Delete service error:', error);
      throw error;
    }
  }

  // Upload multiple images
  static async uploadMultipleImages(files, folder = 'celebrities') {
    try {
      if (!files || files.length === 0) {
        throw new Error('No files provided');
      }

      const uploadPromises = files.map(file => this.uploadImage(file, folder));
      const results = await Promise.all(uploadPromises);

      return results;
    } catch (error) {
      console.error('Multiple upload error:', error);
      throw error;
    }
  }

  // Validate image file
  static validateImageFile(file) {
    const errors = [];

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      errors.push('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push('File size too large. Maximum size is 10MB.');
    }

    // Check filename
    if (!file.originalname || file.originalname.length > 255) {
      errors.push('Invalid filename.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get storage info
  static async getStorageInfo() {
    try {
      // This would need to be implemented based on Supabase's storage API
      // Currently Supabase doesn't have a direct way to get storage usage
      return {
        message: 'Storage info not available via Supabase API'
      };
    } catch (error) {
      console.error('Storage info error:', error);
      throw error;
    }
  }
}

module.exports = {
  UploadService,
  upload
};