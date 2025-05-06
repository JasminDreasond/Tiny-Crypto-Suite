import { TinyChain } from '../dist/index.mjs';
import { colorSafeStringify } from './colorSafeStringify.mjs';

const tinyChainSimulation = async () => {
  console.log('🌱 Initializing test datachain...');

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

export default tinyChainSimulation;
