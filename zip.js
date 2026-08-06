const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = 'C:\\Users\\Admin\\Downloads\\bình-chọn-giáo-viên';
const desktopZip = 'C:\\Users\\Admin\\Desktop\\SourceCode_UploadToGitHub_New.zip';

if (fs.existsSync(desktopZip)) {
  fs.unlinkSync(desktopZip);
}

const items = ['src', 'public', 'server.ts', 'package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json', 'index.html', 'README.md'];
const absoluteItems = items.map(i => `'${path.join(rootDir, i)}'`).join(', ');

const command = `powershell -Command "Compress-Archive -Path ${absoluteItems} -DestinationPath '${desktopZip}' -Force"`;

console.log("Running command...");
execSync(command);
console.log("ZIP CREATED SUCCESSFULLY AT:", desktopZip);
