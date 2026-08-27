
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const archiver = require('archiver');
console.log('Is it a function?', typeof archiver === 'function');
console.log('Does it have create?', typeof archiver.create === 'function');
console.log('What if we import *', '... skipping');
