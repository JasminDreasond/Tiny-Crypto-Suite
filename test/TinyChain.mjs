import stringify from 'safe-stable-stringify';
import { ColorSafeStringify } from 'tiny-essentials';
import { Buffer } from 'buffer';

import { TinyChain } from '../dist/index.mjs';

const colorJsonSafe = new ColorSafeStringify();
const colorSafeStringify = (json) => colorJsonSafe.colorize(stringify(json, null, 2));

const tinyWalletSimulation = async () => {
  const red = (text) => `\x1b[31m${text}\x1b[0m`;
  const green = (text) => `\x1b[32m${text}\x1b[0m`;
  const cyan = (text) => `\x1b[36m${text}\x1b[0m`;
  const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
  const bold = (text) => `\x1b[1m${text}\x1b[0m`;

  console.log(bold(cyan('\n🌱🔹━[ Tiny Wallet Simulation ]━🔹🌱\n')));

  console.log('⚙️  Initializing test blockchain...');

  const adminUser = new TinyChain.Btc256k1();
  const alice = new TinyChain.Btc256k1();
  const bob = new TinyChain.Btc256k1();
  const charlie = new TinyChain.Btc256k1();
  const miner = new TinyChain.Btc256k1();

  await Promise.all([miner.init(), adminUser.init(), alice.init(), bob.init(), charlie.init()]);

  const chainCfg = {
    signer: adminUser,
    currencyMode: true,
    payloadMode: true,
    diff: 1,
    admins: [adminUser.getPublicKeyHex()],
    initialBalances: {
      [alice.getAddress()]: 1000000000n,
      [bob.getAddress()]: 1000000000n,
      [charlie.getAddress()]: 1000000000n,
      [adminUser.getAddress()]: 1000000000n,
    },
    halvingInterval: 3,
  };

  const chain = new TinyChain.Instance(chainCfg);
  await chain.init();
  const createBlock = (content) => chain.createBlock([chain.createBlockContent(content)]);

  console.log(bold('\n📊 ━━━ User Balances ━━━━━━━━━━━━'));
  for (const [user, balance] of Object.entries(chain.balances))
    console.log(`   - ${user}: ${balance}`);

  console.log(bold('\n🧱 ━━━ Transactions ━━━━━━━━━━━━━'));

  const block1 = createBlock({
    signer: adminUser,
    payload: 'Admin enters here',
    transfers: [
      {
        from: alice.getAddress(),
        to: bob.getAddress(),
        amount: 5000000n,
      },
    ],
  });
  await chain.mineBlock(miner.getAddress(), block1);
  console.log(green('✅ Admin forced 5000000n to Alice'));

  const block2 = createBlock({
    signer: alice,
    payload: 'Alice builds',
    transfers: [
      {
        from: alice.getAddress(),
        to: bob.getAddress(),
        amount: 2000000n,
      },
    ],
  });
  await chain.mineBlock(miner.getAddress(), block2);
  console.log(green('✅ Alice sent 2000000n to Bob'));

  const block3 = createBlock({
    signer: charlie,
    payload: 'Bob pays fail',
    transfers: [
      {
        from: charlie.getAddress(),
        to: bob.getAddress(),
        amount: 500000n,
      },
    ],
  });

  await chain
    .mineBlock(miner.getAddress(), block3)
    .catch((err) => console.log(red("❌ As expected, Bob can't send from Charlie:"), err.message));

  const block4 = createBlock({
    gasOptions: { gasLimit: 52000n },
    signer: bob,
    payload: 'Bob pays back',
    transfers: [
      {
        from: bob.getAddress(),
        to: charlie.getAddress(),
        amount: 1000000n,
      },
      {
        from: bob.getAddress(),
        to: '0',
        amount: 2250n,
      },
    ],
  });
  await chain.mineBlock(miner.getAddress(), block4);
  console.log(green('✅ Bob sent 1000000n to Charlie'));

  console.log(bold('\n📦 ━━━ Final Chain Data ━━━━━━━━━━━━'));
  console.log(colorSafeStringify(chain.getAllChainData()));

  console.log(bold('\n📊 ━━━ Final Balances ━━━━━━━━━━━━━━'));
  for (const [user, balance] of Object.entries(chain.balances))
    console.log(`   - ${user}: ${balance}`);

  console.log(bold('\n📤 ━━━ Chain Export/Import ━━━━━━━━━'));

  const exportedChain = chain.exportChain();
  const newChain = new TinyChain.Instance(chainCfg);
  newChain.importChain(exportedChain);
  console.log('📦 Imported chain');

  console.log(bold('\n📊 ━━━ Imported Chain Balances ━━━━'));
  for (const [user, balance] of Object.entries(newChain.balances))
    console.log(`   - ${user}: ${balance}`);

  console.log(bold('\n📊 ━━━ Imported Chain Data ━━━━━━━━'));
  console.log(colorSafeStringify(newChain.getAllChainData()));

  const isValid = newChain.isValid(1, 2);
  console.log(
    bold('\n🧪 ━━━ Range Validation (1-2) ━━━━━━━'),
    `\nRange 1-2 is ${isValid ? green('valid ✅') : red('invalid ❌')}`,
  );

  console.log(bold('\n📊 ━━━ Balances at Block 2 ━━━━━━━━━'));
  const block2Balances = chain.getBalancesAt(0, 2);
  for (const [user, balance] of Object.entries(block2Balances))
    console.log(`   - ${user}: ${balance}`);

  console.log(bold('\n🧮 ━━━ Reward Halving Test ━━━━━━━━'));
  const halvingBlocks = [];
  for (let i = 0; i < 20; i++) {
    const block = createBlock({ signer: alice });
    halvingBlocks.push(chain.mineBlock(miner.getAddress(), block));
  }
  await Promise.all(halvingBlocks);
  console.log(yellow('📉 Halving tested'));

  console.log(bold('\n📊 ━━━ Post-Halving Balances ━━━━━━'));
  for (const [user, balance] of Object.entries(chain.balances))
    console.log(`   - ${user}: ${balance}`);
  console.log(`💀 Burned balance: ${chain.getBurnedBalance().toString()}`);

  console.log(bold(green('\n🏁✅ Test completed!\n')));
};

const COLOR = {
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[94m',
  reset: '\x1b[0m',
};

const tinySignatureTest = async () => {
  console.log(`\n🔐🔹━[ ${COLOR.blue}TinySecp256k1 Signature Test${COLOR.reset} ]━🔹🔐\n`);

  const signer = new TinyChain.Secp256k1();
  await signer.init();

  const privateKey = signer.getPrivateKeyHex();
  const publicKey = signer.getAddress();

  console.log(`🗝️  ━━━ Keys ━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🔒 Private Key           : ${COLOR.yellow}${privateKey}${COLOR.reset}`);
  console.log(`🔓 Public Key            : ${COLOR.cyan}${publicKey}${COLOR.reset}\n`);

  const message = 'Hello Tinychain! 🪙';
  const messageBuffer = Buffer.from(message, 'utf8');

  console.log(`✍️  ━━━ Signing with ECDSA (DER) ━━━`);
  const signature = signer.signECDSA(messageBuffer);
  console.log(
    `📄 Signature (DER)       : ${COLOR.magenta}${signature.toString('hex')}${COLOR.reset}`,
  );

  const validECDSA = signer.verifyECDSA(messageBuffer, signature, publicKey);
  console.log(
    `✅ Signature Valid (ECDSA)? : ${validECDSA ? COLOR.green : COLOR.red}${validECDSA}${COLOR.reset}\n`,
  );

  const recoverableMessage = 'Hello world';
  console.log(`♻️  ━━━ Signing with Recovery ━━━`);
  const sig = signer.signMessage(recoverableMessage);
  console.log(`📄 Signature (Recoverable): ${COLOR.magenta}${sig.toString('hex')}${COLOR.reset}`);

  const recoveredPubKey = signer.recoverMessage(recoverableMessage, sig);
  const isValid = recoveredPubKey === signer.getAddress();
  console.log(
    `🔍 Recovered Matches?    : ${isValid ? COLOR.green : COLOR.red}${isValid}${COLOR.reset}`,
  );
  console.log(`📄 Recovered PubKey      : ${COLOR.cyan}${recoveredPubKey}${COLOR.reset}\n`);

  console.log('🔓 ━━━ Hash160 Keys ━━━━━━━━━━━━━');
  console.log(
    `📦 Vanilla (Address)     : ${COLOR.cyan}${signer.addressToVanilla(signer.getAddress()).toString('hex')}${COLOR.reset}`,
  );
  console.log(
    `📦 Vanilla (PubKey)      : ${COLOR.cyan}${signer.getPubVanillaAddress().toString('hex')}${COLOR.reset}\n`,
  );

  console.log('🔎 ━━━ Address Validation ━━━━━━━');
  console.log(`📬 Address               : ${COLOR.cyan}${signer.getAddress()}${COLOR.reset}`);
  console.log(
    `✅ Valid?                : ${COLOR.green}${signer.validateAddress(signer.getAddress()).valid}${COLOR.reset}\n`,
  );

  console.log(`${COLOR.green}🎉✅ Test Completed!${COLOR.reset}\n`);
};

const tinyBtcSignatureTest = async () => {
  console.log(`\n🔐🔹━[ ${COLOR.blue}TinySecp256k1 BTC Signature Test${COLOR.reset} ]━🔹🔐\n`);

  const signer = new TinyChain.Btc256k1();
  await signer.init();

  const privateKey = signer.getPrivateKeyHex();
  const publicKey = signer.getAddress();

  console.log(`🗝️  ━━━ Keys (BTC) ━━━━━━━━━━━━━━━━`);
  console.log(`🔒 Private Key           : ${COLOR.yellow}${privateKey}${COLOR.reset}`);
  console.log(`🔓 Public Key            : ${COLOR.cyan}${publicKey}${COLOR.reset}\n`);

  const recoverableMessage = 'Hello world';
  console.log(`♻️  ━━━ Signing Message (BTC) ━━━`);
  const sig = signer.signMessage(recoverableMessage);
  console.log(`📄 Signature (Recoverable): ${COLOR.magenta}${sig.toString('hex')}${COLOR.reset}`);

  const recoveredPubKey = signer.recoverMessage(recoverableMessage, sig);
  const isValid = recoveredPubKey === signer.getAddress();

  console.log(
    `🔍 Recovered Matches?    : ${isValid ? COLOR.green : COLOR.red}${isValid}${COLOR.reset}`,
  );
  console.log(`📄 Recovered PubKey      : ${COLOR.cyan}${recoveredPubKey}${COLOR.reset}\n`);

  console.log('🔓 ━━━ Hash160 Keys ━━━━━━━━━━━━━');
  console.log(
    `📦 Vanilla (Address)     : ${COLOR.cyan}${signer.addressToVanilla(signer.getAddress()).toString('hex')}${COLOR.reset}`,
  );
  console.log(
    `📦 Vanilla (PubKey)      : ${COLOR.cyan}${signer.getPubVanillaAddress().toString('hex')}${COLOR.reset}\n`,
  );

  console.log('🔎 ━━━ Address Validation ━━━━━━━');
  const addr = signer.getAddress();
  const p2pkh = signer.getAddress(undefined, 'p2pkh');
  console.log(`📬 Address               : ${COLOR.cyan}${addr}${COLOR.reset}`);
  console.log(
    `✅ Valid?                : ${COLOR.green}${signer.validateAddress(addr).valid}${COLOR.reset}`,
  );
  console.log(`📬 P2PKH Address         : ${COLOR.cyan}${p2pkh}${COLOR.reset}`);
  console.log(
    `✅ P2PKH Valid?          : ${COLOR.green}${signer.validateAddress(p2pkh, 'p2pkh').valid}${COLOR.reset}\n`,
  );

  console.log(`${COLOR.green}🎉✅ Test Completed! (BTC)${COLOR.reset}\n`);
};

const testTinyEthSecp256k1 = async () => {
  console.log(`\n🔐🔹━[ ${COLOR.blue}TinySecp256k1 ETH Signature Test${COLOR.reset} ]━🔹🔐\n`);

  const signer = new TinyChain.Eth256k1();
  await signer.init();

  const privateKey = signer.getPrivateKeyHex();
  const publicKey = signer.getAddress();

  console.log(`🗝️  ━━━ Keys (ETH) ━━━━━━━━━━━━━━━━`);
  console.log(`🔒 Private Key           : ${COLOR.yellow}${privateKey}${COLOR.reset}`);
  console.log(`🔓 Public Key            : ${COLOR.cyan}${publicKey}${COLOR.reset}\n`);

  const recoverableMessage = 'Hello world';
  console.log(`♻️  ━━━ Signing Message (ETH) ━━━`);
  const sig = signer.signMessage(recoverableMessage);
  console.log(`📄 Signature (Recoverable): ${COLOR.magenta}${sig.toString('hex')}${COLOR.reset}`);

  const recoveredPubKey = signer.recoverMessage(recoverableMessage, sig);
  const isValid = recoveredPubKey === signer.getAddress();

  console.log(
    `🔍 Recovered Matches?    : ${isValid ? COLOR.green : COLOR.red}${isValid}${COLOR.reset}`,
  );
  console.log(`📄 Recovered PubKey      : ${COLOR.cyan}${recoveredPubKey}${COLOR.reset}\n`);

  console.log('🔓 ━━━ Vanilla Keys ━━━━━━━━━━━━━');
  console.log(
    `📦 Vanilla (Address)     : ${COLOR.cyan}${signer.addressToVanilla(signer.getAddress()).toString('hex')}${COLOR.reset}`,
  );
  console.log(
    `📦 Vanilla (PubKey)      : ${COLOR.cyan}${signer.getPubVanillaAddress().toString('hex')}${COLOR.reset}\n`,
  );

  console.log('🔎 ━━━ Address Validation ━━━━━━━');
  console.log(`📬 Address               : ${COLOR.cyan}${signer.getAddress()}${COLOR.reset}`);
  console.log(
    `✅ Valid?                : ${COLOR.green}${signer.validateAddress(signer.getAddress()).valid}${COLOR.reset}\n`,
  );

  console.log(`${COLOR.green}🎉✅ Test Completed! (ETH)${COLOR.reset}\n`);
};

const tinyChainSimulation = async () => {
  await tinySignatureTest();
  await tinyBtcSignatureTest();
  await testTinyEthSecp256k1();
  await tinyWalletSimulation();
};

export default tinyChainSimulation;
