const fs = require('node:fs');
const path = require('node:path');
const { build } = require('../package.json');
const thumbprint = fs.readFileSync(path.join(__dirname, '../.signing/thumbprint.txt'), 'utf8').trim();
if (!/^[a-f0-9]{40}$/i.test(thumbprint)) throw new Error('Invalid signing thumbprint');
module.exports = {
  ...build,
  extends: null,
  directories: { ...build.directories, output: 'release/self-signed' },
  artifactName: 'Petio Setup ${version}-self-signed.${ext}',
  forceCodeSigning: true,
  win: {
    ...build.win,
    signtoolOptions: { certificateSha1: thumbprint, signingHashAlgorithms: ['sha256'] },
  },
};
