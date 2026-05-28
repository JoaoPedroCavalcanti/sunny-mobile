import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppCard } from '../components/AppCard';
import { AppScreen } from '../components/AppScreen';
import { SectionHeader } from '../components/SectionHeader';
import { listNews } from '../api/news';
import { listCondoPayments } from '../api/payments';
import { listVisitors } from '../api/visitors';
import { listServiceRequests } from '../api/serviceRequests';
import { formatDateTime } from '../utils/date';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type HomeNav = NativeStackNavigationProp<RootStackParamList>;

type Dashboard = {
  latestNewsTitle: string;
  nextVisitor?: string;
  nextVisitorTime?: string;
  openRequests: number;
  pendingPayments: number;
};

export function HomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard>({
    latestNewsTitle: 'Carregando...',
    openRequests: 0,
    pendingPayments: 0
  });

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [news, visitors, requests, payments] = await Promise.all([
        listNews(),
        listVisitors(),
        listServiceRequests(),
        listCondoPayments()
      ]);

      const firstVisitor = [...visitors]
        .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
        .find((v) => v.status !== 'Checked-out');

      setDashboard({
        latestNewsTitle: news[0]?.title || 'Nenhum comunicado recente',
        nextVisitor: firstVisitor?.visitor_name,
        nextVisitorTime: firstVisitor?.scheduled_date,
        openRequests: requests.filter((r) => r.status === 'requested').length,
        pendingPayments: payments.filter((p) => p.status === 'pending').length
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const quickActions = useMemo(
    () => [
      {
        label: 'Visitantes',
        icon: 'people-outline' as const,
        onPress: () => navigation.navigate('Visitors')
      },
      {
        label: 'Solicitacoes',
        icon: 'build-outline' as const,
        onPress: () => navigation.navigate('ServiceRequests')
      },
      {
        label: 'Check-in Link',
        icon: 'qr-code-outline' as const,
        onPress: () => navigation.navigate('VisitorCheckin')
      }
    ],
    [navigation]
  );

  return (
    <AppScreen onRefresh={loadData} refreshing={refreshing}>
      <SectionHeader title="Ola" subtitle="Tudo do condominio na palma da sua mao." />

      <AppCard>
        <Text style={styles.cardLabel}>Comunicado recente</Text>
        <Text style={styles.cardTitle}>{dashboard.latestNewsTitle}</Text>
      </AppCard>

      <View style={styles.grid}>
        <AppCard>
          <Text style={styles.metricLabel}>Solicitacoes abertas</Text>
          <Text style={styles.metricValue}>{dashboard.openRequests}</Text>
        </AppCard>
        <AppCard>
          <Text style={styles.metricLabel}>Pagamentos pendentes</Text>
          <Text style={styles.metricValue}>{dashboard.pendingPayments}</Text>
        </AppCard>
      </View>

      <AppCard>
        <Text style={styles.cardLabel}>Proximo visitante</Text>
        <Text style={styles.cardTitle}>{dashboard.nextVisitor || 'Sem visitas agendadas'}</Text>
        {dashboard.nextVisitorTime ? (
          <Text style={styles.helper}>{formatDateTime(dashboard.nextVisitorTime)}</Text>
        ) : null}
      </AppCard>

      <View style={styles.quickWrap}>
        {quickActions.map((item) => (
          <Pressable key={item.label} style={styles.quickItem} onPress={item.onPress}>
            <Ionicons name={item.icon} size={18} color={colors.primary} />
            <Text style={styles.quickText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  cardLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600'
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6
  },
  helper: {
    color: colors.textMuted,
    marginTop: 6,
    fontSize: 13
  },
  grid: {
    flexDirection: 'row',
    gap: 10
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 12
  },
  metricValue: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 6
  },
  quickWrap: {
    flexDirection: 'row',
    gap: 10
  },
  quickItem: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4
  },
  quickText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600'
  }
});
