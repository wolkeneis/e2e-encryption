Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

const _tweetnacl = require("tweetnacl");

const _buffer = require("buffer");

function _typeof(obj) {
 "@babel/helpers - typeof";

 return _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj);
}

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (let i = 0; i < props.length; i++) { const descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

const newNonceS = function newNonceS() {
  return (0, _tweetnacl.randomBytes)(_tweetnacl.secretbox.nonceLength);
};

const newNonceA = function newNonceA() {
  return (0, _tweetnacl.randomBytes)(_tweetnacl.box.nonceLength);
};

function decodeUTF8(string) {
  let i;
  const d = unescape(encodeURIComponent(string));
  const b = new Uint8Array(d.length);

  for (i = 0; i < d.length; i += 1) {
    b[i] = d.charCodeAt(i);
  }

  return b;
}

function encodeUTF8(array) {
  let i;
  const string = [];

  for (i = 0; i < array.length; i += 1) {
    string.push(String.fromCharCode(array[i]));
  }

  return decodeURIComponent(escape(string.join('')));
}

function encodeBase64(array) {
  return _buffer.Buffer.from(array).toString('base64');
}

function decodeBase64(string) {
  return new Uint8Array(Array.prototype.slice.call(_buffer.Buffer.from(string, 'base64'), 0));
}

const E2E = /* #__PURE__ */(function () {
  /**
   * Initializing the object with the private/public key pair.
   * If the public/private key pair is not present, the constructor
   * would create a new key pair for the user.
   *
   * @param {String} publicKey Public Key of the Host
   * @param {String} privateKey Private Key of the Host
   * @param {String} options Options to configure the package
   */
  function E2E(publicKey, privateKey, options) {
    _classCallCheck(this, E2E);

    if (publicKey !== undefined && publicKey.length && privateKey !== undefined && privateKey.length) {
      this.publicKey = publicKey;
      this.privateKey = privateKey;
    } else {
      this.GenerateNewKeys();
    }

    if (Object.keys(options).length) {
      this.options = options;
    } else {
      this.options = {
        useSameKeyPerClient: false
      };
    }

    this.SymmetricKeys = {};
  }
  /**
   * @param {Object} plainText JSON Object to be encrypted
   * @param {String} receiverPubKey Reveiver's Public Key in Base64
   * @param {Object} options Override the instance's properties
   */

  _createClass(E2E, [{
    key: "Encrypt",
    value: function Encrypt(plainText, receiverPubKey, options) {
      let symmetricKey;
      const useSameKey = options.useSameKeyPerClient !== undefined ? options.useSameKeyPerClient : this.options.useSameKeyPerClient;

      if (!this.SymmetricKeys[receiverPubKey] || !useSameKey) {
        symmetricKey = this.EncryptSymmetricKey(receiverPubKey);

        if (useSameKey) {
          this.SymmetricKeys[receiverPubKey] = symmetricKey;
        }
      } else {
        symmetricKey = this.SymmetricKeys[receiverPubKey];
      }

      const nonce = newNonceS();
      const keyUint8Array = decodeBase64(symmetricKey.raw);

      if (_typeof(plainText) !== 'object') {
        throw new Error('Only JSON object accepted as an input');
      }

      const messageUint8 = decodeUTF8(JSON.stringify(plainText));
      const newBox = (0, _tweetnacl.secretbox)(messageUint8, nonce, keyUint8Array);
      const fullMessage = new Uint8Array(nonce.length + newBox.length);
      fullMessage.set(nonce);
      fullMessage.set(newBox, nonce.length);
      const fullMessageAsBase64 = encodeBase64(fullMessage);
      return "".concat(fullMessageAsBase64, ".").concat(symmetricKey.enc);
    }
    /**
     * Decrypt the payload received
     *
     * @param {String} cipherText Encrypted Payload
     * @param {String} senderPublicKey Sender's Public Key
     * @param {Object} options Override the instance's properties
     */

  }, {
    key: "Decrypt",
    value: function Decrypt(cipherText, senderPublicKey, options) {
      const dataParts = cipherText.split('.');

      if (dataParts.length !== 2) {
        throw new Error('Payload is corrupted');
      }

      let symmetricKey;
      const useSameKey = options.useSameKeyPerClient !== undefined ? options.useSameKeyPerClient : this.options.useSameKeyPerClient;

      if (!this.SymmetricKeys[senderPublicKey] || !useSameKey) {
        symmetricKey = this.DecryptSymmetricKey(dataParts[1], senderPublicKey);

        if (useSameKey) {
          this.SymmetricKeys[senderPublicKey] = symmetricKey;
        }
      } else {
        symmetricKey = this.SymmetricKeys[senderPublicKey];
      }

      const keyUint8Array = decodeBase64(symmetricKey);
      const messageWithNonceAsUint8Array = decodeBase64(dataParts[0]);
      const nonce = messageWithNonceAsUint8Array.slice(0, _tweetnacl.secretbox.nonceLength);
      const message = messageWithNonceAsUint8Array.slice(_tweetnacl.secretbox.nonceLength, dataParts[0].length);

      const decrypted = _tweetnacl.secretbox.open(message, nonce, keyUint8Array);

      if (!decrypted) {
        throw new Error('Could not decrypt message');
      }

      const base64DecryptedMessage = encodeUTF8(decrypted);
      return JSON.parse(base64DecryptedMessage);
    }
    /**
     * Generates a new Symmetric Key for encryption and
     * encrypted Symmetric Key for Transmission.
     *
     * @param {String} publicKey Receiver's public key
     */

  }, {
    key: "EncryptSymmetricKey",
    value: function EncryptSymmetricKey(publicKey) {
      const symmetricKey = encodeBase64((0, _tweetnacl.randomBytes)(_tweetnacl.secretbox.keyLength));
      const nonce = newNonceA();
      const finalKey = this.GetShared(publicKey);
      const pubKeyAsUint8Array = decodeBase64(finalKey);
      const messageUint8 = decodeUTF8(JSON.stringify({
        key: symmetricKey
      }));

      const encrypted = _tweetnacl.box.after(messageUint8, nonce, pubKeyAsUint8Array);

      const fullMessage = new Uint8Array(nonce.length + encrypted.length);
      fullMessage.set(nonce);
      fullMessage.set(encrypted, nonce.length);
      return {
        raw: symmetricKey,
        enc: encodeBase64(fullMessage)
      };
    }
    /**
     * Decrypt the Symmetric Key
     *
     * @param {String} messageWithNonce Encrypted Payload
     * @param {String} publicKey Sender's Public Key
     */

  }, {
    key: "DecryptSymmetricKey",
    value: function DecryptSymmetricKey(messageWithNonce, publicKey) {
      const finalKey = this.GetShared(publicKey);
      const privateKeyAsUint8Array = decodeBase64(finalKey);
      const messageWithNonceAsUint8Array = decodeBase64(messageWithNonce);
      const nonce = messageWithNonceAsUint8Array.slice(0, _tweetnacl.box.nonceLength);
      const message = messageWithNonceAsUint8Array.slice(_tweetnacl.box.nonceLength, messageWithNonce.length);

      const decrypted = _tweetnacl.box.open.after(message, nonce, privateKeyAsUint8Array);

      if (!decrypted) {
        throw new Error('Could not decrypt the key');
      }

      const jsonObject = JSON.parse(encodeUTF8(decrypted));
      return jsonObject.key;
    }
    /**
     * Generate the shared encryption key for the Symmetric keys
     *
     * @param {String} pub Receiver's Public Key
     */

  }, {
    key: "GetShared",
    value: function GetShared(publicKey) {
      const publicKeyAsUint8Array = decodeBase64(publicKey);
      const privateKeyAsUint8Array = decodeBase64(this.privateKey);
      return encodeBase64(_tweetnacl.box.before(publicKeyAsUint8Array, privateKeyAsUint8Array));
    }
    /**
     * Generate a new Key Pair incase the user needs one.
     */

  }, {
    key: "GenerateNewKeys",
    value: function GenerateNewKeys() {
      const newKey = _tweetnacl.box.keyPair();

      this.publicKey = encodeBase64(newKey.publicKey);
      this.privateKey = encodeBase64(newKey.secretKey);
    }
  }]);

  return E2E;
}());

const _default = E2E;
exports.default = _default;
