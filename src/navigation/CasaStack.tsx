import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MinhaCasaScreen } from '../screens/MinhaCasaScreen';
import { HouseholdMembersScreen } from '../screens/HouseholdMembersScreen';
import { MemberDetailsScreen } from '../screens/MemberDetailsScreen';
import { PendingApprovalsScreen } from '../screens/PendingApprovalsScreen';
import type { CasaStackParamList } from './types';

const Stack = createNativeStackNavigator<CasaStackParamList>();

export function CasaStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CasaMenu" component={MinhaCasaScreen} />
      <Stack.Screen name="Members" component={HouseholdMembersScreen} />
      <Stack.Screen name="MemberDetails" component={MemberDetailsScreen} />
      <Stack.Screen name="PendingApprovals" component={PendingApprovalsScreen} />
    </Stack.Navigator>
  );
}
