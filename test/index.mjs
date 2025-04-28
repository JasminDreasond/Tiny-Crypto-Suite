import executeSimulationCert from './TinyCertCrypto.mjs';
import tinyCryptoSimulation from './TinyCrypto.mjs';
import simulateMatrixCommunication from './TinyOlm.mjs';

(async () => {
  await tinyCryptoSimulation();
  await executeSimulationCert();
  await simulateMatrixCommunication();
})();
