import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SignupPending'>;
type RouteProps = RouteProp<RootStackParamList, 'SignupPending'>;

export function SignupPendingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const insets = useSafeAreaInsets();
  const username = route.params?.username;
  const email = route.params?.email;

  function goToLogin() {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
      <View style={styles.content}>
        <LinearGradient
          colors={['#E5F2EA', '#D4EADD']}
          style={styles.iconWrap}
        >
          <Ionicons name="hourglass-outline" size={44} color={colors.primaryDark} />
        </LinearGradient>

        <Text style={styles.title}>Aguardando aprovacao</Text>
        <Text style={styles.subtitle}>
          Sua solicitacao foi enviada. Um titular do apartamento ou o administrador
          do condominio precisa aprovar seu cadastro antes que voce consiga acessar
          o app.
        </Text>

        <View style={styles.card}>
          <Row icon="person-circle-outline" label="Usuario" value={username ?? '—'} />
          {email ? <Row icon="mail-outline" label="E-mail" value={email} /> : null}
          <Row
            icon="time-outline"
            label="Status"
            value="Pendente de aprovacao"
            valueColor={colors.warning}
          />
        </View>

        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primaryDark} />
          <Text style={styles.noticeText}>
            Voce sera notificado(a) por e-mail assim que seu acesso for liberado.
          </Text>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Pressable
          onPress={goToLogin}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed
          ]}
        >
          <Text style={styles.primaryButtonText}>Voltar para o login</Text>
        </Pressable>
      </View>
    </View>
  );
}

type RowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
};

function Row({ icon, label, value, valueColor }: RowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    justifyContent: 'space-between'
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center'
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 8
  },
  card: {
    width: '100%',
    backgroundColor: '#F8FBF9',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E4EFE7'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DCEBDF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  rowCopy: {
    flex: 1,
    gap: 2
  },
  rowLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600'
  },
  rowValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  },
  notice: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: '#EFF6F1',
    borderRadius: 12,
    padding: 12,
    marginTop: 4
  },
  noticeText: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: 12,
    lineHeight: 17
  },
  footer: {
    paddingTop: 8
  },
  primaryButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryButtonPressed: {
    opacity: 0.9
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  }
});
