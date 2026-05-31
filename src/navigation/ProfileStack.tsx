import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../screens/ProfileScreen';
import { MyDataScreen } from '../screens/MyDataScreen';
import type { ProfileStackParamList } from './types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMenu" component={ProfileScreen} />
      <Stack.Screen name="MyData" component={MyDataScreen} />
    </Stack.Navigator>
  );
}
