export class CryptoService {
  // Generate a new ECDH key pair
  static async generateKeyPair(): Promise<CryptoKeyPair> {
    return await window.crypto.subtle.generateKey(
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      ["deriveKey", "deriveBits"]
    );
  }

  // Export public key to base64 string
  static async exportPublicKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("spki", key);
    const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported) as unknown as number[]);
    return btoa(exportedAsString);
  }

  // Import public key from base64 string
  static async importPublicKey(base64Key: string): Promise<CryptoKey> {
    const binaryDerString = atob(base64Key);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
      binaryDer[i] = binaryDerString.charCodeAt(i);
    }
    return await window.crypto.subtle.importKey(
      "spki",
      binaryDer.buffer,
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      []
    );
  }

  // Export private key to base64 string
  static async exportPrivateKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("pkcs8", key);
    const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported) as unknown as number[]);
    return btoa(exportedAsString);
  }

  // Import private key from base64 string
  static async importPrivateKey(base64Key: string): Promise<CryptoKey> {
    const binaryDerString = atob(base64Key);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
      binaryDer[i] = binaryDerString.charCodeAt(i);
    }
    return await window.crypto.subtle.importKey(
      "pkcs8",
      binaryDer.buffer,
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      ["deriveKey", "deriveBits"]
    );
  }

  // Derive a shared AES-GCM key
  static async deriveSharedKey(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
    return await window.crypto.subtle.deriveKey(
      {
        name: "ECDH",
        public: publicKey,
      },
      privateKey,
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["encrypt", "decrypt"]
    );
  }

  // Encrypt a message
  static async encryptMessage(message: string, sharedKey: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      sharedKey,
      enc.encode(message)
    );

    const ciphertextArray = Array.from(new Uint8Array(ciphertext));
    const ciphertextBase64 = btoa(String.fromCharCode.apply(null, ciphertextArray));
    const ivBase64 = btoa(String.fromCharCode.apply(null, Array.from(iv)));

    return { ciphertext: ciphertextBase64, iv: ivBase64 };
  }

  // Decrypt a message
  static async decryptMessage(ciphertextBase64: string, ivBase64: string, sharedKey: CryptoKey): Promise<string> {
    try {
      const ciphertextString = atob(ciphertextBase64);
      const ciphertext = new Uint8Array(ciphertextString.length);
      for (let i = 0; i < ciphertextString.length; i++) {
        ciphertext[i] = ciphertextString.charCodeAt(i);
      }

      const ivString = atob(ivBase64);
      const iv = new Uint8Array(ivString.length);
      for (let i = 0; i < ivString.length; i++) {
        iv[i] = ivString.charCodeAt(i);
      }

      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        sharedKey,
        ciphertext
      );

      const dec = new TextDecoder();
      return dec.decode(decrypted);
    } catch (error) {
      console.error("Decryption failed:", error);
      return "🔒 Decryption failed";
    }
  }
}
