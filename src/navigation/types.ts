import type { NavigatorScreenParams } from '@react-navigation/native';
import type { HouseholdMembership } from '../types/domain';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  SignupPending: { username: string; email?: string } | undefined;
  MainTabs: undefined;
  VisitorCheckin: undefined;
  ServiceRequests: undefined;
  News: undefined;
  ReservationApprovals: undefined;
};

export type ReservationsStackParamList = {
  ReservationsList: undefined;
  NewReservation: { space?: 'bbq' | 'hall' } | undefined;
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
};

export type MainTabParamList = {
  Home: undefined;
  Reservas: NavigatorScreenParams<ReservationsStackParamList> | undefined;
  Casa: NavigatorScreenParams<CasaStackParamList> | undefined;
  Visitantes: undefined;
  Perfil: NavigatorScreenParams<ProfileStackParamList> | undefined;
};
