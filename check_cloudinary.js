const cloudinaryStorage = require('multer-storage-cloudinary');
console.log('Type of export:', typeof cloudinaryStorage);
console.log('Keys:', Object.keys(cloudinaryStorage));
if (cloudinaryStorage.CloudinaryStorage) {
    console.log('CloudinaryStorage is a property');
} else {
    console.log('CloudinaryStorage is NOT a property');
}
try {
    new cloudinaryStorage.CloudinaryStorage();
} catch (e) {
    console.log('Construction failed:', e.message);
}
