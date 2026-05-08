import multer from 'multer';
import { AppError } from '../shared/core/errors';

const memory = multer.memoryStorage();

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowedMimes.includes(file.mimetype)) cb(null, true);
  else cb(new AppError('Only PDF or Word documents are allowed for CV', 400));
};

/** CV — bellek → Supabase Storage */
export const cvUpload = multer({
  storage: memory,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});
