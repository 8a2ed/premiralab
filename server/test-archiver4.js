
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const archiver = require('archiver');
console.log('Archiver class?', typeof archiver.Archiver === 'function');
const archive = new archiver.Archiver('zip', { zlib: { level: 9 } });
console.log('archive pointer?', archive.pointer());
