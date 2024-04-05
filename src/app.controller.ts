import { Controller, Get, Post, Body, Headers } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('otp/get')
  async OTPGet(@Body() body) {
    const { citizenId, phone, pin } = body;
    return this.appService.OTPGet(citizenId, phone, pin);
  }

  @Post('otp/validate')
  async OTPValidate(@Body() body) {
    // console.log(body);

    const { citizenId, otp } = body;
    return this.appService.OTPValidate(citizenId, otp);
  }

  @Post('transactions')
  async Transactions(@Body() body) {
    // console.log(body);

    const { citizenId, deviceId, pin } = body;
    return this.appService.Transactions(citizenId, deviceId, pin);
  }

  @Post('checkname')
  async Checkname(@Headers() header, @Body() body) {
    console.log(body);
    console.log(header);
    const { citizenId, deviceId, pin, accountTo, bankCode, amount } = body;
    return this.appService.Checkname(
      citizenId,
      deviceId,
      pin,
      accountTo,
      bankCode,
      amount,
    );
  }

  @Post('transfer')
  async Transfer(@Body() body) {
    console.log(body);

    const { citizenId, deviceId, pin, accountTo, bankCode, amount } = body;
    return this.appService.Transfer(
      citizenId,
      deviceId,
      pin,
      accountTo,
      bankCode,
      amount,
    );
  }
}
