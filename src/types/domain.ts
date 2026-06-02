export type Priority = 'low' | 'medium' | 'high';

export type ServiceRequestStatus = 'requested' | 'accepted' | 'declined';

export type CondoPaymentStatus = 'pending' | 'paid' | 'overdue';

export type DeliveryPlatform =
  | 'ifood'
  | 'rappi'
  | 'uber eats'
  | 'doordash'
  | 'just eat'
  | 'other';

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
};

export type Reservation = {
  id: number;
  reservation_user: number | null;
  reservation_date: string;
  guest_count?: number | null;
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

export type ServiceRequest = {
  id: number;
  requester_user: number;
  title: string;
  request_description: string | null;
  service_type: string;
  location: string | null;
  priority: Priority;
  request_scheduled_date: string;
  created_at: string;
  updated_at: string;
  status: ServiceRequestStatus;
  responsable_staff: string | null;
  scheduled_date: string | null;
  more_details: string | null;
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

export type News = {
  id: number;
  title: string;
  description: string;
  author: string;
  priority_level: Priority;
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

export type Household = {
  id: number;
  apartment: string;
  block: string | null;
  status: HouseholdStatus;
  created_at: string;
};

export type HouseholdMembership = {
  id: number;
  household: number;
  user: number;
  role: HouseholdMembershipRole;
  status: HouseholdMembershipStatus;
  created_at: string;
  updated_at: string;
};
