// Imports
import { UUID } from 'crypto';

export interface ICreateNewAAJourney {
  aaMode: '0' | '1' | '2';
  accNumber: string;
  bankCode: string;
  fipName: string;
  ifsc: string;
  loanId: number;
  phone: string;
  referralFlow: boolean;
  userId: UUID;
  pan: string;
}
