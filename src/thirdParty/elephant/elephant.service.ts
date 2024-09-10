// Imports
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { APIService } from 'src/utils/api.service';
import {
  nElephantCheckStatus,
  nElephantCOI,
  nElephantProposal,
  nElephantToken,
} from 'src/constants/network';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import { TypeService } from 'src/utils/type.service';
import { EnvConfig } from 'src/configs/env.config';
import { INSURANCE_SERVICES } from 'src/constants/globals';

@Injectable()
export class ElephantService {
  constructor(
    private readonly api: APIService,
    private readonly typeService: TypeService,
  ) {}

  async generateAuthToken() {
    try {
      // URL
      const url = nElephantToken;
      // Body preparation
      const body = {
        username: `${EnvConfig.nbfc.nbfcShortName.toLowerCase()}.token`,
        password: process.env.ELEPHANT_PASS,
        type: 1,
      };
      // API call
      const response = await this.api.post(url, body);
      if (response == k500Error) return kInternalError;
      if (!response.utoken) return k422ErrorMessage('field utoken is missing');

      return response;
    } catch (error) {
      return kInternalError;
    }
  }

  async initiateProposal(reqData) {
    try {
      // Params validation
      const name = reqData.name?.toLowerCase();
      if (!name) return kParamMissing('name');
      const phone = reqData.phone;
      if (!phone) return kParamMissing('phone');
      const email = reqData.email;
      if (!email) return kParamMissing('email');
      let dob = reqData.dob;
      if (!dob) return kParamMissing('dob');
      dob = this.typeService.dateToJsonStr(dob);
      let gender = reqData.gender;
      if (!gender) return kParamMissing('gender');
      const bankAccNumber = reqData.bankAccNumber;
      if (!bankAccNumber) return kParamMissing('bankAccNumber');
      const aadhaarAddress = reqData.aadhaarAddress;
      if (!aadhaarAddress) return kParamMissing('aadhaarAddress');
      const approvedAmount = reqData.approvedAmount?.toString();
      if (!approvedAmount) return kParamMissing('approvedAmount');
      const loanTenure = reqData.loanTenure?.toString();
      if (!loanTenure) return kParamMissing('loanTenure');
      const loanId = reqData.loanId;
      if (!loanId) return kParamMissing('loanId');
      const pincode = reqData.pincode;
      if (!pincode) return kParamMissing('pincode');
      let disbursementDate = reqData.disbursementDate ?? new Date().toJSON();
      if (!disbursementDate) return kParamMissing('disbursementDate');
      if (typeof disbursementDate != 'string')
        disbursementDate = disbursementDate.toJSON();
      if (disbursementDate.includes('T'))
        disbursementDate =
          this.typeService.jsonToReadableDate(disbursementDate);
      const nomineeDetails = {
        Nominee_First_Name: 'Legal',
        Nominee_Last_Name: 'Heir',
      };
      const insuranceDetails = reqData.insuranceDetails;
      if (!insuranceDetails) return kParamMissing('insuranceDetails');
      const totalPremium = insuranceDetails.totalPremium?.toString();
      if (!totalPremium) return kParamMissing('totalPremium');
      let SumInsuredData = [];
      if (
        INSURANCE_SERVICES.ACCEDENT_AND_EMIP == true &&
        INSURANCE_SERVICES.LOSS_OF_JOB == true
      )
        SumInsuredData = [
          {
            PlanCode: 4212,
            SumInsured: insuranceDetails?.planASumInsured?.toString(),
            Shortcode: 'GPA',
            Premium: insuranceDetails?.planAPremium?.toString(),
          },
          {
            PlanCode: 4217,
            SumInsured: insuranceDetails?.planBSumInsured?.toString(),
            Shortcode: 'EMIP',
            Premium: insuranceDetails?.planBPremium?.toString(),
          },
          {
            PlanCode: 4218,
            SumInsured: insuranceDetails?.planCSumInsured?.toString(),
            Shortcode: 'LOE',
            Premium: insuranceDetails?.planCPremium?.toString(),
          },
        ];
      else if (
        INSURANCE_SERVICES.ACCEDENT_AND_EMIP == true &&
        INSURANCE_SERVICES.LOSS_OF_JOB == false
      ) {
        SumInsuredData = [
          {
            PlanCode: 4212,
            SumInsured: insuranceDetails?.planASumInsured?.toString(),
            Shortcode: 'GPA',
            Premium: insuranceDetails?.planAPremium?.toString(),
          },
          {
            PlanCode: 4217,
            SumInsured: insuranceDetails?.planBSumInsured?.toString(),
            Shortcode: 'EMIP',
            Premium: insuranceDetails?.planBPremium?.toString(),
          },
        ];
      } else if (
        INSURANCE_SERVICES.ACCEDENT_AND_EMIP == false &&
        INSURANCE_SERVICES.LOSS_OF_JOB == true
      ) {
        SumInsuredData = [
          {
            PlanCode: 4218,
            SumInsured: insuranceDetails?.planCSumInsured?.toString(),
            Shortcode: 'LOE',
            Premium: insuranceDetails?.planCPremium?.toString(),
          },
        ];
      }
      // URL
      const url = nElephantProposal;
      // Authorization
      const authData = await this.generateAuthToken();
      if (authData?.message) return authData;

      // Body preparation
      const splittedNames = name.split(' ');
      let first_name = '';
      let middle_name = '';
      let last_name = '';
      if (splittedNames.length > 0) {
        // Skip middle name
        if (splittedNames.length <= 2) {
          first_name = splittedNames[0];
          last_name = splittedNames[1] ?? '';
        }
        // Handle middle name
        else {
          for (let index = 0; index < splittedNames.length; index++) {
            if (index == splittedNames.length - 1) {
              last_name = splittedNames[index];
              first_name = first_name.trim();
            } else first_name += `${splittedNames[index]} `;
          }
        }
      }
      if (first_name.includes('.')) first_name = first_name.replace('.', '');
      if (last_name == '') last_name = '.';
      let salutation = 'Mr';
      gender = gender.toLowerCase()[0];
      if (gender == 'f') {
        salutation = 'Ms';
        gender = 'Female';
      } else gender = 'Male';
      const unique_id = loanId;
      const body = {
        token: authData.utoken,
        ClientCreation: {
          partner: `${EnvConfig.nbfc.nbfcName}`,
          plan: `${insuranceDetails.plane}`,
          unique_id,
          salutation,
          first_name,
          middle_name,
          last_name,
          gender,
          dob,
          email_id: email,
          mobile_number: phone,
          tenure: '1',
          is_coapplicant: 'No',
          coapplicant_no: '',
          userId: authData.user_id,
          sm_location: 'Mumbai',
          alternateMobileNo: null,
          homeAddressLine1: aadhaarAddress,
          homeAddressLine2: null,
          homeAddressLine3: null,
          pincode,
        },
        QuoteRequest: {
          NoOfLives: '1',
          adult_count: '1',
          child_count: '0',
          LoanDetails: {
            LoanDisbursementDate: disbursementDate,
            LoanAmount: insuranceDetails?.planBSumInsured?.toString(),
            LoanAccountNo: bankAccNumber,
            LoanTenure: loanTenure,
          },
          SumInsuredData: SumInsuredData,
        },
        MemObj: {
          Member: [
            {
              MemberNo: 1,
              Salutation: salutation,
              First_Name: first_name,
              Middle_Name: middle_name,
              Last_Name: last_name,
              Gender: gender,
              DateOfBirth: dob,
              Relation_Code: '1',
            },
          ],
        },
        ReceiptCreation: {
          modeOfEntry: 'Direct',
          PaymentMode: '4',
          bankName: '',
          branchName: '',
          bankLocation: '',
          chequeType: '',
          ifscCode: '',
        },
        Nominee_Detail: nomineeDetails,
        PolicyCreationRequest: {
          IsPolicyIssuance: '1',
          TransactionNumber: 'LoanId-' + loanId,
          TransactionRcvdDate: this.typeService.jsonToReadableDate(
            new Date().toJSON(),
          ),
          CollectionAmount: totalPremium,
          PaymentMode: 'CD Balance',
        },
      };
      // API call
      const response = await this.api.post(url, body);
      if (!response || response == k500Error) return kInternalError;
      const data: any = {
        body: JSON.stringify(body),
        response: JSON.stringify(response),
      };
      if (
        response?.acko?.coi_no &&
        response?.acko?.coi_url &&
        response?.care?.coi_no &&
        response?.care?.coi_url
      ) {
        data.insuranceURL = response?.care.coi_url;
        data.insuranceURL1 = response?.acko.coi_url;
        data.status = 1;
      } else data.status = 2;
      return data;
    } catch (error) {
      return kInternalError;
    }
  }

  //#region get COI
  async getCOI(Lan_number) {
    try {
      // Authorization
      const authData = await this.generateAuthToken();
      if (authData?.message) return authData;
      const body = { token: authData.utoken, Lan_number };
      const url = nElephantCOI;
      // API call
      const response = await this.api.post(url, body);
      if (!response || response == k500Error) return kInternalError;
      const data = { success: false, url: '', url1: '' };
      if (response?.success != false) {
        response.forEach((ele) => {
          try {
            if (ele['COI_url']) {
              if (!data.url) data.url = ele['COI_url'];
              else data.url1 = ele['COI_url'];
              data.success = true;
            }
          } catch (error) {}
        });
      }
      return data;
    } catch (error) {
      return kInternalError;
    }
  }

  async funCheckInsuranceStatus(reqData) {
    const unique_id = reqData?.unique_id;
    const plan_id = reqData?.plan_id;
    if (!unique_id) return kParamMissing('unique_id');
    if (!plan_id) return kParamMissing('plan_id');
    const authData = await this.generateAuthToken();
    if (authData?.message) return authData;
    const body = {
      utoken: authData.utoken,
      plan_id: plan_id,
      unique_id: unique_id,
    };
    const url = nElephantCheckStatus;
    const response = await this.api.post(url, body);
    if (!response || response == k500Error) throw new Error();
    return response;
  }
  //#endregion
}
