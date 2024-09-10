// Imports
import {
  nDigiLockerAuthorize,
  nDigiLockerExistance,
  nDigiLockerGetAuthToken,
  nDigiLockerPullAadhaar,
  nInsertLog,
} from 'src/constants/network';
const convert = require('xml-js');
import * as FormData from 'form-data';
import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
import { HOST_URL, Latest_Version } from 'src/constants/globals';
import { APIService } from 'src/utils/api.service';
import { EnvConfig } from 'src/configs/env.config';
import { regAadhaar } from 'src/constants/validation';
import { CryptService } from 'src/utils/crypt.service';
import {
  k422ErrorMessage,
  kInternalError,
  kParamMissing,
} from 'src/constants/responses';
import { MetricsSharedService } from 'src/shared/metrics.shared.service';
import { FileService } from 'src/utils/file.service';

@Injectable()
export class DigiLockerService {
  constructor(
    private readonly api: APIService,
    private readonly crypt: CryptService,
    private readonly fileService: FileService,
    // Shared services
    private readonly sharedMetrics: MetricsSharedService,
  ) {}

  async checkExistance(aadhaarNumber) {
    // Preparation -> API
    const options = { timeZone: 'Asia/Kolkata' };
    const currentISTTime = new Date().toLocaleString('en-US', options);
    const currentUnixTimestampIST = Math.floor(
      new Date(currentISTTime).getTime() / 1000,
    );
    const concatStr = `${EnvConfig.digiLocker.secretKey}${EnvConfig.digiLocker.clientId}${aadhaarNumber}${currentUnixTimestampIST}`;
    const body = new FormData();
    body.append('clientid', EnvConfig.digiLocker.clientId);
    body.append('hmac', this.crypt.getHash(concatStr));
    body.append('ts', currentUnixTimestampIST.toString());
    body.append('uid', aadhaarNumber);
    // Hit -> API
    const response = await this.api.post(
      nDigiLockerExistance,
      body,
      null,
      null,
      {
        headers: { ...body.getHeaders() },
      },
      true,
    );
    // Validation -> API response
    if (response === k500Error) return false; // Auto switch to zoop service no need to throw error (user's journey should not get affected)
    return response.registered === true;
  }

  async invitation(reqData) {
    // Validation -> parameter
    const userId = reqData.userId;
    if (!userId) return kParamMissing('userId');
    const aadhaarNumber = reqData.aadhaarNumber;
    if (!aadhaarNumber) return kParamMissing('aadhaarNumber');
    const aadhaarService = reqData?.aadhaar_service ?? 'DIGILOCKER_IN_HOUSE';
    if (!regAadhaar(aadhaarNumber))
      return k422ErrorMessage('Please enter valid aadhaar number');

    const key =
      'NBFC';
    const codeWord = 'NBFC';
    const sha256Hash = this.crypt.getHash(key);
    const codeChallenge = this.base64Encode(sha256Hash).replace('==', '');
    const queryStr =
      nDigiLockerAuthorize +
      `?response_type=code&client_id=${EnvConfig.digiLocker.clientId}&redirect_uri=${EnvConfig.digiLocker.redirectUrl}&state=${codeWord}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    // Metrics log
    await this.sharedMetrics.insertLog({
      type: 2,
      status: 2,
      subType: 1,
      userId,
      values: { activity: 'INVITATION' },
    });

    // Checks -> Aadhaar number is registered in digilocker platform or not
    const isExist = await this.checkExistance(aadhaarNumber);

    if (!isExist) return false;
    // Metrics log
    await this.sharedMetrics.insertLog({
      type: 2,
      status: 2,
      subType: 1,
      userId,
      values: { activity: 'EXISTANCE_CHECK', isExist },
    });

    return aadhaarService == 'DIGILOCKER_IN_HOUSE'
      ? {
          needBottomSheet: false,
          webviewData: {
            title: 'Aadhar verification',
            initialURL: 'https://www.digilocker.gov.in/login',
            initialLoader: true,
            jsTriggers: {
              'https://accounts.digilocker.gov.in/signin/smart_v2/': {
                allowContains: true,
                onLoadStop: {
                  state: { isLoader: true },
                  triggers: [
                    `document.getElementById('pills-aadhaar-tab').click();`,
                  ],
                },
              },
              'https://accounts.digilocker.gov.in/signin/uid_login': {
                allowContains: true,
                onLoadStop: {
                  state: { isLoader: true },
                  triggers: [
                    `function autoFillAadhaar(aadhaarNumber) {
                      document.querySelector('.header-top.d-none.d-sm-block').remove();
                      document.querySelector('footer').remove();
                      document.getElementById('pills-part-a-tab').remove();
                      document.getElementById('pills-profile-tab').remove();
                      document.getElementById('pills-aadhaar-tab').remove();
                      const element = document.querySelector('#username');
                      element.value = aadhaarNumber;
                      const event = new Event('input', { bubbles: true });
                      element.dispatchEvent(event);
                      document.getElementById('button').click();
                    }
                    autoFillAadhaar(${aadhaarNumber})`,
                  ],
                },
              },
              'https://accounts.digilocker.gov.in/signin/auth/signin_request_uid':
                {
                  allowContains: true,
                  onLoadStop: {
                    state: { isLoader: false },
                    triggers: [
                      `document.querySelector('.col-2.col-xl-8.col-lg-8').remove();
                        document.querySelector('.header-top.d-none.d-sm-block').remove();
                        document.querySelector('footer').remove();
                        document.getElementById('navbar-toggler-button').remove();
                        document.getElementById('play-pause').remove();`,
                    ],
                  },
                },
              'https://accounts.digilocker.gov.in/signin/auth/verify_uid_otp': {
                allowContains: true,
                onLoadStop: {
                  state: { isLoader: false },
                  triggers: [
                    `document.querySelector('.col-2.col-xl-8.col-lg-8').remove();
                      document.querySelector('.header-top.d-none.d-sm-block').remove();
                      document.querySelector('footer').remove();
                      document.getElementById('navbar-toggler-button').remove();`,
                  ],
                },
              },
              'https://www.digilocker.gov.in/login': {
                allowContains: true,
                onLoadStart: {
                  state: { isLoader: true },
                },
              },
              'https://www.digilocker.gov.in/home': {
                allowContains: true,
                onLoadStart: {
                  state: { isLoader: true },
                },
                onUpdateVisitedHistory: {
                  state: { isLoader: true },
                  triggers: [
                    'const value = `; ${document.cookie}`;',
                    `const data = async (value) => {
                        try {
                          const dParts = value.split("; d=");
                          const tokenParts = value.split("; jtoken=");
                          let dCookie;
                          let jTokenCookie;
                          if (dParts.length === 2 && tokenParts.length === 2) {
                              dCookie = dParts.pop().split(';').shift();
                              jTokenCookie = tokenParts.pop().split(';').shift();
                          };
                          if(!dCookie || !jTokenCookie) return false;
                          dCookie = dCookie.split('%22')[1]
                          jTokenCookie = jTokenCookie.split('%22')[1]
                          const requestOptions1 = {
                            headers: {   
                              'content-type':'application/x-www-form-urlencoded',
                              'jtoken' : jTokenCookie,
                              'device-security-id': dCookie
                            },
                            method: 'POST',
                          };
                          const response1 = await fetch("https://ids.digilocker.gov.in/api/2.0/issueddocs", requestOptions1)
                          const listtt = await response1.json();
                          let uri;
                          for(let data of listtt) {
                              if(data.doc_type_id == 'ADHAR') {
                                  uri = "URI="+data.uri;
                              }
                          }
                          if(!uri) return false;
                          const requestOptions2 = {
                            headers: {
                              'content-type':'application/x-www-form-urlencoded',
                              'jtoken' : jTokenCookie,
                              'device-security-id': dCookie,
                            },
                            body: uri.toString(),
                            method: 'POST',
                          };
                          const response2 = await fetch("https://ids.digilocker.gov.in/api/2.0/metadata", requestOptions2);
                          let listtt2 = await response2.json();
                          listtt2 = JSON.stringify(listtt2);
                          console.log("GOT_AADHAR_DATA" + listtt2);
                        } catch(error) {}
                      }
                      data(value);`,
                  ],
                },
                consoles: [
                  {
                    combinations: ['GOT_AADHAR_DATA'],
                    apiTriggers: [
                      {
                        url:
                          HOST_URL + 'thirdParty/digiLocker/digilockerMetadata',
                        method: 'POST',
                        body: {
                          userId,
                          aadhaarNumber,
                        },
                      },
                    ],
                  },
                ],
              },
            },
          },
        }
      : {
          needBottomSheet: false,
          webviewData: {
            title: 'Verify your kyc',
            initialURL: queryStr,
            initialLoader: true,
            type: 'DIGILOCKER_AUTH',
            jsTriggers: {
              'https://accounts.digitallocker.gov.in/signin/oauth_partner': {
                allowContains: true,
                consoles: [
                  {
                    apiTriggers: [
                      {
                        url: nInsertLog,
                        method: 'POST',
                        body: {
                          type: 2,
                          subType: 1,
                          status: 2,
                          values: {
                            activity: 'URL_LOADED',
                            url: 'https://accounts.digitallocker.gov.in/signin/oauth_partner',
                          },
                          userId,
                        },
                      },
                    ],
                    combinations: ['METRICS->4'],
                  },
                  {
                    combinations: ['STOP_LOADING_'],
                    state: { isLoader: false },
                  },
                ],
                onLoadStop: {
                  triggers: !isExist
                    ? [
                        'console.log("METRICS->4" + new Date().getTime().toString());',
                        `document.querySelector('.form-group a').click();`,
                      ]
                    : [
                        'console.log("METRICS->4" + new Date().getTime().toString());',
                        `document.getElementsByClassName('nav-item ml-2')[0].remove()`,
                        `document.getElementsByClassName('nav-item ml-2')[0].remove()`,
                        `console.log("STOP_LOADING_" + new Date().toJSON())`,
                      ],
                },
              },
              'https://accounts.digitallocker.gov.in/oauth_partner/register': {
                allowContains: true,
                onLoadStop: {
                  state: { isLoader: false },
                  triggers: [
                    `document.getElementsByTagName("p")[2].remove();`,
                    `document.getElementsByClassName("navbar-brand order-1 order-lg-1")[0].onclick = function (event) {
                event.preventDefault();
              };`,
                    `function autoFillAadhaar(aadhaarNumber) {
                  try {
                      var inputInt = setInterval(()=> {
                          try {
                              if (document.getElementById("aadhaar_1")) {
                                    clearInterval(inputInt);
                                    document.getElementById("aadhaar_1").value = aadhaarNumber.substring(0,4);
                                    document.getElementById("aadhaar_2").value = aadhaarNumber.substring(4,8);
                                    document.getElementById("aadhaar_3").value = aadhaarNumber.substring(8,12);
                                    setTimeout(()=> {
                                        try {
                                           document.getElementsByTagName("button")[0].click();
                                        } catch (error) {}
                                    }, 1500);
                              }
              
                          } catch (error) {}
                      });
                  } catch (error) {}
              } autoFillAadhaar("${aadhaarNumber}");`,
                  ],
                },
              },
              'https://accounts.digitallocker.gov.in/signin/auth/get_user': {
                onLoadStop: {
                  triggers: [`document.getElementById('pills-tab').remove()`],
                },
              },
              // Forgot security pin
              'https://accounts.digitallocker.gov.in/signin/set_pin': {
                consoles: [
                  {
                    apiTriggers: [
                      {
                        url: nInsertLog,
                        method: 'POST',
                        body: {
                          type: 2,
                          subType: 1,
                          status: 2,
                          values: {
                            activity: 'URL_LOADED',
                            subActivity: 'FORGOT_SECURITY_PIN',
                            url: 'https://accounts.digitallocker.gov.in/signin/set_pin',
                          },
                          userId,
                        },
                      },
                    ],
                    combinations: ['METRICS->7'],
                  },
                ],
                onLoadStop: {
                  triggers: [
                    'console.log("METRICS->7" + new Date().getTime().toString());',
                    'var card=document.querySelector(".card-body"),container=document.createElement("div");container.style.height="400px",container.style.width="70vw",card.appendChild(container);',
                  ],
                },
              },
              'https://accounts.digitallocker.gov.in/oauth_partner/signup/send_otp':
                {
                  consoles: [
                    {
                      apiTriggers: [
                        {
                          url: nInsertLog,
                          method: 'POST',
                          body: {
                            type: 2,
                            subType: 1,
                            status: 2,
                            values: {
                              activity: 'URL_LOADED',
                              subActivity: 'OTP_SENT',
                              url: 'https://accounts.digitallocker.gov.in/oauth_partner/signup/send_otp',
                            },
                            userId,
                          },
                        },
                      ],
                      combinations: ['METRICS->5'],
                    },
                  ],
                  onLoadStop: {
                    state: { isProcessing: false },
                    triggers: [
                      'console.log("METRICS->5" + new Date().getTime().toString());',
                      `document.getElementsByTagName("p")[3].remove();`,
                    ],
                  },
                },
              'https://accounts.digitallocker.gov.in/oauth_partner/signup/verify_otp':
                {
                  consoles: [
                    {
                      apiTriggers: [
                        {
                          url: nInsertLog,
                          method: 'POST',
                          body: {
                            type: 2,
                            subType: 1,
                            status: 2,
                            values: {
                              activity: 'URL_LOADED',
                              subActivity: 'OTP_SUBMITTED',
                              url: 'https://accounts.digitallocker.gov.in/oauth_partner/signup/verify_otp',
                            },
                            userId,
                          },
                        },
                      ],
                      combinations: ['METRICS->6'],
                    },
                  ],
                  onLoadStop: {
                    triggers: [
                      'console.log("METRICS->6" + new Date().getTime().toString());',
                      'var card=document.querySelector(".card-body"),container=document.createElement("div");container.style.height="400px",container.style.width="70vw",card.appendChild(container);',
                    ],
                  },
                },
              'https://accounts.digitallocker.gov.in/oauth_partner/signup/verify_pin':
                {
                  onLoadStop: {
                    triggers: [
                      'var card=document.querySelector(".card-body"),container=document.createElement("div");container.style.height="400px",container.style.width="70vw",card.appendChild(container);',
                    ],
                  },
                },
              'https://accounts.digitallocker.gov.in/oauth_partner/signup/validate_dob':
                {
                  onLoadStop: {
                    triggers: [
                      'var card=document.querySelector(".card-body"),container=document.createElement("div");container.style.height="400px",container.style.width="70vw",card.appendChild(container);',
                    ],
                  },
                },
              'https://accounts.digitallocker.gov.in/signin/smart_v2': {
                allowContains: true,
                onLoadStop: {
                  triggers: [
                    'document.getElementById("pills-profile-tab").click();',
                  ],
                },
              },
              'https://accounts.digitallocker.gov.in/signin/username_login': {
                allowContains: true,
                onLoadStop: {
                  state: { isLoader: false },
                  triggers: [
                    `document.getElementsByClassName('card-body')[0].style.marginTop = '50px';`,
                    `document.getElementById('username').value = '${aadhaarNumber}';`,
                    `document.getElementsByClassName('form-group')[4].remove();`,
                    `document.getElementById('pills-tab').remove();`,
                    `document.getElementById('username').disabled = true;`,
                    `eye('username'); document.getElementById('eyeOpenUid').style.visibility = 'hidden';`,
                    `document.getElementsByClassName(
                'navbar-brand order-1 order-lg-1',
              )[0].onclick = function (event) {
                event.preventDefault();
              };`,
                  ],
                },
              },
              'https://accounts.digitallocker.gov.in/signin/auth/signin_request':
                {
                  allowContains: true,
                  consoles: [
                    {
                      apiTriggers: [
                        {
                          url: nInsertLog,
                          method: 'POST',
                          body: {
                            type: 2,
                            subType: 1,
                            status: 2,
                            values: {
                              activity: 'URL_LOADED',
                              subActivity: 'OTP_SENT',
                              url: 'https://accounts.digitallocker.gov.in/signin/auth/signin_request',
                            },
                            userId,
                          },
                        },
                      ],
                      combinations: ['METRICS->5'],
                    },
                  ],
                  onLoadStop: {
                    state: { isLoader: false },
                    triggers: [
                      'console.log("METRICS->5" + new Date().getTime().toString());',
                      `document.getElementsByClassName('card-body')[0].style.marginTop = '50px';`,
                      `document.getElementById('username').value = '${aadhaarNumber}';`,
                      `document.getElementsByClassName('form-group')[4].remove();`,
                      `document.getElementById('pills-tab').remove();`,
                      `document.getElementById('username').disabled = true;`,
                      `eye('username'); document.getElementById('eyeOpenUid').style.visibility = 'hidden';`,
                      `document.getElementsByClassName(
                  'navbar-brand order-1 order-lg-1',
                )[0].onclick = function (event) {
                  event.preventDefault();
                };`,
                    ],
                  },
                },
              'https://consent.digilocker.gov.in/consent-form': {
                onLoadStart: { isProcessing: true },
                onLoadStop: {
                  state: { isProcessing: true },
                  triggers: [
                    `setTimeout(()=> {
                document.querySelectorAll('input[type="submit"]')[1].click();
            }, 2500);`,
                  ],
                },
              },
              [EnvConfig.digiLocker.redirectUrl]: {
                allowContains: true,
                onLoadStop: {
                  triggers: [
                    'console.log("METRICS->8" + new Date().getTime().toString());',
                    "console.log('REDIRECT_URL_COMPLETED' + window.location.href)",
                  ],
                },
                onUpdateVisitedHistory: { state: { isProcessing: true } },
                consoles: [
                  {
                    apiTriggers: [
                      {
                        url: HOST_URL + 'thirdParty/digilocker/pullAadhaar',
                        method: 'POST',
                        body: { aadhaarNumber, userId },
                      },
                    ],
                    combinations: ['REDIRECT_URL_', 'COMPLETED'],
                  },
                  // Metrics
                  {
                    apiTriggers: [
                      {
                        url: nInsertLog,
                        method: 'POST',
                        body: {
                          type: 2,
                          subType: 1,
                          status: 2,
                          values: {
                            activity: 'AUTH_COMPLETED',
                            subActivity: 'REDIRECTION',
                            url: EnvConfig.digiLocker.redirectUrl,
                          },
                          userId,
                        },
                      },
                    ],
                    combinations: ['METRICS->8'],
                  },
                ],
              },
            },
          },
        };
  }

  async pullAadhaar(reqData) {
    // Validation -> parameter
    const aadhaarNumber = reqData.aadhaarNumber;
    if (!aadhaarNumber) return kParamMissing('aadhaarNumber');
    const userId = reqData.userId;
    if (!userId) return kParamMissing('userId');
    let internalResponse = reqData.internalResponse;
    if (!internalResponse) return kParamMissing('internalResponse');
    internalResponse = internalResponse.split(
      EnvConfig.digiLocker.redirectUrl + '?',
    )[1];
    const internalSpans = internalResponse.split('&');
    let code = internalSpans[0].replace('code=', '');
    let state = internalSpans[1].replace('state=', '');

    // Preparation -> api
    const body = {
      code,
      grant_type: 'authorization_code',
      client_id: EnvConfig.digiLocker.clientId,
      client_secret: EnvConfig.digiLocker.secretKey,
      redirect_uri: EnvConfig.digiLocker.redirectUrl,
      code_verifier: state,
    };
    const options: any = { headers: { 'Content-Type': 'application/json' } };
    // Hit -> api -> Generate auth token
    const authResponse = await this.api.post(
      nDigiLockerGetAuthToken,
      body,
      null,
      null,
      options,
    );
    if (authResponse == k500Error) return kInternalError;

    // Preparation -> api
    const headers = {
      Authorization: `Bearer ${authResponse.access_token}`,
      userId: userId,
      'Content-Type': 'application/json',
    };
    // Hit -> api -> Pull e-Aadhaar
    const aadhaarXMLResponse = await this.api.get(
      nDigiLockerPullAadhaar,
      null,
      headers,
    );
    const aadhaarResponseJson = this.xmlToJsonObject(aadhaarXMLResponse);
    const rawJsonList =
      aadhaarResponseJson.elements[0].elements[0].elements[0].elements[0];
    const aadhaarResponseList = rawJsonList.elements;

    const poiData = aadhaarResponseList.find(
      (el) => el.name == 'Poi',
    ).attributes;
    const poaData = aadhaarResponseList.find(
      (el) => el.name == 'Poa',
    ).attributes;
    const phtData = aadhaarResponseList.find((el) => el.name == 'Pht')
      .elements[0];
    // Validate aadhaar number with digilocker details
    const uidData = rawJsonList?.attributes?.uid;
    if (uidData) {
      const maskedUid = uidData.replace(/x/g, '').trim();
      if (!aadhaarNumber.includes(maskedUid)) {
        return k422ErrorMessage(
          'Aadhaar number does not match as per digilocker aadhaar details',
        );
      }
    }

    // Prepare dob
    const dobSpans = poiData.dob.split('-');
    const dob = dobSpans.reverse().join('-');

    //rawJsonList.attributes.uid
    const aadhaarResponse = {
      status: 'Success',
      responseData: {
        digiReresponse: { authResponse, xmlStr: aadhaarXMLResponse },
        state: '',
        valid: true,
        eid: '',
        informationSharingConsent: true,
        localResName: poiData.name,
        localCareof: '',
        localBuilding: '',
        email: '',
        dob,
        mobile: authResponse.mobile,
        gender: poiData.gender[0] == 'M' ? 'MALE' : 'FEMALE',
        landmark: null,
        street: poaData.house ?? '',
        locality: '',
        district: '',
        vtc: '',
        building: '',
        districtName: poaData.dist ?? '',
        vtcName: poaData.vtc ?? '',
        stateName: poaData.state ?? '',
        poName: poaData.vtc ?? '',
        careof: '',
        poNameLocal: '',
        localVtc: '',
        localState: '',
        localDistrict: '',
        pincode: poaData.pc ?? '',
        uid: aadhaarNumber,
        localStreet: '',
        localLocality: '',
        localLandmark: null,
        refId: null,
        langCode: '',
        relationInfo: null,
        biometricFlag: false,
        dobStatus: '',
        enrolmentDate: '',
        enrolmentNumber: '',
        enrolmentType: '',
        exceptionPhoto: null,
        isCurrent: false,
        isNRI: 'false',
        isdCode: '+91',
        poType: null,
        poa: null,
        poi: null,
        residentPhoto: phtData.text,
        subDistrict: '',
        subDistrictLocalName: '',
        subDistrictName: '',
        updatedEIds: [],
        updatedEIdsCount: 0,
        updatedRefIds: [],
        updatedRefIdsCount: 0,
        name: poiData.name,
        aadhaar_service: 'DIGILOCKER',
      },
    };

    const callbackList = [
      {
        url: HOST_URL + `${Latest_Version}/kyc/validatemAadhaar`,
        method: 'POST',
        body: {
          aadhaarNumber,
          userId,
          aadhaarResponse,
        },
      },
    ];
    return { callbackList };
  }

  private base64Encode(input: string): string {
    const buffer = Buffer.from(input, 'utf-8');
    return buffer.toString('base64');
  }

  private xmlToJsonObject(xmlStr: string): any {
    return convert.xml2js(xmlStr, { compact: false, spaces: 4 });
  }

  async digilockerMetadata(reqData) {
    const userId = reqData?.userId;
    if (!userId) return kParamMissing('userId');
    const internalResponse = reqData?.internalResponse;
    if (!internalResponse) return kParamMissing('internalResponse');
    const aadhaarNumber = reqData?.aadhaarNumber;
    if (!aadhaarNumber) return kParamMissing('aadhaarNumber');

    const fullResponse = JSON.parse(
      internalResponse.split('GOT_AADHAR_DATA')[1],
    );
    const dob = fullResponse?.dateOfBirth ? fullResponse.dateOfBirth : '';

    //rawJsonList.attributes.uid
    const aadhaarResponse = {
      status: 'Success',
      responseData: {
        digiReresponse: {},
        state: '',
        valid: true,
        eid: '',
        informationSharingConsent: true,
        localResName: fullResponse.residentName ?? '',
        localCareof: '',
        localBuilding: '',
        email: '',
        dob,
        mobile: fullResponse.mobile ?? '',
        gender: fullResponse.gender == 'M' ? 'MALE' : 'FEMALE',
        landmark: null,
        street: fullResponse.street ?? '',
        locality: '',
        district: '',
        vtc: '',
        building: fullResponse?.houseNumber ?? '',
        districtName: fullResponse.district ?? '',
        vtcName: fullResponse.vtc ?? '',
        stateName: fullResponse.state ?? '',
        poName: fullResponse.postOffice ?? '',
        careof: '',
        poNameLocal: '',
        localVtc: '',
        localState: '',
        localDistrict: '',
        pincode: fullResponse.pincode ?? '',
        uid: aadhaarNumber,
        localStreet: '',
        localLocality: '',
        localLandmark: null,
        refId: null,
        langCode: '',
        relationInfo: null,
        biometricFlag: false,
        dobStatus: '',
        enrolmentDate: '',
        enrolmentNumber: '',
        enrolmentType: '',
        exceptionPhoto: null,
        isCurrent: false,
        isNRI: 'false',
        isdCode: '+91',
        poType: null,
        poa: null,
        poi: null,
        residentPhoto: fullResponse.photo,
        subDistrict: '',
        subDistrictLocalName: '',
        subDistrictName: '',
        updatedEIds: [],
        updatedEIdsCount: 0,
        updatedRefIds: [],
        updatedRefIdsCount: 0,
        name: fullResponse.residentName ?? '',
        aadhaar_service: 'DIGILOCKER_IN_HOUSE',
      },
    };
    // check if we got aadhaar details
    if (aadhaarResponse.responseData.localResName === '') {
      return k422ErrorMessage('Aadhaar details not found from digilocker');
    }
    const callbackList = [
      {
        url: HOST_URL + `${Latest_Version}/kyc/validatemAadhaar`,
        method: 'POST',
        body: {
          aadhaarNumber,
          userId,
          aadhaarResponse,
        },
      },
    ];
    return { callbackList };
  }
}
