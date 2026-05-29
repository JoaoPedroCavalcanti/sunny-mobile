export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  VisitorCheckin: undefined;
  ServiceRequests: undefined;
  NewReservation: { space?: 'bbq' | 'hall' } | undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Reservas: undefined;
  Comunicados: undefined;
  Visitantes: undefined;
  Perfil: undefined;
};
