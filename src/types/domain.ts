export type Priority = 'low' | 'medium' | 'high';

export type ServiceRequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type ServiceRequestStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'COMPLETED';

export type ServiceType =
  | 'CLEANING'
  | 'MAINTENANCE'
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'SECURITY'
  | 'LANDSCAPING'
  | 'PEST_CONTROL'
  | 'OTHER';

export type CondoPaymentStatus = 'pending' | 'paid' | 'overdue';

export type DeliveryPlatform =
  | 'ifood'
  | 'rappi'
  | 'uber eats'
  | 'doordash'
  | 'just eat'
  | 'other';

export type UserRole = 'ADMIN' | 'RESIDENT' | 'EMPLOYEE';

export type User = {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
  full_name?: string;
  birth_date?: string;
  cpf?: string;
  phone?: string;
  apartment?: string;
  block?: string;
  photo?: string;
  is_active?: boolean;
  role: UserRole;
};

export type ReservationUserSummary = {
  id: number;
  username: string;
  full_name?: string | null;
};

export type ReservationHouseholdSummary = {
  id: number;
  apartment: string;
  block: string | null;
};

export type ReservationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type Reservation = {
  id: number;
  reservation_date: string;
  start_time?: string | null;
  end_time?: string | null;
  guest_count?: number | null;
  status: ReservationStatus;
  household: ReservationHouseholdSummary | null;
  reservation_user: ReservationUserSummary | null;
  created_at: string;
};

export type Dependent = {
  id: number;
  household: number;
  full_name: string;
  birth_date: string;
  cpf?: string | null;
  relationship?: string | null;
  is_active?: boolean;
  created_at: string;
};

export type VisitorAccess = {
  id: number;
  visitor_name: string;
  host_user: number | null;
  email: string | null;
  scheduled_date: string;
  checkin_date_time: string | null;
  checkout_date_time: string | null;
  checkin_code: string;
  checkout_code: string;
  status: string;
  description: string | null;
  link_checkin: string | null;
  link_checkout: string | null;
  created_at: string;
  updated_at: string;
};

export type ServiceRequestParty = {
  id?: number | null;
  username?: string | null;
  full_name?: string | null;
  email?: string | null;
  apartment?: string | null;
  block?: string | null;
  [key: string]: unknown;
};

export type ServiceRequest = {
  id: number;
  title: string;
  description: string;
  service_type: ServiceType;
  location: string;
  priority: ServiceRequestPriority;
  status: ServiceRequestStatus;
  request_scheduled_date: string | null;
  admin_response: string;
  responded_by: ServiceRequestParty | null;
  responded_at: string | null;
  requester: ServiceRequestParty | null;
  created_at: string;
  updated_at: string;
};

export type CondoPayment = {
  id: number;
  payer_user: number;
  title: string;
  status: CondoPaymentStatus;
  description: string | null;
  payment_link: string;
  amount: string;
  due_date: string | null;
  payment_date: string | null;
  created_at: string;
  updated_at: string;
};

export type DeliveryNotification = {
  id: number;
  user_to_delivery: number;
  title: string | null;
  description: string | null;
  delivery_platform: DeliveryPlatform;
  delivery_from: string | null;
  delivery_to: string | null;
  created_at: string;
  priority_level: Priority;
};

export type NewsKind = 'NOTICE' | 'MAINTENANCE' | 'EVENT';

export type NewsAuthor = {
  id: number | null;
  full_name: string;
  role: string;
};

export type News = {
  id: number;
  title: string;
  description: string;
  kind: NewsKind;
  priority_level: Priority;
  created_by: NewsAuthor;
  created_at: string;
  updated_at: string;
};

export type HouseholdStatus = 'PENDING_ADMIN' | 'ACTIVE' | 'ARCHIVED';

export type HouseholdMembershipStatus =
  | 'PENDING_HOLDER'
  | 'PENDING_ADMIN'
  | 'ACTIVE'
  | 'LEFT';

export type HouseholdMembershipRole = 'HOLDER' | 'RESIDENT';

export type HouseholdMemberUser = {
  id: number;
  username: string;
  full_name: string | null;
  email: string | null;
  cpf: string | null;
  phone: string | null;
};

export type HouseholdMembership = {
  id: number;
  household: number;
  user: HouseholdMemberUser;
  role: HouseholdMembershipRole;
  status: HouseholdMembershipStatus;
  joined_at: string;
  left_at: string | null;
};

export type Household = {
  id: number;
  apartment: string;
  block: string | null;
  status: HouseholdStatus;
  created_at: string;
  members?: HouseholdMembership[];
};

export type PendingApproval = {
  id: number;
  household: Household;
  user: HouseholdMemberUser;
  role: HouseholdMembershipRole;
  status: Extract<HouseholdMembershipStatus, 'PENDING_HOLDER' | 'PENDING_ADMIN'>;
  joined_at: string;
};

export type DecisionAction = 'APPROVED' | 'REJECTED';

export type DecisionParty = {
  id?: number | null;
  username?: string | null;
  full_name?: string | null;
  email?: string | null;
  [key: string]: unknown;
};

export type MembershipDecision = {
  id: number;
  household: number | null;
  household_apartment: string;
  household_block: string;
  actor: DecisionParty;
  target: DecisionParty;
  action: DecisionAction;
  reason: string;
  created_at: string;
};

export type AdminDashboardOverview = {
  active_residents: number;
  total_reservations: number;
  pending_reservations: number;
  published_news: number;
};
