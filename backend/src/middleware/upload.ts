import multer from 'multer';
import { AppError } from '../shared/core/errors';

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

/** Lost/found görsel yükleme — bellek → Supabase Storage. */
export const upload = multer({
  storage: memory,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

/** Gönderi medyası — bellek → Supabase Storage. */
export const uploadSocialPost = multer({
  storage: memory,
  fileFilter: socialPostFileFilter,
  limits: {
    fileSize: 80 * 1024 * 1024,
  },
});

export const uploadImageMemory = multer({
  storage: memory,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

/** Profil avatar + kapak (bellek). */
export const uploadProfileImages = multer({
  storage: memory,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
