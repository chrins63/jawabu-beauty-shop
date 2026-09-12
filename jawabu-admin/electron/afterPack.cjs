const path = require('path');
const { spawnSync } = require('child_process');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') {
    return;
  }

  const exeName = `${context.packager.appInfo.productFilename}.exe`;
  const exePath = path.join(context.appOutDir, exeName);
  const iconPath = path.join(context.packager.projectDir, 'build', 'icon.ico');
  const version = context.packager.appInfo.version;
  const rceditBin = path.join(
    context.packager.projectDir,
    'node_modules',
    'rcedit',
    'bin',
    'rcedit-x64.exe'
  );

  const result = spawnSync(
    rceditBin,
    [
      exePath,
      '--set-icon',
      iconPath,
      '--set-version-string',
      'CompanyName',
      'Sleek Sisters',
      '--set-version-string',
      'FileDescription',
      'Sleek Sisters Admin',
      '--set-version-string',
      'ProductName',
      'Sleek Sisters Admin',
      '--set-version-string',
      'LegalCopyright',
      'Sleek Sisters',
      '--set-file-version',
      version,
      '--set-product-version',
      version,
    ],
    { stdio: 'inherit' }
  );

  if (result.status !== 0) {
    throw new Error(`Failed to stamp Sleek Sisters icon onto ${exeName}`);
  }
};
