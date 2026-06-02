import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { HomeScreen } from '../screens/HomeScreen';
import { ReservationsStack } from './ReservationsStack';
import { CasaStack } from './CasaStack';
import { VisitorScreen } from '../screens/VisitorScreen';
import { ProfileStack } from './ProfileStack';
import { usePermissions } from '../hooks/usePermissions';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const inactiveIconMap: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  Reservas: 'calendar-outline',
  Casa: 'business-outline',
  Visitantes: 'people-outline',
  Perfil: 'person-outline'
};

const activeIconMap: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Reservas: 'calendar',
  Casa: 'business',
  Visitantes: 'people',
  Perfil: 'person'
};

const tabLabels: Record<keyof MainTabParamList, string> = {
  Home: 'Inicio',
  Reservas: 'Reservas',
  Casa: 'Minha unidade',
  Visitantes: 'Visitantes',
  Perfil: 'Perfil'
};

export function MainTabs() {
  const { isEmployee } = usePermissions();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#9FA7A3',
        tabBarStyle: {
          height: 88,
          paddingTop: 8,
          paddingBottom: 14,
          borderTopWidth: 0,
          backgroundColor: '#FFFFFF',
          shadowColor: '#122016',
          shadowOpacity: 0.08,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: -8 },
          elevation: 12
        },
        tabBarLabel: ({ focused, color }) => (
          <Text
            numberOfLines={1}
            style={[styles.tabLabel, focused && styles.tabLabelActive, { color }]}
          >
            {tabLabels[route.name]}
          </Text>
        ),
        tabBarIcon: ({ color, focused }) => {
          const iconName = focused
            ? activeIconMap[route.name]
            : inactiveIconMap[route.name];
          return <Ionicons name={iconName} size={26} color={color} />;
        }
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Reservas" component={ReservationsStack} />
      {!isEmployee ? (
        <Tab.Screen name="Casa" component={CasaStack} />
      ) : null}
      <Tab.Screen name="Visitantes" component={VisitorScreen} />
      <Tab.Screen name="Perfil" component={ProfileStack} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2
  },
  tabLabelActive: {
    fontWeight: '700'
  }
});
