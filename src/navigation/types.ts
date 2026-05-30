import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  VisitorCheckin: undefined;
  ServiceRequests: undefined;
};

export type ReservationsStackParamList = {
  ReservationsList: undefined;
  NewReservation: { space?: 'bbq' | 'hall' } | undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Reservas: NavigatorScreenParams<ReservationsStackParamList> | undefined;
  Comunicados: undefined;
  Visitantes: undefined;
  Perfil: undefined;
};
