// RC4加密类
export class RC4 {
  constructor(key) {
    this.key = key;
  }

  stringToUtf8Bytes(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      if (charCode < 0x80) {
        bytes.push(charCode);
      } else if (charCode < 0x800) {
        bytes.push(0xC0 | (charCode >> 6));
        bytes.push(0x80 | (charCode & 0x3F));
      } else if (charCode < 0xD800 || charCode >= 0xE000) {
        bytes.push(0xE0 | (charCode >> 12));
        bytes.push(0x80 | ((charCode >> 6) & 0x3F));
        bytes.push(0x80 | (charCode & 0x3F));
      } else {
        i++;
        const charCode2 = str.charCodeAt(i);
        const codePoint = 0x10000 + (((charCode & 0x3FF) << 10) | (charCode2 & 0x3FF));
        bytes.push(0xF0 | (codePoint >> 18));
        bytes.push(0x80 | ((codePoint >> 12) & 0x3F));
        bytes.push(0x80 | ((codePoint >> 6) & 0x3F));
        bytes.push(0x80 | (codePoint & 0x3F));
      }
    }
    return bytes;
  }

  utf8BytesToString(bytes) {
    let str = '';
    let i = 0;
    while (i < bytes.length) {
      const byte1 = bytes[i++];
      if (byte1 < 0x80) {
        str += String.fromCharCode(byte1);
      } else if (byte1 < 0xE0) {
        const byte2 = bytes[i++];
        str += String.fromCharCode(((byte1 & 0x1F) << 6) | (byte2 & 0x3F));
      } else if (byte1 < 0xF0) {
        const byte2 = bytes[i++];
        const byte3 = bytes[i++];
        str += String.fromCharCode(((byte1 & 0x0F) << 12) | ((byte2 & 0x3F) << 6) | (byte3 & 0x3F));
      } else {
        const byte2 = bytes[i++];
        const byte3 = bytes[i++];
        const byte4 = bytes[i++];
        const codePoint = ((byte1 & 0x07) << 18) | ((byte2 & 0x3F) << 12) | ((byte3 & 0x3F) << 6) | (byte4 & 0x3F);
        str += String.fromCodePoint(codePoint);
      }
    }
    return str;
  }

  bytesToHex(bytes) {
    return bytes.map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  hexToBytes(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
  }

  ksa(key) {
    const S = [];
    for (let i = 0; i < 256; i++) {
      S[i] = i;
    }

    let j = 0;
    const keyLength = key.length;

    for (let i = 0; i < 256; i++) {
      j = (j + S[i] + key.charCodeAt(i % keyLength)) % 256;
      [S[i], S[j]] = [S[j], S[i]];
    }

    return S;
  }

  prga(S, data) {
    let i = 0, j = 0;
    const result = [];

    for (let idx = 0; idx < data.length; idx++) {
      i = (i + 1) % 256;
      j = (j + S[i]) % 256;
      [S[i], S[j]] = [S[j], S[i]];

      const K = S[(S[i] + S[j]) % 256];
      result[idx] = data[idx] ^ K;
    }

    return result;
  }

  encrypt(plaintext) {
    const S = this.ksa(this.key);
    const dataBytes = this.stringToUtf8Bytes(plaintext);
    const encrypted = this.prga(S, dataBytes);
    return this.bytesToHex(encrypted);
  }

  decrypt(encryptedHex) {
    const encryptedData = this.hexToBytes(encryptedHex);
    const S = this.ksa(this.key);
    const decrypted = this.prga(S, encryptedData);
    return this.utf8BytesToString(decrypted);
  }
}

// MD5类
export class MD5 {
  static rotateLeft(value, shift) {
    return (value << shift) | (value >>> (32 - shift));
  }

  static addUnsigned(x, y) {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }

  static f(x, y, z) {
    return (x & y) | (~x & z);
  }

  static g(x, y, z) {
    return (x & z) | (y & ~z);
  }

  static h(x, y, z) {
    return x ^ y ^ z;
  }

  static i(x, y, z) {
    return y ^ (x | ~z);
  }

  static ff(a, b, c, d, x, s, ac) {
    a = this.addUnsigned(a, this.addUnsigned(this.addUnsigned(this.f(b, c, d), x), ac));
    return this.addUnsigned(this.rotateLeft(a, s), b);
  }

  static gg(a, b, c, d, x, s, ac) {
    a = this.addUnsigned(a, this.addUnsigned(this.addUnsigned(this.g(b, c, d), x), ac));
    return this.addUnsigned(this.rotateLeft(a, s), b);
  }

  static hh(a, b, c, d, x, s, ac) {
    a = this.addUnsigned(a, this.addUnsigned(this.addUnsigned(this.h(b, c, d), x), ac));
    return this.addUnsigned(this.rotateLeft(a, s), b);
  }

  static ii(a, b, c, d, x, s, ac) {
    a = this.addUnsigned(a, this.addUnsigned(this.addUnsigned(this.i(b, c, d), x), ac));
    return this.addUnsigned(this.rotateLeft(a, s), b);
  }

  static convertToWordArray(string) {
    let lWordCount;
    const lMessageLength = string.length;
    const lNumberOfWords_temp1 = lMessageLength + 8;
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    const lWordArray = Array(lNumberOfWords - 1);
    let lBytePosition = 0;
    let lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }

  static wordToHex(lValue) {
    let wordToHexValue = '';
    let wordToHexValue_temp = '';
    let lByte;
    let lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      wordToHexValue_temp = '0' + lByte.toString(16);
      wordToHexValue = wordToHexValue + wordToHexValue_temp.substr(wordToHexValue_temp.length - 2, 2);
    }
    return wordToHexValue;
  }

  static hex(string) {
    let x = [];
    let k, AA, BB, CC, DD, a, b, c, d;
    const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
    const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
    const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
    const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

    string = this.utf8_encode(string);
    x = this.convertToWordArray(string);
    a = 0x67452301;
    b = 0xEFCDAB89;
    c = 0x98BADCFE;
    d = 0x10325476;

    for (k = 0; k < x.length; k += 16) {
      AA = a;
      BB = b;
      CC = c;
      DD = d;
      a = this.ff(a, b, c, d, x[k + 0], S11, 0xD76AA478);
      d = this.ff(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
      c = this.ff(c, d, a, b, x[k + 2], S13, 0x242070DB);
      b = this.ff(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
      a = this.ff(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
      d = this.ff(d, a, b, c, x[k + 5], S12, 0x4787C62A);
      c = this.ff(c, d, a, b, x[k + 6], S13, 0xA8304613);
      b = this.ff(b, c, d, a, x[k + 7], S14, 0xFD469501);
      a = this.ff(a, b, c, d, x[k + 8], S11, 0x698098D8);
      d = this.ff(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
      c = this.ff(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
      b = this.ff(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
      a = this.ff(a, b, c, d, x[k + 12], S11, 0x6B901122);
      d = this.ff(d, a, b, c, x[k + 13], S12, 0xFD987193);
      c = this.ff(c, d, a, b, x[k + 14], S13, 0xA679438E);
      b = this.ff(b, c, d, a, x[k + 15], S14, 0x49B40821);
      a = this.gg(a, b, c, d, x[k + 1], S21, 0xF61E2562);
      d = this.gg(d, a, b, c, x[k + 6], S22, 0xC040B340);
      c = this.gg(c, d, a, b, x[k + 11], S23, 0x265E5A51);
      b = this.gg(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
      a = this.gg(a, b, c, d, x[k + 5], S21, 0xD62F105D);
      d = this.gg(d, a, b, c, x[k + 10], S22, 0x02441453);
      c = this.gg(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
      b = this.gg(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
      a = this.gg(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
      d = this.gg(d, a, b, c, x[k + 14], S22, 0xC33707D6);
      c = this.gg(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
      b = this.gg(b, c, d, a, x[k + 8], S24, 0x455A14ED);
      a = this.gg(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
      d = this.gg(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
      c = this.gg(c, d, a, b, x[k + 7], S23, 0x676F02D9);
      b = this.gg(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
      a = this.hh(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
      d = this.hh(d, a, b, c, x[k + 8], S32, 0x8771F681);
      c = this.hh(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
      b = this.hh(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
      a = this.hh(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
      d = this.hh(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
      c = this.hh(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
      b = this.hh(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
      a = this.hh(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
      d = this.hh(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
      c = this.hh(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
      b = this.hh(b, c, d, a, x[k + 6], S34, 0x04881D05);
      a = this.hh(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
      d = this.hh(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
      c = this.hh(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
      b = this.hh(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
      a = this.ii(a, b, c, d, x[k + 0], S41, 0xF4292244);
      d = this.ii(d, a, b, c, x[k + 7], S42, 0x432AFF97);
      c = this.ii(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
      b = this.ii(b, c, d, a, x[k + 5], S44, 0xFC93A039);
      a = this.ii(a, b, c, d, x[k + 12], S41, 0x655B59C3);
      d = this.ii(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
      c = this.ii(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
      b = this.ii(b, c, d, a, x[k + 1], S44, 0x85845DD1);
      a = this.ii(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
      d = this.ii(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
      c = this.ii(c, d, a, b, x[k + 6], S43, 0xA3014314);
      b = this.ii(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
      a = this.ii(a, b, c, d, x[k + 4], S41, 0xF7537E82);
      d = this.ii(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
      c = this.ii(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
      b = this.ii(b, c, d, a, x[k + 9], S44, 0xEB86D391);
      a = this.addUnsigned(a, AA);
      b = this.addUnsigned(b, BB);
      c = this.addUnsigned(c, CC);
      d = this.addUnsigned(d, DD);
    }

    return (this.wordToHex(a) + this.wordToHex(b) + this.wordToHex(c) + this.wordToHex(d)).toLowerCase();
  }

  static utf8_encode(string) {
    string = string.replace(/\r\n/g, "\n");
    let utftext = '';
    for (let n = 0; n < string.length; n++) {
      const c = string.charCodeAt(n);
      if (c < 128) {
        utftext += String.fromCharCode(c);
      } else if ((c > 127) && (c < 2048)) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      } else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }
    }
    return utftext;
  }
}

// UUID工具类
export class UUIDUtils {
  static generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  static generateToken(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static generateClientID() {
    return this.generateUUID();
  }

  static generateFeature(mac) {
    return MD5.hex(mac + Date.now());
  }

  static getMacAddress() {
    let mac = '00:00:00:00:00:00';
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices().then(devices => {
          devices.forEach(device => {
            if (device.deviceId) {
              mac = MD5.hex(device.deviceId);
            }
          });
        });
      }
    } catch (e) {
    }
    return mac;
  }
}

// API管理类
export class APIManager {
  constructor() {
    this.baseUrl = 'http://api2.xbzhan.com';
    this.softwareId = 'vOqCYJiFP2v9XMMaHi';//识别码
    this.version = '1.0';
    this.rc4Key = '65X5qyOC6eD6OXm1JrGpwFYlPy30LXGI7woHWnl2Yp8p8CPD';//rc4秘钥
    this.softwareKey = 'LlmhqewqrhRpQH5kzIEVpdDJ5dXrk3eB';//软件秘钥
    this.signSalt = '123[data]456[key]789';//软件签名
    this.enableEncryption = true;
    this.enableSignature = true;
    
    this.clientId = UUIDUtils.generateClientID();
    this.mac = UUIDUtils.getMacAddress();
    this.feature = UUIDUtils.generateFeature(this.mac);
    
    this.currentUser = null;
    this.cookie = '';
    this.isLoggedIn = false;
  }

  generateSignature(encryptedData) {
    const sendDataString = `123${encryptedData}456${this.softwareKey}789`;
    return MD5.hex(sendDataString);
  }

  encryptRequestData(payload) {
    const rc4 = new RC4(this.rc4Key);
    const dataString = JSON.stringify(payload.data);
    const encryptedData = rc4.encrypt(dataString);
    payload.data = encryptedData;
    return payload;
  }

  decryptResponseData(response) {
    const rc4 = new RC4(this.rc4Key);
    if (response.data && typeof response.data === 'string') {
      try {
        const decryptedString = rc4.decrypt(response.data);
        response.data = decryptedString;

        try {
          const innerJson = JSON.parse(decryptedString);
          for (const key in innerJson) {
            response[key] = innerJson[key];
          }
        } catch (e) {
        }
      } catch (e) {
      }
    }
    return response;
  }

  buildRequestData(endpoint, extraData = null) {
    const data = {
      feature: this.feature,
      mac: this.mac,
      version: this.version,
      clientid: this.clientId,
      clientos: 'web',
      token: UUIDUtils.generateToken(32),
      uuid: UUIDUtils.generateUUID(),
      md5: null,
      param: null
    };

    if (extraData) {
      Object.assign(data, extraData);
    }

    const payload = {
      soft: this.softwareId,
      data: data,
      sign: null
    };

    if (this.enableEncryption) {
      const encryptedPayload = this.encryptRequestData(payload);
      if (this.enableSignature) {
        encryptedPayload.sign = this.generateSignature(encryptedPayload.data);
      }
      return encryptedPayload;
    }

    return payload;
  }

  async sendRequest(endpoint, method = 'POST', extraData = null) {
    try {
      const payload = this.buildRequestData(endpoint, extraData);
      
      const proxyResponse = await fetch('api.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          endpoint: endpoint,
          method: method,
          data: payload
        })
      });

      if (!proxyResponse.ok) {
        throw new Error(`Proxy HTTP error! status: ${proxyResponse.status}`);
      }

      const proxyResult = await proxyResponse.json();

      if (!proxyResult.success) {
        throw new Error(proxyResult.error || '代理请求失败');
      }

      const responseData = proxyResult.data;

      if (this.enableEncryption) {
        const decryptedResponse = this.decryptResponseData(responseData);
        return decryptedResponse;
      }

      return responseData;
    } catch (error) {
      throw error;
    }
  }

  async initSoftware() {
    return await this.sendRequest('/api/init', 'POST');
  }

  async loginUser(account, accountPass = null) {
    const loginData = { account: account };
    if (accountPass) {
      loginData.account_pass = accountPass;
    }
    const response = await this.sendRequest('/api/login', 'POST', loginData);
    
    if (response && (response.code === 1 || response.code === 200)) {
      this.isLoggedIn = true;
      this.currentUser = account;
      
      if (response.cookie) {
        this.cookie = response.cookie;
      } else if (response.result && response.result.loginCookie) {
        this.cookie = response.result.loginCookie;
      }
    }
    
    return response;
  }

  async heartbeat() {
    if (!this.isLoggedIn) {
      throw new Error('用户未登录');
    }
    
    const heartbeatData = { account: this.currentUser };
    if (this.cookie) {
      heartbeatData.cookie = this.cookie;
    }
    
    return await this.sendRequest('/api/heartbeat', 'POST', heartbeatData);
  }

  async logoutUser() {
    if (!this.isLoggedIn) {
      throw new Error('用户未登录');
    }
    
    const logoutData = { account: this.currentUser };
    if (this.cookie) {
      logoutData.cookie = this.cookie;
    }
    
    const response = await this.sendRequest('/api/logout', 'POST', logoutData);
    
    if (response) {
      this.currentUser = null;
      this.cookie = '';
      this.isLoggedIn = false;
    }
    
    return response;
  }
}

// 导出API管理器实例
export const apiManager = new APIManager();
