
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Archiver } = require('archiver');
const fs = require('fs');
const output = fs.createWriteStream('test.zip');
const archive = new Archiver('zip', { zlib: { level: 9 } });
archive.pipe(output);
archive.append('hello world', { name: 'hello.txt' });
archive.finalize().then(() => console.log('Finalized!'));
