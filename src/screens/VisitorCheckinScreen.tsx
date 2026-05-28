import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { SectionHeader } from '../components/SectionHeader';
import { AppCard } from '../components/AppCard';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { runVisitorCheckin, runVisitorCheckout } from '../api/visitors';
import { colors } from '../theme/colors';
import { extractErrorMessage } from '../utils/extractError';

function extractToken(value: string) {
  if (!value) return '';
  const normalized = value.trim();
  const parts = normalized.split('/').filter(Boolean);
  return parts[parts.length - 1] || normalized;
}

export function VisitorCheckinScreen() {
  const [rawToken, setRawToken] = useState('');
  const [loadingCheckin, setLoadingCheckin] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  async function doCheckin() {
    try {
      setLoadingCheckin(true);
      const token = extractToken(rawToken);
      const data = await runVisitorCheckin(token);
      Alert.alert('Check-in realizado', `Codigo: ${data.checkin_code}`);
    } catch (error) {
      Alert.alert('Falha no check-in', extractErrorMessage(error));
    } finally {
      setLoadingCheckin(false);
    }
  }

  async function doCheckout() {
    try {
      setLoadingCheckout(true);
      const token = extractToken(rawToken);
      const data = await runVisitorCheckout(token);
      Alert.alert('Check-out realizado', `Codigo: ${data.checkout_code}`);
    } catch (error) {
      Alert.alert('Falha no check-out', extractErrorMessage(error));
    } finally {
      setLoadingCheckout(false);
    }
  }

  return (
    <AppScreen>
      <SectionHeader title="Check-in e Check-out" subtitle="Cole o token ou link recebido por e-mail" />
      <AppCard>
        <AppInput label="Token ou URL" value={rawToken} onChangeText={setRawToken} autoCapitalize="none" />
        <Text style={styles.helper}>Use o mesmo campo para check-in ou check-out.</Text>
        <AppButton title="Gerar check-in" onPress={doCheckin} loading={loadingCheckin} />
        <AppButton title="Gerar check-out" onPress={doCheckout} loading={loadingCheckout} variant="ghost" />
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  helper: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 6
  }
});
