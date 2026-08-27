
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const archiver = require('archiver');
console.log('archiver default?', typeof archiver.default);
console.log('archiver.create?', typeof archiver.create);
if (typeof archiver.default === 'function') {
   console.log('Wait, is default the factory?');
}
