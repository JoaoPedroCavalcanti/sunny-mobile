import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { HomeScreen } from '../screens/HomeScreen';
import { ReservationsScreen } from '../screens/ReservationsScreen';
import { NewsScreen } from '../screens/NewsScreen';
import { FinanceScreen } from '../screens/FinanceScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const iconMap: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  Reservas: 'calendar-outline',
  Comunicados: 'megaphone-outline',
  Financeiro: 'wallet-outline',
  Perfil: 'person-outline'
};

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#9FA7A3',
        tabBarStyle: {
          height: 64,
          paddingTop: 6,
          borderTopColor: colors.border,
          backgroundColor: '#FFFFFF'
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600'
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={iconMap[route.name]} size={size} color={color} />
        )
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Reservas" component={ReservationsScreen} />
      <Tab.Screen name="Comunicados" component={NewsScreen} />
      <Tab.Screen name="Financeiro" component={FinanceScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
