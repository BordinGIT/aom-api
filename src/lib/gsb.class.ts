import axios, { AxiosResponse } from 'axios';
import * as crypto from 'crypto';
import * as dayjs from 'dayjs';

export class GSB {
  config: Iconfig;
  iv: Buffer;
  gsb_gateway: string;
  appVersion: string;
  signedKey: string;
  session: string | null;
  session_time: number | null;
  seed: string | null;

  constructor(config: Iconfig) {
    this.config = config;
    this.iv = Buffer.from('6E639C164B4B9198', 'utf-8');
    this.appVersion = '2.22.0';
    this.signedKey = '9cc9d018a69662a73026b4cc5b548411';
    this.session = null;
    this.session_time = null;
    this.seed = null;
    this.gsb_gateway = `https://mymo.gsb.or.th:20443`;
  }

  // public sleep(ms: number) {
  //     return new Promise(resolve => setTimeout(resolve, ms));
  // }

  public sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public getHeaders() {
    return {
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 11; ASUS_I003DD) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
    };
  }

  public encrypt(data: string, key: string, iv: Buffer) {
    let cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(key, 'base64'),
      iv,
    );
    let encrypted: string = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    return encrypted;
  }

  public decrypt(data: any, key: string, iv: Buffer) {
    let cipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(key, 'base64'),
      iv,
    );
    let encrypted: any = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    return encrypted;
  }

  public defaultDecrypt(text: string) {
    text = text.replace('\n', '');
    const data = Buffer.from(text, 'base64');
    const defaultKey = '/B42ACdig2PBF4h1BTZodQv7btTNHKvqCkB/8DQQWYc=';
    const result = this.decrypt(data, defaultKey, this.iv);
    return result;
  }

  public defaultEncrypt(data: string) {
    const salt = 'QPnUMJh1lv558SRzr0IshZyusSbYVw7QqbWmB/uu+9g=';
    const key = crypto.pbkdf2Sync('0', salt, 5, 32, 'sha1');
    const cipher = crypto.createCipheriv('aes-256-cbc', key, this.iv);
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  }

  public userEncryptReq(text: string) {
    const key = crypto.pbkdf2Sync(
      '0',
      `${this.config.citizenId}${this.seed}`,
      5,
      32,
      'sha1',
    );
    const userKey = key.toString('base64');
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(userKey, 'base64'),
      this.iv,
    );
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  }

  public userDecryptReq(text: string) {
    text = text.replace('\n', '');
    const data = Buffer.from(text, 'base64');
    const key = crypto.pbkdf2Sync(
      '0',
      `${this.config.citizenId}${this.seed}`,
      5,
      32,
      'sha1',
    );
    const userKey = key.toString('base64');
    const result = this.decrypt(data, userKey, this.iv);
    return result;
  }

  public async login() {
    const loginPayload = {
      longitude: '',
      latitude: '',
      phoneModel: 'Asus ASUS_I003DD',
      buildVersion: 'MyMo (262)',
      signedKey: this.signedKey,
      pwd: this.config.pin,
      ack: this.config.deviceId,
      uniqueKey: this.config.deviceId,
      user: this.config.citizenId,
      rootFlag: '0',
      checkFlag: '0',
      appVersion: this.appVersion,
      lang: 'th',
      os: 'Android',
      osVersion: '33',
      deviceModel: 'ASUS_I003DD',
      isCDNSupported: '1',
    };

    let encryptloginPayload = this.defaultEncrypt(JSON.stringify(loginPayload));

    let r: AxiosResponse = await axios({
      method: 'post',
      maxBodyLength: Infinity,
      url: `${this.gsb_gateway}/json/MyMoAuthen/login`,
      data: JSON.stringify({
        req: {
          app: 'MyMoGSB',
          dom: 'MyMo',
          header: {
            data: encryptloginPayload,
          },
          op: 'login',
          sid: '',
          srv: 'MyMoAuthen',
        },
      }),
      headers: { ...this.getHeaders() },
    }).catch(function (error) {
      return error.response;
    });
    // console.log(r.data);

    if (r.data.res.header.sid) {
      this.session = r.data.res.header.sid;
      this.session_time = Date.now();
    }
    // console.log(r.data.res);
    let decryptResponseBase64 = Buffer.from(
      this.defaultDecrypt(r.data.res.header.data),
      'base64',
    ).toString('utf-8');
    let decryptResponse = JSON.parse(decryptResponseBase64);

    this.seed = decryptResponse.seed;

    return decryptResponse;
  }

  public async getAccount() {
    // console.log("session =>",this.session);
    const getPrimaryAccountPayload = {
      version: this.appVersion,
      lang: 'th',
      os: 'Android',
      deviceModel: 'ASUS_I003DD',
      osVersion: '31',
      isCDNSupported: '1',
    };

    let encryptgetPrimaryAccountPayload = this.userEncryptReq(
      JSON.stringify(getPrimaryAccountPayload),
    );

    let r: AxiosResponse = await axios({
      method: 'post',
      maxBodyLength: Infinity,
      url: `${this.gsb_gateway}/json/Account/getPrimaryAccount`,
      data: JSON.stringify({
        req: {
          app: 'MyMoGSB',
          dom: 'MyMo',
          header: {
            data: encryptgetPrimaryAccountPayload,
          },
          op: 'getPrimaryAccount',
          sid: this.session,
          srv: 'Account',
        },
      }),
      headers: { ...this.getHeaders() },
    }).catch(function (error) {
      // console.log(error.response);

      return error.response;
    });
    // console.log(r.data)

    // console.log(r.data.res.header.sid)
    if (r.data.res.header.sid) {
      this.session = r.data.res.header.sid;
      this.session_time = Date.now();
    }
    // console.log(r.data)
    let decryptResponseBase64 = Buffer.from(
      this.userDecryptReq(r.data.res.header.data),
      'base64',
    ).toString('utf-8');
    let decryptResponse = JSON.parse(decryptResponseBase64);
    // console.log(decryptResponse)
    return decryptResponse;
  }

  public async getTransaction(accountFrom: string, numberOfRecord = 10) {
    // console.log("session =>",this.session);
    const from = dayjs().startOf('month').format('YYYYMMDD').toString();
    const to = dayjs().format('YYYYMMDD').toString();
    const filterTimelinePayload = {
      period: '365',
      numberOfRecord: String(numberOfRecord),
      lastTransactionSeq: '',
      value: {
        account: [`${accountFrom}`],
        transactionDate: { from, to },
      },
      type: 'account',
      version: this.appVersion,
      lang: 'th',
      os: 'Android',
      deviceModel: 'ASUS_I003DD',
      osVersion: '31',
      isCDNSupported: '1',
    };

    let encryptfilterTimelinePayload = this.userEncryptReq(
      JSON.stringify(filterTimelinePayload),
    );

    let r: AxiosResponse = await axios({
      method: 'post',
      maxBodyLength: Infinity,
      url: `${this.gsb_gateway}/json/Timeline/filterTimeline`,
      data: JSON.stringify({
        req: {
          app: 'MyMoGSB',
          dom: 'MyMo',
          header: {
            data: encryptfilterTimelinePayload,
          },
          op: 'filterTimeline',
          sid: this.session,
          srv: 'Timeline',
        },
      }),
      headers: { ...this.getHeaders() },
    }).catch(function (error) {
      return error.response;
    });

    //

    if (r.data.res.header.sid) {
      this.session = r.data.res.header.sid;
      this.session_time = Date.now();
    }
    let decryptResponseBase64 = Buffer.from(
      this.userDecryptReq(r.data.res.header.data),
      'base64',
    ).toString('utf-8');
    let decryptResponse = JSON.parse(decryptResponseBase64);
    return decryptResponse;
  }

  public async transfer_create(
    accountFrom: string,
    accountTo: string,
    bankCode: string,
    amount: number,
  ) {
    const prePostPaymentPayload = {
      certCardNo: '',
      certGroup: '',
      certPeriod: '',
      flagCreditLimit: '1',
      isPartial: '0',
      lowNumber: '',
      salakTerm: '',
      unit: '',
      accountFrom: accountFrom,
      accountTo: `A-${bankCode}-${accountTo}---`,
      amount: amount.toString(),
      note: '',
      suggestedHashtag: [],
      selectedHashtag: [],
      version: this.appVersion,
      lang: 'th',
      os: 'Android',
      securityVersion: '2',
      deviceModel: 'ASUS_I003DD',
      osVersion: '31',
      isCDNSupported: '1',
    };

    let encryptprePostPaymentPayload = this.userEncryptReq(
      JSON.stringify(prePostPaymentPayload),
    );
    console.log(encryptprePostPaymentPayload);
    let r: AxiosResponse = await axios({
      method: 'post',
      maxBodyLength: Infinity,
      url: `${this.gsb_gateway}/json/Payment/prePost`,
      data: JSON.stringify({
        req: {
          app: 'MyMoGSB',
          dom: 'MyMo',
          header: {
            data: encryptprePostPaymentPayload,
          },
          op: 'prePost',
          sid: this.session,
          srv: 'Payment',
        },
      }),
      headers: { ...this.getHeaders() },
    }).catch(function (error) {
      console.log(error.response);
      return error.response;
    });

    if (r.data.res.header.sid) {
      this.session = r.data.res.header.sid;
      this.session_time = Date.now();
    }
    let decryptResponseBase64 = Buffer.from(
      this.userDecryptReq(r.data.res.header.data),
      'base64',
    ).toString('utf-8');
    let decryptResponse = JSON.parse(decryptResponseBase64);
    return decryptResponse;
  }

  public async transfer_confirmation(
    accountFrom: string,
    accountTo: string,
    bankCode: string,
    amount: number,
    txRef: string,
  ) {
    const PostPaymentPayload = {
      certCardNo: '',
      certGroup: '',
      certPeriod: '',
      flagCreditLimit: '1',
      isPartial: '0',
      lowNumber: '',
      salakTerm: '',
      unit: '',
      accountFrom: accountFrom,
      accountTo: `A-${bankCode}-${accountTo}---`,
      amount: amount.toString(),
      transRefCode: txRef,
      key: '',
      version: this.appVersion,
      lang: 'th',
      os: 'Android',
      deviceModel: 'ASUS_I003DD',
      osVersion: '31',
      isCDNSupported: '1',
    };

    let encryptPostPaymentPayload = this.userEncryptReq(
      JSON.stringify(PostPaymentPayload),
    );

    let r: AxiosResponse = await axios({
      method: 'post',
      maxBodyLength: Infinity,
      url: `${this.gsb_gateway}/json/Payment/post`,
      data: JSON.stringify({
        req: {
          app: 'MyMoGSB',
          dom: 'MyMo',
          header: {
            data: encryptPostPaymentPayload,
          },
          op: 'post',
          sid: this.session,
          srv: 'Payment',
        },
      }),
      headers: { ...this.getHeaders() },
    }).catch(function (error) {
      return error.response;
    });

    if (r.data.res.header.sid) {
      this.session = r.data.res.header.sid;
      this.session_time = Date.now();
    }
    let decryptResponseBase64 = Buffer.from(
      this.userDecryptReq(r.data.res.header.data),
      'base64',
    ).toString('utf-8');
    let decryptResponse = JSON.parse(decryptResponseBase64);
    return decryptResponse;
  }

  public async validateSecurityFaceRecognition(imageBase64: string) {
    const validateSecurityFaceRecognitionPayload = {
      version: this.appVersion,
      os: 'Android',
      lang: 'th',
      photoTargetBase64: imageBase64,
      imageMeta: { density: '420', height: '960', width: '720' },
      attempt: '0',
      deviceModel: 'ASUS_I003DD',
      osVersion: '31',
      isCDNSupported: '1',
    };

    let encryptvalidateSecurityFaceRecognitionPayload = this.userEncryptReq(
      JSON.stringify(validateSecurityFaceRecognitionPayload),
    );

    let r: AxiosResponse = await axios({
      method: 'post',
      maxBodyLength: Infinity,
      url: `${this.gsb_gateway}/json/Security/validateSecurityFaceRecognition`,
      data: JSON.stringify({
        req: {
          app: 'MyMoGSB',
          dom: 'MyMo',
          header: {
            data: encryptvalidateSecurityFaceRecognitionPayload,
          },
          op: 'validateSecurityFaceRecognition',
          sid: this.session,
          srv: 'Security',
        },
      }),
      headers: { ...this.getHeaders() },
    }).catch(function (error) {
      return error.response;
    });

    if (r.data.res.header.sid) {
      this.session = r.data.res.header.sid;
      this.session_time = Date.now();
    }
    let decryptResponseBase64 = Buffer.from(
      this.userDecryptReq(r.data.res.header.data),
      'base64',
    ).toString('utf-8');
    let decryptResponse = JSON.parse(decryptResponseBase64);
    return decryptResponse;
  }

  public async getTxnLimit() {
    const getTxnLimitPayload = {
      flagCreditLimit: '1',
      version: this.appVersion,
      lang: 'th',
      os: 'Android',
      deviceModel: 'ASUS_I003DD',
      osVersion: '31',
      isCDNSupported: '1',
    };

    let encryptgetTxnLimitPayload = this.userEncryptReq(
      JSON.stringify(getTxnLimitPayload),
    );

    let r: AxiosResponse = await axios({
      method: 'post',
      maxBodyLength: Infinity,
      url: `${this.gsb_gateway}/json/User/getTxnLimit`,
      data: JSON.stringify({
        req: {
          app: 'MyMoGSB',
          dom: 'MyMo',
          header: {
            data: encryptgetTxnLimitPayload,
          },
          op: 'getTxnLimit',
          sid: this.session,
          srv: 'User',
        },
      }),
      headers: { ...this.getHeaders() },
    }).catch(function (error) {
      return error.response;
    });

    if (r.data.res.header.sid) {
      this.session = r.data.res.header.sid;
      this.session_time = Date.now();
    }
    let decryptResponseBase64 = Buffer.from(
      this.userDecryptReq(r.data.res.header.data),
      'base64',
    ).toString('utf-8');
    let decryptResponse = JSON.parse(decryptResponseBase64);
    return decryptResponse;
  }

  public async checkMyMoUser() {
    const checkMyMoUserPayload = {
      citizenId: this.config.citizenId,
      version: this.appVersion,
      lang: 'th',
      os: 'Android',
      deviceModel: 'ASUS_I003DD',
      osVersion: '33',
      isCDNSupported: '1',
    };

    let encryptcheckMyMoUserPayload = this.defaultEncrypt(
      JSON.stringify(checkMyMoUserPayload),
    );

    let r: AxiosResponse = await axios({
      method: 'post',
      maxBodyLength: Infinity,
      url: `${this.gsb_gateway}/json/MyMoAuthen/checkMyMoUser`,
      data: JSON.stringify({
        req: {
          app: 'MyMoGSB',
          dom: 'MyMo',
          header: {
            data: encryptcheckMyMoUserPayload,
          },
          op: 'checkMyMoUser',
          sid: '',
          srv: 'MyMoAuthen',
        },
      }),
      headers: { ...this.getHeaders() },
    }).catch(function (error) {
      // console.log(error);

      return error.response;
    });

    // console.log(r);

    let decryptResponseBase64 = Buffer.from(
      this.defaultDecrypt(r.data.res.header.data),
      'base64',
    ).toString('utf-8');
    let decryptResponse = JSON.parse(decryptResponseBase64);
    return decryptResponse;
  }

  public async saveMobileNumber() {
    const saveMobileNumberPayload = {
      application_id: 'MyMoMyLife',
      request_id: crypto.randomUUID().toLowerCase().toString(),
    };

    let r: AxiosResponse = await axios({
      method: 'post',
      maxBodyLength: Infinity,
      url: `http://mymo.gsb.or.th/v1/customers/saveMobileNumber`,
      data: JSON.stringify(saveMobileNumberPayload),
      headers: { ...this.getHeaders(), 'x-msisdn': this.config.phone },
    }).catch(function (error) {
      return error.response;
    });
    return r.data;
  }

  public async checkOnboardPhoneRequest(token: string) {
    const phoneRequestV2Payload = {
      citizenId: this.config.citizenId,
      token: token,
      version: this.appVersion,
      lang: 'th',
      os: 'Android',
      mobileNumber: this.config.phone,
      // deviceModel: 'ASUS_I003DD',
      // osVersion: '31',
      // isCDNSupported: '1'
    };

    let encryptphoneRequestV2Payload = this.defaultEncrypt(
      JSON.stringify(phoneRequestV2Payload),
    );

    let r: AxiosResponse = await axios({
      method: 'post',
      maxBodyLength: Infinity,
      url: `${this.gsb_gateway}/json/MyMoAuthen/checkOnboardPhoneRequest`,
      data: JSON.stringify({
        req: {
          app: 'MyMoGSB',
          dom: 'MyMo',
          header: {
            data: encryptphoneRequestV2Payload,
          },
          op: 'checkOnboardPhoneRequest',
          sid: '',
          srv: 'MyMoAuthen',
        },
      }),
      headers: { ...this.getHeaders() },
    }).catch(function (error) {
      return error.response;
    });

    console.log(r.data);

    let decryptResponseBase64 = Buffer.from(
      this.defaultDecrypt(r.data.res.header.data),
      'base64',
    ).toString('utf-8');
    let decryptResponse = JSON.parse(decryptResponseBase64);
    console.log(decryptResponse);
    return decryptResponse;
  }

  public async saveActivationTerm() {
    const saveActivationTermPayload = {
      citizenId: this.config.citizenId,
      version: this.appVersion,
      lang: 'th',
      os: 'Android',
      deviceModel: 'ASUS_I003DD',
      osVersion: '33',
      isCDNSupported: '1',
    };

    let encryptsaveActivationTermPayload = this.defaultEncrypt(
      JSON.stringify(saveActivationTermPayload),
    );

    let r: AxiosResponse = await axios({
      method: 'post',
      maxBodyLength: Infinity,
      url: `${this.gsb_gateway}/json/Config/saveActivationTerm`,
      data: JSON.stringify({
        req: {
          app: 'MyMoGSB',
          dom: 'MyMo',
          header: {
            data: encryptsaveActivationTermPayload,
          },
          op: 'saveActivationTerm',
          sid: '',
          srv: 'Config',
        },
      }),
      headers: { ...this.getHeaders() },
    }).catch(function (error) {
      return error.response;
    });

    let decryptResponseBase64 = Buffer.from(
      this.defaultDecrypt(r.data.res.header.data),
      'base64',
    ).toString('utf-8');
    let decryptResponse = JSON.parse(decryptResponseBase64);
    return decryptResponse;
  }

  public async curTimeMillis() {
    const curTimeMillisPayload = {
      version: this.appVersion,
      lang: 'th',
      os: 'Android',
      deviceModel: 'ASUS_I003DD',
      osVersion: '31',
      isCDNSupported: '1',
    };

    let encryptcurTimeMillisPayload = this.defaultEncrypt(
      JSON.stringify(curTimeMillisPayload),
    );

    let r: AxiosResponse = await axios({
      method: 'post',
      maxBodyLength: Infinity,
      url: `${this.gsb_gateway}/json/MyMoAuthen/curTimeMillis`,
      data: JSON.stringify({
        req: {
          app: 'MyMoGSB',
          dom: 'MyMo',
          header: {
            data: encryptcurTimeMillisPayload,
          },
          op: 'curTimeMillis',
          sid: '',
          srv: 'MyMoAuthen',
        },
      }),
      headers: { ...this.getHeaders() },
    }).catch(function (error) {
      return error.response;
    });

    let decryptResponseBase64 = Buffer.from(
      this.defaultDecrypt(r.data.res.header.data),
      'base64',
    ).toString('utf-8');
    let decryptResponse = JSON.parse(decryptResponseBase64);
    return decryptResponse;
  }

  public async otpRequest() {
    const otpRequestPayload = {
      termVersion: '9.4',
      termId: '1',
      citizenId: this.config.citizenId,
      version: this.appVersion,
      lang: 'th',
      os: 'Android',
      deviceModel: 'ASUS_I003DD',
      osVersion: '31',
      isCDNSupported: '1',
    };

    let encryptotpRequestPayload = this.defaultEncrypt(
      JSON.stringify(otpRequestPayload),
    );

    let r: AxiosResponse = await axios({
      method: 'post',
      maxBodyLength: Infinity,
      url: `${this.gsb_gateway}/json/MyMoAuthen/otpRequest`,
      data: JSON.stringify({
        req: {
          app: 'MyMoGSB',
          dom: 'MyMo',
          header: {
            data: encryptotpRequestPayload,
          },
          op: 'otpRequest',
          sid: '',
          srv: 'MyMoAuthen',
        },
      }),
      headers: { ...this.getHeaders() },
    }).catch(function (error) {
      return error.response;
    });

    console.log(r.data);

    if (r.data.err) {
      console.log('ERROR:', r.data);
      return r.data;
    }

    let decryptResponseBase64 = Buffer.from(
      this.defaultDecrypt(r.data.res.header.data),
      'base64',
    ).toString('utf-8');
    let decryptResponse = JSON.parse(decryptResponseBase64);
    return decryptResponse;
  }

  public async validateOtp(key: string) {
    const validateOtpPayload = {
      citizenId: this.config.citizenId,
      key: key,
      version: this.appVersion,
      lang: 'th',
      os: 'Android',
      deviceModel: 'ASUS_I003DD',
      osVersion: '31',
      isCDNSupported: '1',
    };

    console.log(validateOtpPayload);

    let encryptvalidateOtpPayload = this.defaultEncrypt(
      JSON.stringify(validateOtpPayload),
    );

    let r: AxiosResponse = await axios({
      method: 'post',
      maxBodyLength: Infinity,
      url: `${this.gsb_gateway}/json/MyMoAuthen/validateOtp`,
      data: JSON.stringify({
        req: {
          app: 'MyMoGSB',
          dom: 'MyMo',
          header: {
            data: encryptvalidateOtpPayload,
          },
          op: 'validateOtp',
          sid: '',
          srv: 'MyMoAuthen',
        },
      }),
      headers: { ...this.getHeaders() },
    }).catch(function (error) {
      return error.response;
    });

    console.log(r.data);
    let decryptResponseBase64 = Buffer.from(
      this.defaultDecrypt(r.data.res.header.data),
      'base64',
    ).toString('utf-8');
    let decryptResponse = JSON.parse(decryptResponseBase64);
    return decryptResponse;
  }
}

export interface Iconfig {
  citizenId: string;
  deviceId?: string;
  phone?: string;
  pin?: string;
}
