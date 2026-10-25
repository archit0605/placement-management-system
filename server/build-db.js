// Rebuilds the database from the four SQL files, in order.   npm run db:build
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db');
const files = ['01_schema.sql', '02_views.sql', '03_triggers.sql', '04_data.sql'];

for (const file of files) {
  const result = spawnSync('mysql', ['-u', process.env.DB_USER || 'root'], {
    input: readFileSync(path.join(dir, file)),
    env: { ...process.env, MYSQL_PWD: process.env.DB_PASSWORD || '' },
    encoding: 'utf8',
  });
  if (result.error) {
    console.error(`Could not start the mysql client: ${result.error.message}`);
    console.error('Add the MySQL "bin" folder to your PATH, then run this again.');
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`${file} failed:\n${result.stderr}`);
    process.exit(1);
  }
  console.log(`ok  ${file}`);
}
console.log('Database spit_placement is ready.');
