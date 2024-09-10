// Imports
import { Body, Controller, Post, Res } from '@nestjs/common';
import { kInternalError, kSuccessData } from 'src/constants/responses';
import { SigndeskService } from './signdesk.service';

@Controller('thirdParty/signdesk')
export class SignDeskController {
  constructor(private readonly service: SigndeskService) {}

  @Post('requestAadhaarOTP')
  async funRequestAadhaarOTP(@Res() res) {
    try {
      const data = await this.service.addAadhaarNumber('267581433372');
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('validateAadhaarOTP')
  async funValidateAadharOTP(@Body() body, @Res() res) {
    try {
      const otp = body.otp;
      const reference_id = body.reference_id;
      const transaction_id = body.transaction_id;

      const otpJson = { reference_id, transaction_id, otp };
      const data = await this.service.validateAadhaarOTP(otpJson);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  @Post('validateOptionalDoc')
  async funValidateOptionalDoc(@Body() body, @Res() res) {
    try {
      const frontImage = body?.frontImage;
      const backImage = body?.backImage;
      const type = body?.type;

      const data = await this.service.validateOtherDoc(
        frontImage,
        type,
        backImage,
      );
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }

  // Callback response from signdesk server
  @Post('debitSheetUpdate')
  async funDebitSheetUpdate(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.debitSheetUpdate(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
      console.log(error);
      return res.send(kInternalError);
    }
  }
}
