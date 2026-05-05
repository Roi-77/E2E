// src/lib/crypto.js

// Generate RSA key pair (RSA-OAEP) for encrypting AES keys
export async function generateKeyPair() {
  return await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Generate AES-GCM key for conversation encryption
export async function generateAESKey() {
  return await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

// Encrypt plaintext message with AES-GCM
export async function encryptMessage(message, aesKey) {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encoder.encode(message)
  );
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer))),
    iv, // Uint8Array (caller will Base64 encode for transport)
  };
}

// Decrypt AES-GCM ciphertext (iv must be Uint8Array)
export async function decryptMessage(ciphertextBase64, ivUint8, aesKey) {
  const data = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0));
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivUint8 },
    aesKey,
    data
  );
  return new TextDecoder().decode(plainBuffer);
}

// Encrypt AES key (raw) with recipient's RSA public key (CryptoKey)
export async function encryptAESKey(aesKey, recipientPublicKey) {
  const exported = await crypto.subtle.exportKey("raw", aesKey); // ArrayBuffer
  const encrypted = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    exported
  );
  return encrypted; // ArrayBuffer
}

// Decrypt AES key (ArrayBuffer) with recipient's RSA private key (CryptoKey)
// Returns an imported AES CryptoKey
export async function decryptAESKey(encryptedAESKeyArrayBuffer, privateKey) {
  const rawKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedAESKeyArrayBuffer
  );
  return await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
}
