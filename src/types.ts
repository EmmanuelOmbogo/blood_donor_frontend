export type BloodGroup =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-";

export type UserRole = "admin" | "hospital_staff" | "drive_staff";
export type RequestStatus = "open" | "notified" | "partially_fulfilled" | "fulfilled" | "cancelled";
export type DonorResponse = "pending" | "yes" | "no" | "opted_out" | "failed";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization: string;
  demoMode?: boolean;
}

export interface Donor {
  id: string;
  fullName: string;
  phoneNumber: string;
  nationalId: string;
  location: string;
  bloodGroup: BloodGroup;
  lastDonationDate: string | null;
  eligible: boolean;
  consentToSms: boolean;
  optedOut: boolean;
  screeningStatus: "clear";
  createdAt: string;
}

export interface MatchedDonor {
  donorId: string;
  fullName: string;
  phoneNumberMasked: string;
  location: string;
  bloodGroup: BloodGroup;
  response: DonorResponse;
  smsStatus: "queued" | "sent" | "delivered" | "failed" | "not_sent";
  respondedAt: string | null;
}

export interface BloodRequest {
  id: string;
  reference: string;
  hospitalName: string;
  contactName: string;
  contactPhone: string;
  bloodGroup: BloodGroup;
  unitsNeeded: number;
  unitsFulfilled: number;
  area: string;
  urgency: "routine" | "urgent" | "critical";
  neededBy: string;
  notes: string;
  status: RequestStatus;
  matchedDonors: MatchedDonor[];
  smsDispatchedAt: string | null;
  createdAt: string;
}

export interface DonationDrive {
  id: string;
  name: string;
  venue: string;
  area: string;
  startsAt: string;
  endsAt: string;
  status: "scheduled" | "active" | "completed" | "cancelled";
  registeredDonors: number;
}

export interface DashboardSummary {
  registeredDonors: number;
  eligibleDonors: number;
  activeRequests: number;
  livesSupported: number;
  donorsByBloodGroup: Partial<Record<BloodGroup, number>>;
  recentRequests: BloodRequest[];
}

export interface ApiError {
  message: string;
  code?: string;
  fieldErrors?: Record<string, string>;
}

export interface PageResult<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}
