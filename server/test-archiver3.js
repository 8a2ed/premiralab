
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const archiver = require('archiver');
console.log('archiver keys:', Object.keys(archiver));
console.log('archiver default:', typeof archiver.default);
if (archiver.default) {
    console.log('archiver.default keys:', Object.keys(archiver.default));
    console.log('archiver.default is callable?', typeof archiver.default === 'function');
    console.log('archiver.default.create?', typeof archiver.default.create === 'function');
}
