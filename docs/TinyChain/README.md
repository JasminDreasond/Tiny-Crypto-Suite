# 📦 TinyChain: Documentation Overview

Welcome to the **TinyChain** documentation!
This repository provides detailed information on the core structure and behavior of each major component in the system.

If you're just getting started or looking to understand specific internals, here's a quick breakdown of the available documentation files:

---

## 🔹 [`Block`](./Block.md)

This file explains everything about individual blocks within the TinyChain.
It covers how blocks are created, mined, validated, and how transaction IDs are generated and managed.

> **Includes:**
> - Mining logic
> - Transaction indexing
> - Data serialization
> - Cryptographic helpers

Use this file when you're working with block-level operations or modifying how transactions are stored and processed inside a block.

---

## 🔸 [`Instance`](./Instance.md)

This is the heart of the chain – the instance that controls everything.
The `Instance.md` covers the full lifecycle of the TinyChain instance, including how chains are created, validated, forked, and how consensus is managed.

> **Includes:**
> - Chain state and structure
> - Import/export
> - Validation process
> - Fork handling
> - Gas and fee behavior

Refer to this file if you're implementing node behavior or syncing with other chains.

---

## 🎯 [`Events`](./Events.md)

Want to listen for events like mining success, forks, or new transactions?
This file lists all the available **event names** you can use with your chain or block listeners.

> **Includes:**
> - Event naming conventions
> - When events are emitted
> - Typical payloads

---

## 🔐 [`Secp256k1`](./Secp256k1/README.md)

Covers the generic elliptic curve cryptography used in TinyChain.
This is the base implementation shared by other curve wrappers like Bitcoin and Ethereum.

> **Includes:**
> - Key pair management
> - Public/private key access
> - Message signing and recovery

---

## 🪙 [`Secp256k1 - BTC`](./Secp256k1/Btc.md)

Bitcoin-style cryptography and address handling.
Extends the base secp256k1 with functions specific to Bitcoin, including `Hash160` and address checksum logic.

> **Includes:**
> - BTC address generation
> - Signature formatting
> - Base58Check support

---

## 🦊 [`Secp256k1 - ETH`](./Secp256k1/Eth.md)

Ethereum-specific cryptographic logic.
Supports `keccak256`, Ethereum signature prefixing, and checksum validation.

> **Includes:**
> - Ethereum message signing
> - Address derivation
> - Checksum-based validation

---

## 📚 How to Use This

If you're working with block internals → start with [`Block`](./Block.md).
If you're managing or extending the blockchain as a whole → check [`Instance`](./Instance.md).
And for anything that involves event hooks and listeners → open [`Events`](./Events.md).
To implement or customize cryptography → explore [`Secp256k1`](./Secp256k1/README.md), [`BTC`](./Secp256k1/Btc.md), or [`ETH`](./Secp256k1/Eth.md).

---

Feel free to explore, extend, and fork the system!
Happy hacking 🛠️

— TinyChain Core Docs
