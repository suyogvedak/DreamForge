// server/routes/diagnose_routes.mjs
// Diagnostic script to import & verify route modules
import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

// Compute __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We want the routes directory that is adjacent to this file (i.e. server/routes)
const routesDir = path.join(__dirname); // this file lives in server/routes

if (!fs.existsSync(routesDir)) {
  console.error('routes directory not found:', routesDir);
  process.exit(1);
}

const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js') || f.endsWith('.mjs'));
console.log('Route files found:', files);

for (const f of files) {
  const full = path.join(routesDir, f);
  console.log('\n===> importing', f);
  try {
    await import(pathToFileURL(full).href);
    console.log('   OK:', f);
  } catch (err) {
    console.error('!!! Import ERROR for', f);
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
}
console.log('\nAll route modules imported OK.');
