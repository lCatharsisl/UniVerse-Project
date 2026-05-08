import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from './auth';
import { AppError } from '../shared/core/errors';
import { scanUploadedFile } from '../integrations/malwareScanner';
import { logger } from '../utils/logger';

function collectFiles(req: AuthenticatedRequest): Express.Multer.File[] {
  const files: Express.Multer.File[] = [];
  if (req.file) files.push(req.file);

  if (Array.isArray(req.files)) {
    files.push(...req.files);
  } else if (req.files && typeof req.files === 'object') {
    for (const entry of Object.values(req.files)) {
      if (Array.isArray(entry)) files.push(...entry);
    }
  }

  return files;
}

export async function scanUploadedFiles(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const files = collectFiles(req);
  if (files.length === 0) return next();

  try {
    for (const file of files) {
      const result = await scanUploadedFile(file);
      logger.info('Upload scan completed', {
        provider: result.provider,
        verdict: result.verdict,
        fileName: file.originalname,
        mimeType: file.mimetype,
        userId: req.userId ?? null,
        path: req.originalUrl,
      });

      if (result.verdict === 'infected') {
        return next(new AppError('Upload rejected by malware scanner', 400));
      }
    }

    return next();
  } catch (error: any) {
    logger.warn('Upload scan failed', {
      error: error?.message || 'unknown_error',
      userId: req.userId ?? null,
      path: req.originalUrl,
      provider: process.env.MALWARE_SCAN_MODE || 'disabled',
    });

    if (String(process.env.MALWARE_SCAN_FAIL_ON_ERROR || '').toLowerCase() === 'true') {
      return next(new AppError('Upload security scan failed', 503));
    }

    return next();
  }
}

