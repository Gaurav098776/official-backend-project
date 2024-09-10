// Imports
import { Injectable } from '@nestjs/common';
import { EnvConfig } from 'src/configs/env.config';
import {
  isCIBILPROD,
  CIBIL_BASE_URL,
  CIBIL_API_KEY,
  CIBIL_MEMBER_PASS,
  CIBIL_MEMBER_REF_ID,
  CIBIL_MEMBER_USERID,
  gIsPROD,
  GLOBAL_FLOW,
} from 'src/constants/globals';
import { k500Error } from 'src/constants/misc';
import { nDirectCibilFetch } from 'src/constants/network';
import { RedisKeys } from 'src/constants/objects';
const https = require('https');
const fs = require('fs');
import {
  k422ErrorMessage,
  kInternalError,
  kInvalidParamValue,
  kParamMissing,
} from 'src/constants/responses';
import { RedisService } from 'src/redis/redis.service';
import { APIService } from 'src/utils/api.service';
import { convertDateInDDMMYYYY } from 'src/utils/type.service';

const UATSampleData = [
  {
    Name: 'ROHIT SONI',
    gender: '2',
    DOB: '25111994',
    PAN: 'FVGPS6635R',
    Address: 'A 603, Vajram Tiara, Doddaballpura',
    statecode: '27',
    pincode: '424001',
    City: 'DHULE',
  },
  {
    Name: 'Lav Shaw',
    gender: '2',
    DOB: '15121993',
    PAN: 'EHEPS6295G',
    Address: 'ORIAPARA ROAD GARULIA Garulia',
    statecode: '27',
    pincode: '424001',
    City: 'DHULE',
  },
  {
    Name: 'SUKHVINDRA SINGH',
    gender: '2',
    DOB: '20101987',
    PAN: 'FPKPS8995Q',
    Address: 'C/O BADLU CHOUDHARY MAJARA',
    statecode: '27',
    pincode: '424001',
    City: 'DHULE',
  },
  {
    Name: 'ROHIT PERKE',
    gender: '2',
    DOB: '02011998',
    PAN: 'EKNPP5302K',
    Address: 'CLEDONTON BUNGLOW, CHURCH',
    statecode: '27',
    pincode: '424001',
    City: 'DHULE',
  },
  {
    Name: 'NANDINI YADAV',
    gender: '1',
    DOB: '13051994',
    PAN: 'ALVPY9013D',
    Address: 'HNO   29 1502 3 2 1A, MALKAJGIRI',
    statecode: '27',
    pincode: '424001',
    City: 'DHULE',
  },
  {
    Name: 'SACHIN OBHAN',
    gender: '2',
    DOB: '21051982',
    PAN: 'AAHPO7310C',
    Address: 'HNO FLAT NO 33053 3D BLOCK',
    statecode: '27',
    pincode: '424001',
    City: 'DHULE',
  },
  {
    Name: 'Raju Paul',
    gender: '2',
    DOB: '03071992',
    PAN: 'COQPP2511H',
    Address: 'THAKURDAS SARANI RABINDRA',
    statecode: '27',
    pincode: '424001',
    City: 'DHULE',
  },
  {
    Name: 'BRAJESH RAMASHANKAR',
    gender: '2',
    DOB: '12101981',
    PAN: 'AJVPG8105E',
    Address: '66/a, Pratap Nagar, pratap nagar',
    statecode: '27',
    pincode: '424001',
    City: 'DHULE',
  },
  {
    Name: 'M NAGARAJA',
    gender: '2',
    DOB: '20061984',
    PAN: 'BCNPN7742J',
    Address: 'N0 236 VEERABHADRA NILAYA',
    statecode: '27',
    pincode: '424001',
    City: 'DHULE',
  },
  {
    Name: 'M SRINIVASAN',
    gender: '2',
    DOB: '26031990',
    PAN: 'GMCPS7013H',
    Address: 'NO 24 A3 PATHMANABHAN NAGAR',
    statecode: '27',
    pincode: '424001',
    City: 'DHULE',
  },
  {
    Name: 'ABHISHEK MENGANE',
    gender: '2',
    DOB: '27121989',
    PAN: 'BYDPM3637D',
    Address: 'Room No 402 B Wing Marethon',
    statecode: '27',
    pincode: '424001',
    City: 'DHULE',
  },
  {
    Name: 'SHASHI KANT SHUKLA',
    gender: '2',
    DOB: '03041974',
    PAN: 'HZLPS3764J',
    Address: '13 L I G PART 3 GANGA GANJ',
    statecode: '27',
    pincode: '424001',
    City: 'DHULE',
  },
  {
    Name: 'Vaibhav Bharate',
    gender: '2',
    DOB: '20101996',
    PAN: 'DLWPB5599B',
    Address: 'FLAT NO 03 1ST FLOOR SAIRAJ',
    statecode: '27',
    pincode: '424001',
    City: 'DHULE',
  },
  {
    Name: 'Deepak Rawat',
    gender: '2',
    DOB: '05051998',
    PAN: 'DOFPR6148J',
    Address: 'C O Nandan Singh Rawat 9A',
    statecode: '27',
    pincode: '424001',
    City: 'DHULE',
  },
];

@Injectable()
export class CibilThirdParty {
  constructor(
    private readonly api: APIService,
    // Database
    private readonly redis: RedisService,
  ) {}

  async onlinePrefill(reqData: any) {
    try {
      const monitoringDate = convertDateInDDMMYYYY(new Date().toJSON());
      const custRefId = reqData.custRefId ?? 'CR101';
      const sampleData = {
        serviceCode: 'CN1OPF0001',
        monitoringDate: monitoringDate,
        searchPaths: [
          {
            searchPath: 'phoneNameSearch',
          },
        ],
        consumerInputSubject: {
          tuefHeader: {
            headerType: 'TUEF',
            version: '12',
            memberRefNo: 'MR101',
            gstStateCode: '01',
            enquiryMemberUserId: CIBIL_MEMBER_USERID,
            enquiryPassword: CIBIL_MEMBER_PASS,
            enquiryPurpose: '65',
            enquiryAmount: '000050000',
            scoreType: '08',
            outputFormat: '03',
            responseSize: '1',
            ioMedia: 'CC',
            authenticationMethod: 'L',
          },
          names: [
            {
              index: 'N01',
              firstName: 'GAURAV',
              middleName: '',
              lastName: 'BHATIA',
            },
          ],
          telephones: [
            {
              index: 'T01',
              telephoneNumber: '9910433711',
              telephoneType: '01',
            },
          ],
        },
      };
      let data = reqData;
      if (!reqData.serviceCode) data = sampleData;
      if (gIsPROD && reqData?.sampledata?.serviceCode)
        data = reqData.sampledata;

      const httpsAgent = await this.getCibilHttpAgent();
      const headers = await this.getCibilAPIHeader(custRefId);
      const result = await this.api.cibilPost(
        CIBIL_BASE_URL + 'digital-onboarding/acquire/v1/prefill',
        data,
        headers,
        httpsAgent,
      );
      if (result == k500Error) return kInternalError;
      return result;
    } catch (error) {
      return kInternalError;
    }
  }

  async consumerCIRMultiSearchPath(reqData: any) {
    try {
      const monitoringDate = convertDateInDDMMYYYY(new Date().toJSON());
      const custRefId = reqData.custRefId ?? 'LSP000123';
      const sampleData = {
        serviceCode: 'CN1CAS0004',
        monitoringDate: monitoringDate,
        searchPaths: [
          {
            searchPath: 'phoneNameSearch',
          },
        ],
        consumerInputSubject: {
          tuefHeader: {
            headerType: 'TUEF',
            version: '12',
            memberRefNo: 'MemberReferenceNumber',
            gstStateCode: '01',
            enquiryMemberUserId: CIBIL_MEMBER_USERID,
            enquiryPassword: CIBIL_MEMBER_PASS,
            enquiryPurpose: '65',
            enquiryAmount: '000050000',
            scoreType: '10',
            outputFormat: '03',
            responseSize: '1',
            ioMedia: 'CC',
            authenticationMethod: 'L',
          },
          names: [
            {
              index: 'N01',
              firstName: 'KATHIR',
              middleName: 'ESAN',
              lastName: 'MARIAM',
              birthDate: '04071989',
              gender: '2',
            },
          ],
          telephones: [
            {
              index: 'T01',
              telephoneNumber: '9826XXXXXX',
              telephoneType: '01',
              telephoneExtension: '',
            },
          ],
        },
      };
      let data = reqData;
      if (!reqData) data = sampleData;

      const httpsAgent = await this.getCibilHttpAgent();
      const headers = await this.getCibilAPIHeader(custRefId);
      const result = await this.api.cibilPost(
        CIBIL_BASE_URL + 'acquire/credit-assessment/v2/consumer-cir',
        data,
        headers,
        httpsAgent,
      );
      if (result == k500Error) return kInternalError;
      return result;
    } catch (error) {
      return kInternalError;
    }
  }

  async CreditVisionScore(reqData: any) {
    try {
      const monitoringDate = convertDateInDDMMYYYY(new Date().toJSON());
      const custRefId = reqData.custRefId ?? 'LSP000123';
      const sampleData = {
        serviceCode: 'CN1CAS0004',
        monitoringDate: monitoringDate,
        consumerInputSubject: {
          tuefHeader: {
            headerType: 'TUEF',
            version: '12',
            memberRefNo: 'MEMBER REF NO',
            gstStateCode: '01',
            enquiryMemberUserId: CIBIL_MEMBER_USERID,
            enquiryPassword: CIBIL_MEMBER_PASS,
            enquiryPurpose: '05',
            enquiryAmount: '000049500',
            scoreType: '08',
            outputFormat: '03',
            responseSize: '1',
            ioMedia: 'CC',
            authenticationMethod: 'L',
          },
          names: [
            {
              index: 'N01',
              firstName: 'KATHIR',
              middleName: 'ESAN',
              lastName: 'MARIAM',
              birthDate: '04071989',
              gender: '2',
            },
          ],
          ids: [
            {
              index: 'I01',
              idNumber: 'PHAPAXXXXX',
              idType: '01',
            },
          ],
          telephones: [
            {
              index: 'T01',
              telephoneNumber: '98934XXXXX',
              telephoneType: '01',
            },
          ],
          addresses: [
            {
              index: 'A01',
              line1: 'NO 843',
              line2: 'KONGU VIBROSTREET TNAGAR',
              stateCode: '33',
              pinCode: '600054',
              addressCategory: '01',
              residenceCode: '01',
            },
          ],
          enquiryAccounts: [
            {
              index: 'I01',
              accountNumber: '',
            },
          ],
        },
      };
      let data = reqData;
      if (!reqData) data = sampleData;

      const httpsAgent = await this.getCibilHttpAgent();
      const headers = await this.getCibilAPIHeader(custRefId);
      const result = await this.api.cibilPost(
        CIBIL_BASE_URL + 'acquire/credit-assessment/v1/consumer-cir-cv',
        data,
        headers,
        httpsAgent,
      );
      if (result == k500Error) return kInternalError;
      return result;
    } catch (error) {
      return kInternalError;
    }
  }

  async CreditVisionScorePersonalLoanScore(reqData: any) {
    try {
      // Temporary fix
      if (reqData.internal_api_hit) throw new Error();
      if (
        GLOBAL_FLOW.CIBIL_HIT_MODE == 'THIRD_PARTY' &&
        EnvConfig.server.parallelServer
      ) {
        reqData.internal_api_hit = true;
        const response = await this.api.requestPost(nDirectCibilFetch, reqData);
        if (response == k500Error) throw new Error();
        return response.data ?? response;
      }

      const randomNo = await this.between(1, 14);
      const randomData = UATSampleData[randomNo];
      const monitoringDate = convertDateInDDMMYYYY(new Date().toJSON());
      const custRefId = reqData.custRefId ?? 'CR101';
      const sampleData = {
        serviceCode: 'CN1CAS0013',
        monitoringDate: monitoringDate,
        consumerInputSubject: {
          tuefHeader: {
            headerType: 'TUEF',
            version: '12',
            memberRefNo: 'MR101',
            gstStateCode: '01',
            enquiryMemberUserId: CIBIL_MEMBER_USERID,
            enquiryPassword: CIBIL_MEMBER_PASS,
            enquiryPurpose: '05',
            enquiryAmount: '000000001',
            scoreType: '16',
            outputFormat: '03',
            responseSize: '1',
            ioMedia: 'CC',
            authenticationMethod: 'L',
          },
          names: [
            {
              index: 'N01',
              firstName: randomData.Name.split(' ')[0] ?? '',
              middleName: randomData.Name.split(' ')[2] ?? '',
              lastName: randomData.Name.split(' ')[1] ?? '',
              birthDate: randomData.DOB,
              gender: randomData.gender,
            },
          ],
          ids: [
            {
              index: 'I01',
              idNumber: randomData.PAN,
              idType: '01',
            },
          ],
          telephones: [
            {
              index: 'T01',
              telephoneNumber: '7874846133',
              telephoneType: '01',
            },
          ],
          addresses: [
            {
              index: 'A01',
              line1: randomData.Address,
              line2: '',
              stateCode: randomData.statecode,
              pinCode: randomData.pincode,
              addressCategory: '01',
              residenceCode: '01',
            },
          ],
          enquiryAccounts: [
            {
              index: 'I01',
              accountNumber: '',
            },
          ],
        },
      };
      let data = reqData;
      if (!reqData.serviceCode) data = sampleData;
      if (gIsPROD && reqData?.sampledata?.serviceCode)
        data = reqData.sampledata;

      const httpsAgent = await this.getCibilHttpAgent();
      const headers = await this.getCibilAPIHeader(custRefId);
      const result = await this.api.cibilPost(
        CIBIL_BASE_URL + 'acquire/credit-assessment/v1/consumer-cir-cv',
        data,
        headers,
        httpsAgent,
      );
      if (result == k500Error) return kInternalError;
      return result;
    } catch (error) {
      return kInternalError;
    }
  }

  async checkAllAPI(body: any) {
    try {
      const custRefId = body?.custRefId;
      if (!custRefId) return kParamMissing('custRefId');
      const url = body?.url;
      if (!url) return kParamMissing('url');
      const sampledata = body?.sampledata;
      if (!sampledata) return kParamMissing('sampledata');

      const httpsAgent = await this.getCibilHttpAgent();
      const headers = await this.getCibilAPIHeader(custRefId);
      const result = await this.api.cibilPost(
        CIBIL_BASE_URL + url,
        sampledata,
        headers,
        httpsAgent,
      );
      if (result == k500Error) return kInternalError;
      return result;
    } catch (error) {
      return kInternalError;
    }
  }

  async between(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
  }

  async getCibilHttpAgent() {
    let httpsAgent: any = '';
    if (isCIBILPROD == true) {
      let cibilSSLPath = 'upload/cibil/prod';
      httpsAgent = new https.Agent({
        rejectUnauthorized: false,
        cert: fs.readFileSync(cibilSSLPath + '/cibil.prod.cer'),
        key: fs.readFileSync(cibilSSLPath + '/cibil.prod.key'),
        ca: fs.readFileSync(cibilSSLPath + '/productionChain2024.crt'),
      });
      return httpsAgent;
    } else {
      let cibilSSLPath = 'upload/cibil/uat';
      httpsAgent = new https.Agent({
        rejectUnauthorized: false,
        cert: fs.readFileSync(cibilSSLPath + '/cibil.uat.cer'),
        key: fs.readFileSync(cibilSSLPath + '/cibil.uat.key'),
        ca: fs.readFileSync(cibilSSLPath + '/CombinedChainCert.crt'),
      });
      return httpsAgent;
    }
  }

  async getCibilAPIHeader(custRefId) {
    const headers = {
      'Content-Type': 'application/json',
      apikey: CIBIL_API_KEY,
      'cust-ref-id': custRefId,
      'member-ref-id': CIBIL_MEMBER_REF_ID,
    };
    return headers;
  }

  async updateMockResponse(reqData) {
    // Params validation
    const panNumber = reqData.panNumber;
    if (!panNumber) return kParamMissing('panNumber');
    const responseData = reqData.responseData;
    if (!responseData) return kParamMissing('responseData');
    if (!EnvConfig.mock.panNumbers.includes(panNumber))
      return kInvalidParamValue('panNumber');

    let mockData = await this.redis.getKeyDetails(RedisKeys.MOCK_CIBIL_DATA);
    if (!mockData) return k422ErrorMessage('No mock data available');
    if (typeof mockData == 'string') mockData = JSON.parse(mockData);
    if (typeof mockData == 'string') mockData = JSON.parse(mockData);

    mockData[panNumber] = responseData;
    await this.redis.updateKeyDetails(
      RedisKeys.MOCK_CIBIL_DATA,
      JSON.stringify(mockData),
    );

    return {};
  }
}
