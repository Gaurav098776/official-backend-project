// Imports
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  kInternalError,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import { BANKINGADMINS, FINALBUCKETADMINS } from 'src/constants/strings';
import { MiscService } from 'src/admin/misc/misc.service';
import { FileInterceptor} from '@nestjs/platform-express';
import { kUploadFileObj } from 'src/constants/objects';
import { k500Error } from 'src/constants/misc';

@Controller('admin/misc/')
export class MiscController {
  constructor(private readonly service: MiscService) {}

  @Get('bankVerificationAdmins')
  async bankVerificationAdmins(@Res() res) {
    try {
      const data = await this.service.verificationAdmins(BANKINGADMINS);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('finalBucketVerificationAdmins')
  async finalBucketVerificationAdmins(@Res() res) {
    try {
      const data = await this.service.verificationAdmins(FINALBUCKETADMINS);
      if (data?.message) return res.send(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('createUserPermission')
  async funCreateUserPermission(@Body() body, @Res() res) {
    try {
      const data = await this.service.createUserPermission(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Post('editUserPermission')
  async funEditUserPermission(@Body() body, @Res() res) {
    try {
      const data = await this.service.editUserPermission(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Post('deleteUserPermission')
  async funDeleteUserPermission(@Body() body, @Res() res) {
    try {
      const id = body.id;
      if (!id) return res.json(kParamsMissing);
      const data = await this.service.deleteUserPermission(id);
      if (data == k500Error) return res.json(kInternalError);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('uploadFile')
  @UseInterceptors(FileInterceptor('media', kUploadFileObj()))
  async funUploadFile(@Body() body, @UploadedFile() file, @Res() res) {
    try {
      const data = await this.service.uploadFile({ ...body, file });
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Get('getConfigs')
  async getConfigs(@Res() res) {
    try {
      const data: any = await this.service.getConfig();
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Post('updateConfigs')
  async funUpdateConfig(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.updateConfig(body);
      if (data.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }
  @Post('addRBIGuidelines')
  @UseInterceptors(FileInterceptor('file'))
  async funaddRBIGuidelines(@UploadedFile() file, @Body() body, @Res() res) {
    const data: any = await this.service.addRBIGuidelines({ file, body });
    if (data.message) return res.send(data);
    return res.send({ ...kSuccessData, data });
  }
  @Get('getAllRBIGuidelines')
  async fungetAllRBIGuidelines(@Query() query, @Res() res) {
    const data: any = await this.service.getAllRBIGuidelines(query);
    if (data.message) return res.send(data);
    return res.send({ ...kSuccessData, data });
  }
}
