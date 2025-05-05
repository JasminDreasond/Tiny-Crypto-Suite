import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TinyCertCrypto } from '../dist/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicKeyPath = path.join(__dirname, 'temp/public.pem');
const privateKeyPath = path.join(__dirname, 'temp/private.pem');
const certPath = path.join(__dirname, 'temp/cert.pem');

async function ensureDirectoryExistence(filePath) {
  const dir = path.dirname(filePath);
  try {
    await fs.promises.mkdir(dir, { recursive: true });
  } catch (err) {
    console.error('Error creating directory:', err);
  }
}

async function saveCertFiles(publicKey, privateKey, cert) {
  await ensureDirectoryExistence(publicKeyPath);
  await fs.promises.writeFile(publicKeyPath, publicKey);
  await fs.promises.writeFile(privateKeyPath, privateKey);
  await fs.promises.writeFile(certPath, cert);
}

function printSeparator(title, colorCode = '\x1b[36m') {
  const line = '─'.repeat(60);
  console.log(`\n${colorCode}%s\x1b[0m`, `\n${line}\n${title}\n${line}\n`);
}

const testWithInstance = async (cryptoInstance, title = 'Instance') => {
  printSeparator(`🔬 TESTING: ${title}`, '\x1b[35m');

  cryptoInstance.startCrypto();

  const testData = {
    name: 'Yasmin',
    isBrony: true,
    favoritePony: 'Fluttershy',
  };

  const testData2 = {
    name: 'Pudding',
    isBrony: false,
    favoritePony: 'Pinkie Pie',
    inventory: ['candy', 'cookie', 'tiny pudding'],
  };

  const encrypted = await cryptoInstance.encryptJson(testData);
  console.log('📦 Encrypted Base64:', encrypted);

  const decrypted = await cryptoInstance.decryptToJson(encrypted);
  console.log('✅ Decrypted JSON:', decrypted);

  const encrypted2 = await cryptoInstance.encryptWithoutKey(testData2);
  console.log('📦 Encrypted Base64 2:', encrypted2);

  const decrypted2 = await cryptoInstance.decryptWithoutKey(encrypted2);
  console.log('✅ Decrypted JSON 2:', decrypted2);

  const encrypted3 = await cryptoInstance.encrypt(testData2);
  console.log('📦 Encrypted Base64 3:', encrypted3);

  const decrypted3 = await cryptoInstance.decrypt(encrypted3);
  console.log('✅ Decrypted JSON 3:', decrypted3);

  console.log('🔍 Extracting certificate metadata...');
  const metadata = cryptoInstance.extractCertMetadata();
  console.log('📋 Certificate Metadata:', metadata);
};

const main = async () => {
  console.log('🔐✨ Starting TinyCertCrypto Tests');

  let cryptoInstance;

  printSeparator('📜 IN-MEMORY CERTIFICATE TESTS', '\x1b[36m');
  cryptoInstance = new TinyCertCrypto();
  const { publicKey, privateKey, cert } = await cryptoInstance.generateX509Cert(
    {
      countryName: 'BR',
      organizationName: 'JasminOrg',
      commonName: 'localhost',
      emailAddress: 'tiny@puddy.club',
    },
    { validityInYears: 3 },
  );

  console.log('💾 Saving generated certs to disk...');
  await saveCertFiles(publicKey, privateKey, cert);

  await testWithInstance(cryptoInstance, 'In-Memory Instance');

  printSeparator('📂 FILE-BASED CERTIFICATE TESTS', '\x1b[33m');
  cryptoInstance = new TinyCertCrypto({
    publicCertPath: certPath,
    privateKeyPath: privateKeyPath,
  });

  console.log('📂 Initializing instance with keys from file...');
  await cryptoInstance.init();

  await testWithInstance(cryptoInstance, 'File-Based Instance');

  printSeparator('🎉 ALL TESTS COMPLETED SUCCESSFULLY', '\x1b[32m');
};

const executeSimulationCert = () =>
  new Promise((resolve) => {
    main()
      .then(resolve)
      .catch((err) => {
        console.error('❌ Test failed:', err);
        resolve();
      });
  });

export default executeSimulationCert;
