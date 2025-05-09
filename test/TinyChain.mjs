import stringify from 'safe-stable-stringify';
import { ColorSafeStringify } from 'tiny-essentials';
import { Buffer } from 'buffer';

import { TinyChain } from '../dist/index.mjs';

const colorJsonSafe = new ColorSafeStringify();
const colorSafeStringify = (json) => colorJsonSafe.colorize(stringify(json, null, 2));

const tinyWalletSimulation = async () => {
  console.log('🌱 Initializing test blockchain...');

  const chainCfg = {
    currencyMode: true,
    payloadMode: true,
    difficulty: 1,
    admins: ['adminUser'],
    initialBalances: {
      alice: 1000000000n,
      bob: 1000000000n,
      charlie: 1000000000n,
      adminUser: 1000000000n,
    },
    halvingInterval: 3, // A cada 3 blocos
  };

  const chain = new TinyChain.Instance(chainCfg);
  await chain.init();

  // Verifica balances
  console.log('📊 User balances:');
  for (const [user, balance] of Object.entries(chain.balances))
    console.log(`   - ${user}: ${balance}`);

  // Admin envia saldo para Alice à força
  const block1 = chain.createBlock('adminUser', 'Admin enters here', [
    {
      from: 'alice',
      to: 'bob',
      amount: 5000000n,
    },
  ]);

  await chain.mineBlock('miner', block1);
  console.log('✅ Admin forced 5000000n to Alice');

  // Alice envia para Bob
  const block2 = chain.createBlock('alice', 'Alice builds', [
    {
      from: 'alice',
      to: 'bob',
      amount: 2000000n,
    },
  ]);

  await chain.mineBlock('miner', block2);
  console.log('✅ Alice sent 2000000n to Bob');

  // Bob tenta enviar dinheiro que não tem de Charlie (deve falhar)
  const block3 = chain.createBlock('bob', 'Bob pays fail', [
    {
      from: 'charlie',
      to: 'bob',
      amount: 500000n,
    },
  ]);

  await chain
    .mineBlock('miner', block3)
    .catch((err) => console.log("❌ As expected, Bob can't send from Charlie:", err.message));

  // Charlie recebe de Bob
  const block4 = chain.createBlock('bob', 'Bob pays back', [
    {
      from: 'bob',
      to: 'charlie',
      amount: 1000000n,
    },
  ]);

  await chain.mineBlock('miner', block4);
  console.log('✅ Bob sent 1000000n to Charlie');

  // Verificar dados
  console.log('📊 Final data:');
  console.log(colorSafeStringify(chain.getAllChainData()));

  // Verifica balances
  console.log('📊 Final balances:');
  for (const [user, balance] of Object.entries(chain.balances))
    console.log(`   - ${user}: ${balance}`);

  // Exportar e importar parcialmente (blocos 1 a 2)
  const exportedChain = chain.exportChain();
  const newChain = new TinyChain.Instance(chainCfg);
  newChain.importChain(exportedChain);
  console.log('📦 Imported chain');

  console.log('📊 Imported chain balances:');
  for (const [user, balance] of Object.entries(newChain.balances))
    console.log(`   - ${user}: ${balance}`);

  console.log('📊 Imported data:');
  console.log(colorSafeStringify(newChain.getAllChainData()));

  // Validar range
  const isValid = newChain.isValid(1, 2);
  console.log(`🧪 Range 1-2 is ${isValid ? 'valid ✅' : 'invalid ❌'}`);

  console.log('📊 Block 2 balances:');
  const block2Balances = chain.getBalancesAt(0, 2);
  for (const [user, balance] of Object.entries(block2Balances))
    console.log(`   - ${user}: ${balance}`);

  // Testar halving do reward (3 blocos = reward cai)
  const halvingBlocks = [];
  for (let i = 0; i < 20; i++) {
    const block = chain.createBlock('alice');
    halvingBlocks.push(chain.mineBlock('miner', block));
  }
  await Promise.all(halvingBlocks);

  console.log('📉 Halving tested');

  console.log('📊 Final Having balances:');
  for (const [user, balance] of Object.entries(chain.balances))
    console.log(`   - ${user}: ${balance}`);
  console.log(`📊 Burned balance: ${chain.getBurnedBalance().toString()}`);

  console.log('🏁 Test completed!');
};

const tinySignatureTest = async () => {
  console.log('\n🔐🔹 TinySecp256k1 Signature Test 🔹🔐\n');

  const signer = new TinyChain.Secp256k1();
  await signer.init();

  const privateKey = signer.getPrivateKeyHex();
  const publicKey = signer.getAddress();

  console.log('🗝️  Keys');
  console.log('──────────────────────────────');
  console.log(`🔒 Private Key : ${privateKey}`);
  console.log(`🔓 Public Key  : ${publicKey}\n`);

  const message = 'Hello Tinychain! 🪙';
  const messageBuffer = Buffer.from(message, 'utf8');

  console.log('✍️  Signing with ECDSA (DER)');
  console.log('──────────────────────────────');
  const signature = signer.signECDSA(messageBuffer);
  console.log(`📄 Signature (DER): ${signature.toString('hex')}`);

  const validECDSA = signer.verifyECDSA(messageBuffer, signature, publicKey);
  console.log(`✅ ECDSA Signature Valid? ${validECDSA}\n`);

  const recoverableMessage = 'Hello world';
  console.log('♻️  Signing with Recovery Param');
  console.log('──────────────────────────────');
  const sig = signer.signMessage(recoverableMessage);
  console.log(`📄 Signature (Recoverable): ${sig.toString('hex')}`);

  const recoveredPubKey = signer.recoverMessage(recoverableMessage, sig);
  const isValid = recoveredPubKey === signer.getAddress();
  console.log(`🔍 Message Signature Valid? ${isValid}\n`);
  console.log(`📄 Message Signature (Recoverable): ${recoveredPubKey}`);

  console.log('✅ Test Completed!\n');
};

const tinyBtcSignatureTest = async () => {
  console.log('\n🔐🔹 TinySecp256k1 BTC Signature Test 🔹🔐\n');

  const signer = new TinyChain.Btc256k1();
  await signer.init();

  const privateKey = signer.getPrivateKeyHex();
  const publicKey = signer.getAddress();

  console.log('🗝️  Keys (BTC)');
  console.log('──────────────────────────────');
  console.log(`🔒 Private Key : ${privateKey}`);
  console.log(`🔓 Public Key  : ${publicKey}\n`);

  const recoverableMessage = 'Hello world';
  console.log('♻️  Signing message (BTC)');
  console.log('──────────────────────────────');
  const sig = signer.signMessage(recoverableMessage);
  console.log(`📄 Signature (Recoverable): ${sig.toString('hex')}`);

  const recoveredPubKey = signer.recoverMessage(recoverableMessage, sig);

  const isValid = recoveredPubKey === signer.getAddress();
  console.log(`🔍 Message Signature Valid? ${isValid}\n`);
  console.log(`📄 Message Signature (Recoverable): ${recoveredPubKey}`);

  console.log('✅ Test Completed! (BTC)\n');
};

const testTinyEthSecp256k1 = async () => {
  console.log('\n🔐🔹 TinySecp256k1 ETH Signature Test 🔹🔐\n');

  const signer = new TinyChain.Eth256k1();
  await signer.init();

  const privateKey = signer.getPrivateKeyHex();
  const publicKey = signer.getAddress();

  console.log('🗝️  Keys (ETH)');
  console.log('──────────────────────────────');
  console.log(`🔒 Private Key : ${privateKey}`);
  console.log(`🔓 Public Key  : ${publicKey}\n`);

  const recoverableMessage = 'Hello world';
  console.log('♻️  Signing message (ETH)');
  console.log('──────────────────────────────');
  const sig = signer.signMessage(recoverableMessage);
  console.log(`📄 Signature (Recoverable): ${sig.toString('hex')}`);

  const recoveredPubKey = signer.recoverMessage(recoverableMessage, sig);

  const isValid = recoveredPubKey === signer.getAddress();
  console.log(`🔍 Message Signature Valid? ${isValid}\n`);
  console.log(`📄 Message Signature (Recoverable): ${recoveredPubKey}`);

  console.log('✅ Test Completed! (ETH)\n');
};

const tinyChainSimulation = async () => {
  await tinySignatureTest();
  await tinyBtcSignatureTest();
  await testTinyEthSecp256k1();
  await tinyWalletSimulation();
};

export default tinyChainSimulation;
