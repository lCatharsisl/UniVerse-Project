import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppError } from '../shared/core/errors';

const uploadDir = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (_req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    },
});

const memory = multer.memoryStorage();

const imageMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (imageMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError('Only image files are allowed!', 400));
    }
};

/** Social posts: images + MP4 (larger limit for short clips). */
const socialPostFileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = [...imageMimeTypes, 'video/mp4'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError('Only images (JPEG, PNG, WebP) or MP4 video are allowed.', 400));
    }
};

export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    }
});

export const uploadSocialPost = multer({
    storage: storage,
    fileFilter: socialPostFileFilter,
    limits: {
        fileSize: 80 * 1024 * 1024, // 80MB for MP4
    }
});

/** In-memory: use when uploading to object storage (e.g. Supabase) in the same request. */
export const uploadImageMemory = multer({
    storage: memory,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
});

/** Profil avatar + kapak (aynı filtre, bellek). */
export const uploadProfileImages = multer({
    storage: memory,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
});
