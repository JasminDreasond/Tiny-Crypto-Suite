/**
 * List of event names used by TinyOlm in the EventEmitter.
 * Each key maps to its string identifier.
 */
class TinyOlmEvents {
  /**
   * This class is not meant to be instantiated.
   *
   * TinyOlmEvents is a static-only class. All its members should be accessed directly through the class.
   *
   * @throws {Error} Always throws an error saying you can't summon it like a tiny pudding.
   */
  constructor() {
    throw new Error(
      "Oops! TinyOlmEvents isn't something you can summon like a tiny pudding. Just use it statically~ 🍮",
    );
  }

  /** Emits when a value needs to be stored in the database */
  static DbPut = 'DbPut';
  /** Emits when a value needs to be deleted in the database */
  static DbDelete = 'DbDelete';
  /** Emits when a entire table list needs to be deleted in the database */
  static DbClear = 'DbClear';

  /** Sets the user's password */
  static SetPassword = 'SetPassword';
  /** Sets the unique user ID */
  static SetUserId = 'SetUserId';
  /** Sets the current device ID */
  static SetDeviceId = 'SetDeviceId';

  /** Imports a account (usually from backup or export) */
  static ImportAccount = 'ImportAccount';
  /** Imports a user session */
  static ImportSession = 'ImportSession';
  /** Imports a Megolm group session */
  static ImportGroupSession = 'ImportGroupSession';
  /** Imports an inbound Megolm group session (for receiving messages) */
  static ImportInboundGroupSession = 'ImportInboundGroupSession';
  /** Imports a session by ID of a group session */
  static ImportGroupSessionId = 'ImportGroupSessionId';

  /** Removes a single user session  */
  static RemoveSession = 'RemoveSession';
  /** Removes a specific Megolm group session */
  static RemoveGroupSession = 'RemoveGroupSession';
  /** Removes a specific inbound Megolm group session */
  static RemoveInboundGroupSession = 'RemoveInboundGroupSession';

  /** Clears all stored user sessions */
  static ClearSessions = 'ClearSessions';
  /** Clears all inbound group sessions */
  static ClearInboundGroupSessions = 'ClearInboundGroupSessions';
  /** Clears all outbound group sessions */
  static ClearGroupSessions = 'ClearGroupSessions';

  /** Creates a new cryptographic account (fresh keys; etc.) */
  static CreateAccount = 'CreateAccount';
  /** Creates a new Megolm outbound group session */
  static CreateGroupSession = 'CreateGroupSession';
  /** Creates an inbound Olm session for receiving messages */
  static CreateInboundSession = 'CreateInboundSession';
  /** Creates an outbound Olm session for sending messages */
  static CreateOutboundSession = 'CreateOutboundSession';

  /** Signs all remaining one-time keys (after upload) */
  static SignOneTimeKeys = 'SignOneTimeKeys';
  /** Marks keys as already published; preventing reuse */
  static MarkKeysAsPublished = 'MarkKeysAsPublished';

  /** Resets the current cryptographic account (destroys keys and sessions) */
  static ResetAccount = 'ResetAccount';

  /**
   * @returns {string[]}
   */
  static get all() {
    const items = [];
    for (const key of Object.getOwnPropertyNames(this)) {
      // Skip getters or non-string static properties
      if (key !== 'name') {
        const descriptor = Object.getOwnPropertyDescriptor(this, key);
        if (descriptor && typeof descriptor.value === 'string') items.push(descriptor.value);
      }
    }
    return items;
  }

  /**
   * @param {string} event
   * @returns {boolean}
   */
  static isValid(event) {
    return this.all.includes(event);
  }
}

export default TinyOlmEvents;
