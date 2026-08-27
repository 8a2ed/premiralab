
import { ZipArchive } from 'archiver';
import fs from 'fs';
const archive = new ZipArchive({ zlib: { level: 9 } });
const output = fs.createWriteStream('test-zip.zip');
archive.pipe(output);
archive.append('hello world', { name: 'hello.txt' });
archive.finalize().then(() => console.log('success!'));
