import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { ServiceRequestsScreen } from '../screens/ServiceRequestsScreen';
import { VisitorCheckinScreen } from '../screens/VisitorCheckinScreen';
import type { RootStackParamList } from './types';
import { useAuthStore } from '../store/authStore';
import { verifyToken } from '../api/auth';
import { getMe } from '../api/users';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { accessToken, logout, setUser } = useAuthStore();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      if (!accessToken) {
        setBooting(false);
        return;
      }
      try {
        await verifyToken(accessToken);
        const me = await getMe();
        setUser(me);
      } catch {
        logout();
      } finally {
        setBooting(false);
      }
    }

    bootstrap();
  }, [accessToken, logout, setUser]);

  if (booting) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bg
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {accessToken ? (
        <>
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="VisitorCheckin"
            component={VisitorCheckinScreen}
            options={{ title: 'Check-in / Check-out' }}
          />
          <Stack.Screen
            name="ServiceRequests"
            component={ServiceRequestsScreen}
            options={{ title: 'Solicitacoes' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Signup"
            component={SignupScreen}
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
