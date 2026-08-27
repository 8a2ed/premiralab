
import { runBackup } from './dist/services/backup.js';
console.log('Testing runBackup...');
runBackup().then(() => console.log('Done')).catch(console.error);
