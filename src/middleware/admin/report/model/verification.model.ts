export class VerificationModel {
  adminName: string;
  adminEmail: string;
  selfie: VerificationCountModel = new VerificationCountModel();
  residence: VerificationCountModel = new VerificationCountModel();
  optionalDoc: VerificationCountModel = new VerificationCountModel();
  panDoc: VerificationCountModel = new VerificationCountModel();
  contact: VerificationCountModel = new VerificationCountModel();
  company: VerificationCountModel = new VerificationCountModel();
  salarySlip: VerificationCountModel = new VerificationCountModel();
  workMail: VerificationCountModel = new VerificationCountModel();
  manualVeri: VerificationCountModel = new VerificationCountModel();
  acceptSalary: VerificationCountModel = new VerificationCountModel();
  docUpload: VerificationCountModel = new VerificationCountModel();
}

export class VerificationCountModel {
  acceptedCount: number = 0;
  rejectedCount: number = 0;
  userList: UserVeriModel[] = [];
  loanList: any = [];
  userIdArr: any = [];
}

export class UserVeriModel {
  isAccepted: boolean = false;
  id: string;
  empId: number;
  loanId: number;
  fullName: string;
  email: string;
  phone: string;
}

export class VerificationCountFunModel {
  approved: number = 0;
  reject: number = 0;
  pending: number = 0;
  approvedNew: number = 0;
  rejectNew: number = 0;
  pendingNew: number = 0; 
  userList: any = [];
}

