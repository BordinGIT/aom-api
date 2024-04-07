import { Injectable } from '@nestjs/common';
import { GSB } from './lib/gsb.class';

@Injectable()
export class AppService {
  getHello(): string {
    return 'MyMo by GSB 2.22.0';
  }

  async OTPGet(citizenId: string, phone: string, pin: string) {
    console.log(citizenId, phone, pin);
    let gsbGenDevice = new GSB({
      citizenId: citizenId,
      phone: phone,
      pin: pin,
    });

    let checkUser = await gsbGenDevice.checkMyMoUser();
    console.log(checkUser);

    if (checkUser.isMyMoUser == '0') return;
    console.log(checkUser);

    let a = await gsbGenDevice.saveMobileNumber();
    console.log(a);
    await gsbGenDevice.checkOnboardPhoneRequest(a.token);
    await gsbGenDevice.saveActivationTerm();
    await gsbGenDevice.curTimeMillis();
    await gsbGenDevice.otpRequest();

    return 'Send OTP to [POST] /otp/validate {citizenId:string,otp:string}';
  }

  async OTPValidate(citizenId: string, otp: string) {
    let gsbGenDevice = new GSB({
      citizenId: citizenId,
    });

    const validateOtp = await gsbGenDevice.validateOtp(otp);
    console.log(validateOtp);

    return validateOtp;
  }

  async Transactions(citizenId: string, deviceId: string, pin: string) {
    let gsbSession = new GSB({
      citizenId: citizenId,
      deviceId: deviceId,
      pin: pin,
    });

    let login = await gsbSession.login();
    console.log(login);
    let accounts = await gsbSession.getAccount();
    console.log(accounts);

    let transactions = await gsbSession.getTransaction(
      accounts.account.accountNo,
    );
    console.dir(transactions, null);

    return transactions;
  }

  async Checkname(
    citizenId: string,
    deviceId: string,
    pin: string,
    accountTo: string,
    bankCode: string,
    amount: number,
  ) {
    let gsbSession = new GSB({
      citizenId: citizenId,
      deviceId: deviceId,
      pin: pin,
    });

    let login = await gsbSession.login();
    let accounts = await gsbSession.getAccount();

    let checkname = await gsbSession.transfer_create(
      accounts.account.accountNo,
      accountTo,
      bankCode,
      amount,
    );
    let named = checkname?.accountToName;
    console.dir(checkname, null);

    return named;
  }

  async Summary(citizenId: string, deviceId: string, pin: string) {
    let gsbSession = new GSB({
      citizenId: citizenId,
      deviceId: deviceId,
      pin: pin,
    });

    let login = await gsbSession.login();
    let accounts = await gsbSession.getAccount();

    return accounts;
  }

  async Transfer(
    citizenId: string,
    deviceId: string,
    pin: string,
    accountTo: string,
    bankCode: string,
    amount: number,
  ) {
    let gsbSession = new GSB({
      citizenId: citizenId,
      deviceId: deviceId,
      pin: pin,
    });

    let login = await gsbSession.login();
    console.log(login);
    let accounts = await gsbSession.getAccount();
    console.log(accounts);

    let checkname = await gsbSession.transfer_create(
      accounts.account.accountNo,
      accountTo,
      bankCode,
      amount,
    );
    let txRef = checkname.transRefCode;
    let transfer = await gsbSession.transfer_confirmation(
      accounts.account.accountNo,
      accountTo,
      bankCode,
      amount,
      txRef,
    );
    console.log(transfer);
    console.dir(transfer, null);

    return transfer;
  }
}
