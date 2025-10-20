export const CLOUDINARY_CONFIG = {
    cloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'deosiscoa',
    uploadPreset: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'LiveTalk_ChatApp',
    uploadUrl: (cloud = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'deosiscoa') =>
        `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
};
