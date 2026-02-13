import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer to use memory storage
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

const storage = multer.memoryStorage();
export const upload = multer({ 
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and Images are allowed.'));
    }
  }
});

// Helper function to upload buffer to Cloudinary
export const uploadToCloudinary = (fileBuffer: Buffer, folder: string = 'school-management'): Promise<{ secure_url: string; public_id: string }> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'auto',
        access_mode: 'public',
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Upload failed'));
        resolve(result); // result contains secure_url and public_id
      }
    );
    const readableStream = new Readable();
    readableStream.push(fileBuffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

// Helper function to delete an asset from Cloudinary
export const deleteFromCloudinary = (publicId: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
};

/**
 * Extracts the public ID from a Cloudinary URL.
 * Example: https://res.cloudinary.com/dv5hpv9sl/image/upload/v1723456789/assignments/sample.pdf
 * Returns: assignments/sample
 */
export const getPublicIdFromUrl = (url: string): string | null => {
  try {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    
    // Public ID is everything after the version (v[digits])
    // The parts after 'upload' are usually ['v123...', 'folder', 'subfolder', 'filename.ext']
    const afterUpload = parts.slice(uploadIndex + 1);
    
    // Remove the version part if it exists (starts with 'v')
    if (afterUpload[0].startsWith('v') && !isNaN(Number(afterUpload[0].substring(1)))) {
        afterUpload.shift();
    }
    
    const publicIdWithExt = afterUpload.join('/');
    // Remove file extension
    return publicIdWithExt.replace(/\.[^/.]+$/, "");
  } catch (error) {
    console.error("Error extracting public ID:", error);
    return null;
  }
};
