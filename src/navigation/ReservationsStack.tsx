import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ReservationsScreen } from '../screens/ReservationsScreen';
import { NewReservationScreen } from '../screens/NewReservationScreen';
import type { ReservationsStackParamList } from './types';

const Stack = createNativeStackNavigator<ReservationsStackParamList>();

export function ReservationsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReservationsList" component={ReservationsScreen} />
      <Stack.Screen name="NewReservation" component={NewReservationScreen} />
    </Stack.Navigator>
  );
}
