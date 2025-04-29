import FakeMatrixServer from '../dist/TinyOlm/FakeMatrixServer.mjs';
import { TinyOlmInstance } from '../dist/index.mjs';

// Color codes for styling
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const GRAY = '\x1b[90m';

const aliceTag = `${MAGENTA}[Alice]${RESET}`;
const bobTag = `${CYAN}[Bob]${RESET}`;
const charlieTag = `${YELLOW}[Charlie]${RESET}`;
const dianaTag = `${GREEN}[Diana]${RESET}`;

/**
 * Creates a formatted header.
 * @param {string} text - The header text.
 * @returns {string}
 */
const header = (text) => `\n${BOLD}${BLUE}=== ${text} ===${RESET}\n`;

/**
 * Creates a divider line.
 * @returns {string}
 */
const divider = () => `${GRAY}────────────────────────────────────────${RESET}`;

/**
 * Creates a formatted message box.
 * @param {string} title - The title of the box.
 * @param {string} content - The content inside the box.
 * @returns {string}
 */
const boxMessage = (title, content) => {
  const titleLine = `╭── ${title} ─────────────────────────`;
  const endLine = `╰──────────────────────────────────────`;
  return `${GRAY}${titleLine}\n│${RESET} ${content}\n${GRAY}${endLine}${RESET}\n`;
};

// Simulate two users exchanging encrypted messages
async function simulateSingleMatrixCommunication() {
  console.log(header('Initializing TinyOlm 🚀'));

  const server = new FakeMatrixServer();

  const alice = new TinyOlmInstance('alice', 'tiny-computer');
  const bob = new TinyOlmInstance('bob', 'tiny-computer');

  console.log(header('Initializing Accounts 🚀'));

  await alice.init();
  await bob.init();

  console.log(header('Generating & Uploading Keys 🔑'));

  alice.generateOneTimeKeys(5);
  bob.generateOneTimeKeys(5);

  server.uploadIdentityKeys('alice', alice.getIdentityKeys());
  server.uploadOneTimeKeys('alice', alice.signedOneTimeKeys);
  server.uploadIdentityKeys('bob', bob.getIdentityKeys());
  server.uploadOneTimeKeys('bob', bob.signedOneTimeKeys);

  alice.markKeysAsPublished();
  bob.markKeysAsPublished();

  console.log(header('Establishing Session 🤝'));

  const bobIdentityKey = server.fetchIdentityKey('bob');
  const bobOneTimeKey = server.fetchOneTimeKey('bob');

  if (!bobIdentityKey || !bobOneTimeKey)
    throw new Error('Bob has no available keys for session establishment.');

  alice.createOutboundSession(bobIdentityKey, bobOneTimeKey, 'bob');

  console.log(divider());

  // Step 3: Alice sends an encrypted message to Bob
  const plaintextMessage1 = 'Hello Bob! 👋';
  const encryptedForBob1 = alice.encryptMessage('bob', plaintextMessage1);

  console.log(
    boxMessage(
      `${aliceTag} ${YELLOW}Encrypted for Bob${RESET}`,
      JSON.stringify(encryptedForBob1, null, 2),
    ),
  );

  console.log(divider());

  // Step 4: Bob creates an inbound session to Alice
  const aliceIdentityKey = server.fetchIdentityKey('alice');
  bob.createInboundSession(aliceIdentityKey, encryptedForBob1.body, 'alice');

  // Step 5: Bob decrypts the message
  const decryptedMessage1 = bob.decryptMessage(
    'alice',
    encryptedForBob1.type,
    encryptedForBob1.body,
  );

  console.log(boxMessage(`${bobTag} ${GREEN}Decrypted message${RESET}`, decryptedMessage1));

  console.log(divider());

  // Step 6: Bob replies to Alice
  const replyMessage1 = 'Hi Alice! 📨 How are you?';
  const encryptedForAlice1 = bob.encryptMessage('alice', replyMessage1);

  console.log(
    boxMessage(
      `${bobTag} ${YELLOW}Encrypted for Alice${RESET}`,
      JSON.stringify(encryptedForAlice1, null, 2),
    ),
  );

  console.log(divider());

  // Step 7: Alice decrypts the reply
  const decryptedReply1 = alice.decryptMessage(
    'bob',
    encryptedForAlice1.type,
    encryptedForAlice1.body,
  );

  console.log(boxMessage(`${aliceTag} ${GREEN}Decrypted reply${RESET}`, decryptedReply1));

  console.log(divider());

  // Additional conversation (more messages)
  console.log(header('Continuing Conversation 💬'));

  // Step 8: Alice responds back
  const plaintextMessage2 = "I'm good, thanks! 🌟 Are you coming to the meeting later?";
  const encryptedForBob2 = alice.encryptMessage('bob', plaintextMessage2);

  console.log(
    boxMessage(
      `${aliceTag} ${YELLOW}Encrypted for Bob (2)${RESET}`,
      JSON.stringify(encryptedForBob2, null, 2),
    ),
  );

  console.log(divider());

  const decryptedMessage2 = bob.decryptMessage(
    'alice',
    encryptedForBob2.type,
    encryptedForBob2.body,
  );

  console.log(boxMessage(`${bobTag} ${GREEN}Decrypted message (2)${RESET}`, decryptedMessage2));

  console.log(divider());

  // Step 9: Bob answers
  const replyMessage2 = "Yes! 🕘 I'll be there at 9 PM.";
  const encryptedForAlice2 = bob.encryptMessage('alice', replyMessage2);

  console.log(
    boxMessage(
      `${bobTag} ${YELLOW}Encrypted for Alice (2)${RESET}`,
      JSON.stringify(encryptedForAlice2, null, 2),
    ),
  );

  console.log(divider());

  const decryptedReply2 = alice.decryptMessage(
    'bob',
    encryptedForAlice2.type,
    encryptedForAlice2.body,
  );

  console.log(boxMessage(`${aliceTag} ${GREEN}Decrypted reply (2)${RESET}`, decryptedReply2));

  console.log(divider());

  // Step 10: Final quick message from Alice
  const plaintextMessage3 = 'Awesome! See you then! ✨';
  const encryptedForBob3 = alice.encryptMessage('bob', plaintextMessage3);

  console.log(
    boxMessage(
      `${aliceTag} ${YELLOW}Encrypted for Bob (3)${RESET}`,
      JSON.stringify(encryptedForBob3, null, 2),
    ),
  );

  console.log(divider());

  const decryptedMessage3 = bob.decryptMessage(
    'alice',
    encryptedForBob3.type,
    encryptedForBob3.body,
  );

  console.log(boxMessage(`${bobTag} ${GREEN}Decrypted message (3)${RESET}`, decryptedMessage3));

  // Step 11: Final quick message from Alice
  const plainContent = { withPudding: true, time: new Date(), description: 'Yay!' };
  const encryptedForBob4 = alice.encrypt('bob', plainContent);

  console.log(
    boxMessage(
      `${aliceTag} ${YELLOW}Encrypted for Bob (4)${RESET}`,
      JSON.stringify(encryptedForBob4, null, 2),
    ),
  );

  console.log(divider());

  const decryptedMessage4 = bob.decrypt(
    'alice',
    encryptedForBob4.type,
    encryptedForBob4.body,
  );

  console.log(boxMessage(`${bobTag} ${GREEN}Decrypted message (4)${RESET}`, JSON.stringify(decryptedMessage4, null, 2)));

  console.log(header('Conversation Ended ✅'));
}

// Simulate multiple users in a group encrypted chat
async function simulateGroupMatrixCommunication() {
  console.log(header('Initializing TinyOlm 🚀'));

  const server = new FakeMatrixServer();

  const alice = new TinyOlmInstance('alice', 'tiny-computer');
  const bob = new TinyOlmInstance('bob', 'tiny-computer');
  const charlie = new TinyOlmInstance('charlie', 'tiny-computer');
  const diana = new TinyOlmInstance('diana', 'tiny-computer');

  const users = [alice, bob, charlie, diana];
  const usersData = { alice, bob, charlie, diana };
  console.log(header('Initializing Accounts 🚀'));

  await Promise.all([alice.init(), bob.init(), charlie.init(), diana.init()]);

  console.log(header('Generating & Uploading Keys 🔑'));

  for (const user of users) {
    user.generateOneTimeKeys(5);
    server.uploadIdentityKeys(user.userId, user.getIdentityKeys());
    server.uploadOneTimeKeys(user.userId, user.signedOneTimeKeys);
    user.markKeysAsPublished();
  }

  console.log(header('Creating and Sharing Group Session 🛡️'));

  // Creates a group session for "room-1"
  for (const username in usersData) {
    const user = usersData[username];
    user.createGroupSession('room-1');
    const sessionKey = user.exportGroupSession('room-1');

    // User shares the session key with everyone
    for (const user2 of users) {
      user2.importGroupSession('room-1', username, sessionKey);
    }
  }

  console.log(divider());

  // Alice sends a group message
  const aliceGroupMessage = 'Hello everyone! 🎉';
  const encryptedFromAlice = alice.encryptGroupMessage('room-1', aliceGroupMessage);

  console.log(
    boxMessage(
      `${aliceTag} ${YELLOW}Encrypted group message${RESET}`,
      JSON.stringify(encryptedFromAlice, null, 2),
    ),
  );

  console.log(divider());

  // Bob, Charlie, and Diana decrypt Alice's message
  for (const [user, tag] of [
    [bob, bobTag],
    [charlie, charlieTag],
    [diana, dianaTag],
  ]) {
    const decrypted = user.decryptGroupMessage('room-1', 'alice', encryptedFromAlice);
    console.log(boxMessage(`${tag} ${GREEN}Decrypted message${RESET}`, decrypted.plaintext));
  }

  console.log(divider());

  console.log(header('Bob Sends a Group Reply 💬'));

  // Bob sends a reply
  const bobGroupReply = 'Hi Alice! 👋 Charlie and Diana, you here?';
  const encryptedFromBob = bob.encryptGroupMessage('room-1', bobGroupReply);

  console.log(
    boxMessage(
      `${bobTag} ${YELLOW}Encrypted group reply${RESET}`,
      JSON.stringify(encryptedFromBob, null, 2),
    ),
  );

  console.log(divider());

  // Alice, Charlie, and Diana decrypt Bob's message
  for (const [user, tag] of [
    [alice, aliceTag],
    [charlie, charlieTag],
    [diana, dianaTag],
  ]) {
    const decrypted = user.decryptGroupMessage('room-1', 'bob', encryptedFromBob);
    console.log(boxMessage(`${tag} ${GREEN}Decrypted message${RESET}`, decrypted.plaintext));
  }

  console.log(divider());

  console.log(header('Charlie Joins the Conversation ✨'));

  // Charlie sends a message
  const charlieGroupReply = 'Hey everyone! So good to see you! 🙌';
  const encryptedFromCharlie = charlie.encryptGroupMessage('room-1', charlieGroupReply);

  console.log(
    boxMessage(
      `${charlieTag} ${YELLOW}Encrypted group reply${RESET}`,
      JSON.stringify(encryptedFromCharlie, null, 2),
    ),
  );

  console.log(divider());

  // Alice, Bob, and Diana decrypt Charlie's message
  for (const [user, tag] of [
    [alice, aliceTag],
    [bob, bobTag],
    [diana, dianaTag],
  ]) {
    const decrypted = user.decryptGroupMessage('room-1', 'charlie', encryptedFromCharlie);
    console.log(boxMessage(`${tag} ${GREEN}Decrypted message${RESET}`, decrypted.plaintext));
  }

  console.log(divider());

  console.log(header('Diana Sends a Final Group Message 🎀'));

  // Diana sends a final message
  const dianaGroupReply = 'Let’s schedule a meeting soon! 🗓️';
  const encryptedFromDiana = diana.encryptGroupMessage('room-1', dianaGroupReply);

  console.log(
    boxMessage(
      `${dianaTag} ${YELLOW}Encrypted group reply${RESET}`,
      JSON.stringify(encryptedFromDiana, null, 2),
    ),
  );

  console.log(divider());

  // Alice, Bob, and Charlie decrypt Diana's message
  for (const [user, tag] of [
    [alice, aliceTag],
    [bob, bobTag],
    [charlie, charlieTag],
  ]) {
    const decrypted = user.decryptGroupMessage('room-1', 'diana', encryptedFromDiana);
    console.log(boxMessage(`${tag} ${GREEN}Decrypted message${RESET}`, decrypted.plaintext));
  }

  // Diana sends a final data
  const dianaGroupData = { withPudding: true, time: new Date(), description: 'Yay!' };
  const encryptedDataFromDiana = diana.encryptGroupContent('room-1', dianaGroupData);

  console.log(
    boxMessage(
      `${dianaTag} ${YELLOW}Encrypted group content${RESET}`,
      JSON.stringify(encryptedDataFromDiana, null, 2),
    ),
  );

  console.log(divider());

  // Alice, Bob, and Charlie decrypt Diana's content
  for (const [user, tag] of [
    [alice, aliceTag],
    [bob, bobTag],
    [charlie, charlieTag],
  ]) {
    const decrypted = user.decryptGroupContent('room-1', 'diana', encryptedDataFromDiana);
    console.log(boxMessage(`${tag} ${GREEN}Decrypted content${RESET}`, JSON.stringify(decrypted.content, null, 2)));
  }

  console.log(header('Group Conversation Ended ✅'));
}

// Run simulation
const simulateMatrixCommunication = async () => {
  await simulateSingleMatrixCommunication();
  await simulateGroupMatrixCommunication();
  console.log(header('Simulation Complete 🎉'));
};

export default simulateMatrixCommunication;
