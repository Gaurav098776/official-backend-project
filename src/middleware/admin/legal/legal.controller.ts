// Imports
import { LegalService } from './legal.service';
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { advocate_role } from 'src/constants/globals';
import {
  kInternalError,
  kParamMissing,
  kParamsMissing,
  kSuccessData,
} from 'src/constants/responses';
import { AssignmentSharedService } from 'src/shared/assignment.service';
import { MigrateLegalService } from './migrate.legal.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { kUploadFileObj } from 'src/constants/objects';

@Controller('admin/legal')
export class LegalController {
  constructor(
    private readonly service: LegalService,
    private readonly migrateLegalService: MigrateLegalService,
    private readonly sharedAssingAdmin: AssignmentSharedService,
  ) {}

  @Get('createDemandLetter')
  async funCreateDemandLatter(@Query() query, @Res() res) {
    try {
      this.service.funCreateDemandLetter(query);
      return res.json(kSuccessData);
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('sendLegalMail')
  async funSentDemandLetterMail(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.sendNoticeToUser(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('createLegalNotice')
  async funCreateLegalNotice(@Query() query, @Res() res) {
    try {
      this.service.funCreateLegalNotice(query);
      return res.json(kSuccessData);
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('assingedToCollection')
  async funAssingedToCollection(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.funAssingedToCollection(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('getAllLegalData')
  async funGetLegalData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getAllLegalData(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('checkLegalsAssingedToCollection')
  async funCehckLegalAssingedToCollection(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funCheckLegalAssingToCollection(
        query,
      );
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('advocateList')
  async funAdvocateList(@Res() res) {
    try {
      //role base api for advocate list
      const data = await this.sharedAssingAdmin.fetchAdminAccordingRole(
        advocate_role,
        true,
      );
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('changeAdvocate')
  async funChanegeAdvocate(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.funChangeAdvocate(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('moveToCaseToBeFile')
  async funcMoveToCaseToBeFile(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.funMoveToCaseToBeFile(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('moveToInProgress')
  async funMoveToProgress(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.funMoveToProgress(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('placeAutodebitAfterCase')
  async funPlaceAutodebitAfterCase(@Res() res) {
    try {
      const data: any = await this.service.funPlaceAutodebitAfterCase();
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('autoDebitList')
  async funAutoDebitList(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funAutoDebitList(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {}
  }

  @Post('fillingInProgress')
  async funFillingInProgress(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.funFillingInProgress(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  //notify all the advocate that your legal case is completed
  @Post('legalCloseLoan')
  async funLegalCloseLoan(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.legalCloseLegalAndCloseLoan(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  //migrate old legal to new legal
  @Get('migarateOldNoticeToNew')
  async funMigrateOldToNew(@Res() res) {
    try {
      let data: any = await this.migrateLegalService.migrateAdvocate();
      if (data?.message) return res.json({ data, error: 'migrateAdvocate' });
      let type: any = ['SOFT_NOTICE', 'SIGNED_NOTICE'];
      data = await this.migrateLegalService.funMigrate(type);
      if (data?.message) return res.json({ data, error: 'funMigrate', type });
      data = await this.migrateLegalService.caseReadyForFiledMigare();
      if (data?.message)
        return res.json({ data, error: 'caseReadyForFiledMigare' });

      data = await this.migrateLegalService.caseFiledMigare();
      if (data?.message) return res.json({ data, error: 'caseFiledMigare' });

      type = 'SUMMONS';
      data = await this.migrateLegalService.funMigrate(type);
      if (data?.message) return res.json({ data, error: 'funMigrate', type });

      type = 'WARRANT';
      data = await this.migrateLegalService.funMigrate(type);
      if (data?.message) return res.json({ data, error: 'funMigrate', type });
      //after all migrate check all the legal which loans is closed
      await this.migrateLegalService.checkAllActiveLegalAndClose();
      //check any legal assignable to collection
      await this.service.funCheckLegalAssingToCollection();
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('addConsigmentNumber')
  async funAddConsignmentNumber(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.addConsignmentNumber(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('getLegalByLoanId')
  async funGetLegalByLoanId(@Query() Query, @Res() res) {
    try {
      const data: any = await this.service.funGetLegalbyLoanId(Query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  //under development
  @Get('getTrackingData')
  async funGetTrackingData(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funGetTrackingData(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('uploadSummons')
  async funUploadSummons(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.funUploadSummons(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('uploadWarrent')
  async funUploadWarrent(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.funUploadWarrent(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('getComplaintList')
  async funGetcomplaintList(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funGetcomplaintList(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('casewithdrawal')
  async funCaseWithdrawal(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funCaseWithdrawal(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('caseDisposal')
  async funCaseDisposal(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.funCaseDisposal(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('caseDisposalViaFile')
  @UseInterceptors(FileInterceptor('file', kUploadFileObj()))
  async funCaseDisposalViaFile(@Body() body, @UploadedFile() file, @Res() res) {
    try {
      if (file) {
        const fileName = file.filename;
        if (!fileName) return res.json(kParamsMissing);
        body.fileName = fileName;
      }
      const data: any = await this.service.caseDisposalViaFile(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('getAllLegalcounts')
  async funGetAllLegalCounts(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funGetAllLegalCount(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('getLegalConsigmentTrackData')
  async funGetLegalConsigmentTrackData(@Res() res) {
    try {
      const data: any = await this.service.funGetLegalConsigmentTrackData();
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('trackLegalConsignmentData')
  async trackLegalConsignmentData(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.trackLegalConsignmentData(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('updateLegalSentStatus')
  async updateLegalSentStatus(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.updateLegalSentStatus(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('legalMailTrack')
  async funLegalMailTrack(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.funLegalMailTrack(body);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('migrateOldCaseFiled')
  async funMigaretOldCaseFiled(@Res() res) {
    try {
      const data: any = await this.migrateLegalService.funMigreateFiledCase();
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('makeEligibleForAutodebit')
  async funMakeEligibleForAutodebit(@Res() res) {
    try {
      const data: any =
        await this.migrateLegalService.funMakeEligibleForAutodebit();
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
  @Post('removeAllUpcomingEmiNotice')
  async removeAllUpcomingEmiNotice(@Res() res) {
    try {
      const data: any =
        await this.migrateLegalService.removeAllUpcomingEmiNotice();
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('migrateLegalMail')
  async funMigrate(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.migrateLegal();
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('migrateStatusMailTrack')
  async funmigrateStatusMailTrack(@Res() res) {
    try {
      const data: any = await this.service.migrateStatusMailTrack();
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('migrateLegalAndStatus')
  async funmigrateLegalAndStatus(@Res() res) {
    try {
      const data: any = await this.service.migrateLegalAndStatus();
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
  @Post('sendSelectedDefaulterNoticeMail')
  async funSendSelectedDefaulterNoticeMail(@Res() res) {
    try {
      const data: any = await this.service.funSendSelectedDefaulterNoticeMail();
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('launchMailPage')
  async funLaunchMailPage(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.launchMailPage(query);
      if (data?.message) return res.json(data);
      if (query?.isAdmin?.toString() == 'true')
        return res.json({ ...kSuccessData, data });
      else if (typeof data == 'string') return res.redirect(data);
      else return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('migrateMailTrackerIdsintoLegal')
  async migrateMailTrackerIdsintoLegal(@Res() res) {
    try {
      const data: any = await this.service.migrateMailTrackerIdsintoLegal();
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('makeEligibleForLegal')
  async makeEligibleForLegal(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.makeEligibleForLegal(query);
      if (data?.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('updateMissedEmailStatus')
  async funUpdateMissedEmailStatus(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.updateMissedEmailStatus(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Post('insertMissingMails')
  async funInsertMissingMails(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.insertMissingMails(body);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  // just for developer use only
  @Post('moveToCaseToBeFileDEV')
  async funMoveToCaseToBeFileDEV(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.moveToCaseToBeFileDEV(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  // remove duplicat legal action
  @Get('removeDuplicateLegel')
  async funRemoveDuplicateLegel(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.removeDuplicateLegel(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  //send notification  before first hearing and next hearing date
  @Get('reminderHearingDateBA')
  async funReminderHearingDate(@Query() query, @Res() res) {
    try {
      // type == FIRST_HD add NEXT_HD
      const type = query?.type;
      if (!type) return res.json(kParamMissing('type'));

      const data: any = await this.service.reminderHearingDate(type);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  // resend mail which not send legal mail of user
  @Get('reSendLegalMail')
  async funSendLegalMail(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.reSendLegalMail(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('checkUnPaidEmiToAssignToCollection')
  async funcheckUnPaidEmiToAssignToCollection(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.funCheckLegalAssingToCollection(
        query,
      );
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  // send legal mail of Summons And Warrant Users for the offer remainder
  @Get('sendReminderSummonsWarrant')
  async funsendLMOfSummonsAndWarrantUsers(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.sendReminderSummonsWarrant(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('sendUpcomingPenalCharges')
  async sendUpcomingPenalCharges(@Res() res) {
    try {
      const data: any = await this.service.sendUpcomingPenalCharges();
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }
}
