const cloudinaryPkg = require('cloudinary');
const cloudinary = cloudinaryPkg.v2;

console.log('Keys on pkg:', Object.keys(cloudinaryPkg));
console.log('Keys on v2:', Object.keys(cloudinary));
console.log('Has uploader?', !!cloudinary.uploader);

cloudinary.config({
  cloud_name: 'test',
  api_key: 'test',
  api_secret: 'test'
});

const CloudinaryStoragePkg = require('multer-storage-cloudinary');
const CloudinaryStorage = CloudinaryStoragePkg.CloudinaryStorage || CloudinaryStoragePkg;

try {
  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: { folder: 'test' }
  });
  console.log('Storage created successfully');
} catch (e) {
  console.log('Storage creation failed:', e);
}
