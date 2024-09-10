import { Body, Controller, Post, Res } from '@nestjs/common';
import {
  k422ErrorMessage,
  kInternalError,
  kSuccessData,
} from 'src/constants/responses';
import { AwsService } from './aws.service';

@Controller('/aws')
export class AWSController {
  constructor(private readonly service: AwsService) {}

  @Post('compareImage')
  async funCompareImage(@Body() body, @Res() res) {
    try {
      const data = await this.service.compareImages(body);
      if (data.message) return res.json(k422ErrorMessage(data.message));
      return res.json({ ...kSuccessData, data });
    } catch (error) {
      return res.json(kInternalError);
    }
  }
}
