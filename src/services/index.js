import cloudinary from '../config/cloudinary.js';

export const uploadImage = async (imagePath) => {
  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: 'votechain',
    });
    console.log('Image uploaded successfully:', result.url);
    return result.url;
  } catch (error) {
    console.error('Error uploading image:', error);
  }
};
