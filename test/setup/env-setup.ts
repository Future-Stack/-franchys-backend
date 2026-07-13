import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.test before any tests run — overrides any existing DATABASE_URL
dotenv.config({
  path: path.resolve(__dirname, '../../.env.test'),
  override: true,
});
