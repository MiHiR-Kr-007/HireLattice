import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import { IStorageService } from './storage.interface.js';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class CloudinaryService implements IStorageService {
    async uploadFile(filePath: string, folderName: string = 'hirelattice/resumes'): Promise<string> {
        try {
            const result = await cloudinary.uploader.upload(filePath, {
                folder: folderName,
                resource_type: 'raw', 
            });
            
            await fs.unlink(filePath).catch(err => console.error('Failed to delete local file:', err));

            return result.secure_url;
        } catch (error) {
            console.error('Cloudinary upload failed:', error);
            throw new Error('Failed to upload file to cloud storage');
        }
    }
};