export type User = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
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
  email: string;
  scheduled_date: string;
  checkin_date_time: string | null;
  checkout_date_time: string | null;
  checkin_code: string;
  checkout_code: string;
  status: string;
  description: string;
  link_checkin: string | null;
  link_checkout: string | null;
  created_at: string;
  updated_at: string;
};

export type ServiceRequest = {
  id: number;
  requester_user: number;
  title: string;
  request_description: string;
  service_type: string;
  location: string;
  priority: 'low' | 'medium' | 'high';
  request_scheduled_date: string;
  created_at: string;
  updated_at: string;
  status: 'requested' | 'accepted' | 'declined';
  responsable_staff: string;
  scheduled_date: string | null;
  more_details: string;
};

export type CondoPayment = {
  id: number;
  payer_user: number;
  title: string;
  status: 'pending' | 'paid' | 'overdue';
  description: string;
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
  title: string;
  description: string;
  delivery_platform: string;
  delivery_from: string;
  delivery_to: string;
  created_at: string;
  priority_level: 'low' | 'medium' | 'high';
};

export type News = {
  id: number;
  title: string;
  description: string;
  author: string;
  priority_level: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
};
