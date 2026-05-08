import path from 'node:path';
import dotenv from 'dotenv';

const backendRoot = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(backendRoot, '_env') });
dotenv.config({ path: path.join(backendRoot, '.env') });
dotenv.config();
