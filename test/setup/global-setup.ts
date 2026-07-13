import * as dotenv from 'dotenv';
import * as path from 'path';

// Runs once before all integration test suites.
// Loads .env.test so DATABASE_URL points to the Neon test DB.
export default async function globalSetup() {
  dotenv.config({ path: path.resolve(__dirname, '../../.env.test'), override: true });
  console.log('\n🧪  Integration test DB:', process.env.DATABASE_URL?.split('@')[1]);
}
