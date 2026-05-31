import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { HomeScreen } from '../screens/HomeScreen';
import { ReservationsStack } from './ReservationsStack';
import { NewsScreen } from '../screens/NewsScreen';
import { VisitorScreen } from '../screens/VisitorScreen';
import { ProfileStack } from './ProfileStack';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const inactiveIconMap: Record<Exclude<keyof MainTabParamList, 'Comunicados'>, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  Reservas: 'calendar-outline',
  Visitantes: 'people-outline',
  Perfil: 'person-outline'
};

const activeIconMap: Record<Exclude<keyof MainTabParamList, 'Comunicados'>, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Reservas: 'calendar',
  Visitantes: 'people',
  Perfil: 'person'
};

export function MainTabs() {
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
        tabBarItemStyle: route.name === 'Comunicados' ? styles.centerTabItem : undefined,
        tabBarLabel:
          route.name === 'Comunicados'
            ? () => null
            : ({ focused, color }) => (
                <Text
                  numberOfLines={1}
                  style={[styles.tabLabel, focused && styles.tabLabelActive, { color }]}
                >
                  {route.name === 'Home' ? 'Inicio' : route.name}
                </Text>
              ),
        tabBarIcon: ({ color, focused }) => {
          if (route.name === 'Comunicados') {
            return (
              <View style={styles.centerAction}>
                <Ionicons name="megaphone" size={30} color="#FFFFFF" />
              </View>
            );
          }

          const iconName = focused
            ? activeIconMap[route.name]
            : inactiveIconMap[route.name];
          return <Ionicons name={iconName} size={26} color={color} />;
        }
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Reservas" component={ReservationsStack} />
      <Tab.Screen name="Comunicados" component={NewsScreen} />
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
  },
  centerTabItem: {
    marginTop: -18
  },
  centerAction: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D2518',
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8
  }
});
