
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const archiver = require('archiver');
console.log('Type of archiver:', typeof archiver);
console.log('Keys of archiver:', Object.keys(archiver));
