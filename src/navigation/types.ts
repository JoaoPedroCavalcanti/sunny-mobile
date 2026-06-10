import type { NavigatorScreenParams } from '@react-navigation/native';
import type { HouseholdMembership, UserRole } from '../types/domain';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  SignupPending: { username: string; email?: string } | undefined;
  MainTabs: undefined;
  VisitorCheckin: undefined;
  ServiceRequests: undefined;
  NewServiceRequest: undefined;
  ServiceRequestDetails: { requestId: number };
  News: undefined;
  ReservationApprovals: undefined;
  Users: { initialRole?: UserRole | 'all' } | undefined;
  UserDetails: { userId: number };
};

export type ReservationsStackParamList = {
  ReservationsList: undefined;
  NewReservation:
    | { space?: 'bbq' | 'hall'; openUserPicker?: boolean }
    | undefined;
};

export type ProfileStackParamList = {
  ProfileMenu: undefined;
  MyData: undefined;
};

export type CasaStackParamList = {
  CasaMenu: undefined;
  Members: undefined;
  MemberDetails: { membership: HouseholdMembership };
  PendingApprovals: undefined;
  RegisterMemberHelp: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Reservas: NavigatorScreenParams<ReservationsStackParamList> | undefined;
  Casa: NavigatorScreenParams<CasaStackParamList> | undefined;
  Visitantes: undefined;
  Perfil: NavigatorScreenParams<ProfileStackParamList> | undefined;
};
