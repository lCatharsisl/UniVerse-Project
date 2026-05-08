import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { uploadImageMemory } from '../middleware/upload';
import { scanUploadedFiles } from '../middleware/scanUploadedFiles';
import { errorHandler } from '../middleware/errorHandler';

function createApp() {
  const app = express();
  app.post('/upload', uploadImageMemory.single('file'), scanUploadedFiles, (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler);
  return app;
}

describe('Upload security middleware', () => {
  afterEach(() => {
    delete process.env.MALWARE_SCAN_MODE;
    delete process.env.MALWARE_SCAN_FAIL_ON_ERROR;
    delete process.env.VIRUSTOTAL_API_KEY;
  });

  it('allows uploads when scanner is disabled', async () => {
    process.env.MALWARE_SCAN_MODE = 'disabled';

    const response = await request(createApp())
      .post('/upload')
      .attach('file', Buffer.from('safe image payload'), {
        filename: 'avatar.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ok: true });
  });

  it('rejects suspicious uploads in mock mode', async () => {
    process.env.MALWARE_SCAN_MODE = 'mock';

    const response = await request(createApp())
      .post('/upload')
      .attach('file', Buffer.from('safe image payload'), {
        filename: 'eicar-avatar.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: 'Upload rejected by malware scanner' });
  });

  it('fails closed when VirusTotal mode is strict and API key is missing', async () => {
    process.env.MALWARE_SCAN_MODE = 'virustotal';
    process.env.MALWARE_SCAN_FAIL_ON_ERROR = 'true';

    const response = await request(createApp())
      .post('/upload')
      .attach('file', Buffer.from('safe image payload'), {
        filename: 'avatar.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ error: 'Upload security scan failed' });
  });
});
