import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  CompositeNavigationProp,
  useFocusEffect,
  useNavigation
} from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen } from '../components/AppScreen';
import { colors } from '../theme/colors';
import { useAuthStore } from '../store/authStore';
import { getAdminDashboardOverview } from '../api/adminDashboard';
import { listBbqReservations, listHallReservations } from '../api/reservations';
import { listServiceRequests } from '../api/serviceRequests';
import { listPendingApprovals } from '../api/households';
import { parseDateInput, toApiDate } from '../utils/date';
import type {
  MainTabParamList,
  RootStackParamList
} from '../navigation/types';
import type { Reservation } from '../types/domain';

type AdminHomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type StatTone = 'green' | 'amber' | 'blue' | 'purple';

type StatCard = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: StatTone;
  value: string;
  label: string;
  sublabel: string;
  onPress: () => void;
};

type QuickAction = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  badge?: number;
  onPress: () => void;
};

type ReservationsSpaceSummary = {
  key: 'bbq' | 'hall';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'green' | 'amber';
  pending: number;
  approvedToday: number;
};

const TONE_STYLES: Record<StatTone, { bg: string; fg: string; valueColor: string }> = {
  green: { bg: '#EAF5EF', fg: '#0F7A43', valueColor: '#0F7A43' },
  amber: { bg: '#FFF1D6', fg: '#B07A1A', valueColor: '#B07A1A' },
  blue: { bg: '#E5EEF9', fg: '#2E5FA8', valueColor: '#2E5FA8' },
  purple: { bg: '#EFE7FB', fg: '#6E3FD0', valueColor: '#6E3FD0' }
};

function isToday(dateStr: string): boolean {
  const d = parseDateInput(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const today = toApiDate(new Date());
  return toApiDate(d) === today;
}

export function AdminHomeScreen() {
  const navigation = useNavigation<AdminHomeNav>();
  const user = useAuthStore((s) => s.user);

  const [refreshing, setRefreshing] = useState(false);
  const [residentsActive, setResidentsActive] = useState(0);
  const [totalReservations, setTotalReservations] = useState(0);
  const [pendingReservations, setPendingReservations] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [newsTotal, setNewsTotal] = useState(0);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [bbqSummary, setBbqSummary] = useState<ReservationsSpaceSummary>({
    key: 'bbq',
    label: 'Churrasqueira',
    icon: 'flame-outline',
    tone: 'green',
    pending: 0,
    approvedToday: 0
  });
  const [hallSummary, setHallSummary] = useState<ReservationsSpaceSummary>({
    key: 'hall',
    label: 'Salao de festas',
    icon: 'business-outline',
    tone: 'amber',
    pending: 0,
    approvedToday: 0
  });

  const totalReservationApprovals =
    pendingReservations || bbqSummary.pending + hallSummary.pending;

  const loadDashboard = useCallback(async () => {
    setRefreshing(true);
    try {
      const [overview, bbq, hall, requests, invites] = await Promise.all([
        getAdminDashboardOverview().catch(() => null),
        listBbqReservations().catch(() => [] as Reservation[]),
        listHallReservations().catch(() => [] as Reservation[]),
        listServiceRequests().catch(() => []),
        listPendingApprovals().catch(() => [])
      ]);

      if (overview) {
        setResidentsActive(overview.active_residents);
        setTotalReservations(overview.total_reservations);
        setPendingReservations(overview.pending_reservations);
        setNewsTotal(overview.published_news);
      }

      setPendingRequests(requests.filter((r) => r.status === 'PENDING').length);
      setPendingInvites(invites.length);

      const bbqToday = bbq.filter((r) => isToday(r.reservation_date));
      const hallToday = hall.filter((r) => isToday(r.reservation_date));

      setBbqSummary((prev) => ({
        ...prev,
        pending: bbq.filter((r) => r.status === 'PENDING').length,
        approvedToday: bbqToday.filter((r) => r.status === 'APPROVED').length
      }));
      setHallSummary((prev) => ({
        ...prev,
        pending: hall.filter((r) => r.status === 'PENDING').length,
        approvedToday: hallToday.filter((r) => r.status === 'APPROVED').length
      }));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const firstName =
    user?.first_name?.trim() ||
    user?.full_name?.trim().split(' ')[0] ||
    user?.username ||
    'Admin';

  const goToReservasTab = () => navigation.navigate('Reservas');
  const goToVisitantesTab = () => navigation.navigate('Visitantes');
  const goToCasaPending = () =>
    navigation.navigate('Casa', { screen: 'PendingApprovals' });
  const goToReservationApprovals = () => navigation.navigate('ReservationApprovals');
  const goToServiceRequests = () => navigation.navigate('ServiceRequests');
  const goToNews = () => navigation.navigate('News');
  const goToResidents = () =>
    navigation.navigate('Users', { initialRole: 'RESIDENT' });

  function notYet() {
    Alert.alert('Em breve', 'Esta funcionalidade ainda nao esta disponivel.');
  }

  const stats: StatCard[] = [
    {
      key: 'residents',
      icon: 'people-outline',
      tone: 'green',
      value: String(residentsActive),
      label: 'Moradores',
      sublabel: 'Ativos',
      onPress: goToResidents
    },
    {
      key: 'reservations',
      icon: 'calendar-outline',
      tone: 'amber',
      value: String(totalReservations),
      label: 'Reservas',
      sublabel: 'Total',
      onPress: goToReservasTab
    },
    {
      key: 'requests',
      icon: 'clipboard-outline',
      tone: 'blue',
      value: String(pendingRequests),
      label: 'Solicitacoes',
      sublabel: 'Pendentes',
      onPress: goToServiceRequests
    },
    {
      key: 'news',
      icon: 'megaphone-outline',
      tone: 'purple',
      value: String(newsTotal),
      label: 'Comunicados',
      sublabel: 'Publicados',
      onPress: goToNews
    }
  ];

  const quickActions: QuickAction[] = [
    {
      key: 'moradores',
      icon: 'people-outline',
      title: 'Moradores',
      description: 'Gerencie moradores e permissoes',
      onPress: goToResidents
    },
    {
      key: 'convites',
      icon: 'mail-outline',
      title: 'Convites pendentes',
      description: 'Aprove ou recuse novos membros',
      badge: pendingInvites,
      onPress: goToCasaPending
    },
    {
      key: 'aprovacoes',
      icon: 'calendar-outline',
      title: 'Aprovacoes de reservas',
      description: 'Churrasqueira, salao e areas comuns',
      badge: totalReservationApprovals,
      onPress: goToReservationApprovals
    },
    {
      key: 'comunicados',
      icon: 'megaphone-outline',
      title: 'Comunicados',
      description: 'Crie e gerencie comunicados',
      onPress: goToNews
    },
    {
      key: 'reservas',
      icon: 'calendar-clear-outline',
      title: 'Reservas',
      description: 'Gerencie todas as reservas',
      onPress: goToReservasTab
    },
    {
      key: 'visitantes',
      icon: 'people-circle-outline',
      title: 'Visitantes',
      description: 'Autorize acessos e convites',
      onPress: goToVisitantesTab
    },
    {
      key: 'financeiro',
      icon: 'cash-outline',
      title: 'Financeiro',
      description: 'Acompanhe receitas, despesas e taxas',
      onPress: notYet
    },
    {
      key: 'relatorios',
      icon: 'bar-chart-outline',
      title: 'Relatorios',
      description: 'Visualize relatorios e indicadores',
      onPress: notYet
    },
    {
      key: 'configuracoes',
      icon: 'settings-outline',
      title: 'Configuracoes',
      description: 'Gerencie o condominio e preferencias',
      onPress: notYet
    }
  ];

  return (
    <AppScreen onRefresh={loadDashboard} refreshing={refreshing}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting} numberOfLines={1}>
            Ola, {firstName}{' '}
            <Text style={styles.greetingRole}>- Administrador</Text>
          </Text>
          <Text style={styles.subtitle}>Bem-vindo ao painel administrativo</Text>
        </View>
        <Pressable style={styles.bellButton} hitSlop={6}>
          <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
          <View style={styles.bellDot} />
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Visao geral</Text>
      <View style={styles.statsRow}>
        {stats.map((s) => {
          const tone = TONE_STYLES[s.tone];
          return (
            <Pressable
              key={s.key}
              style={({ pressed }) => [styles.statCard, pressed && styles.statCardPressed]}
              onPress={s.onPress}
            >
              <View style={[styles.statIcon, { backgroundColor: tone.bg }]}>
                <Ionicons name={s.icon} size={18} color={tone.fg} />
              </View>
              <Text style={[styles.statValue, { color: tone.valueColor }]}>
                {s.value}
              </Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                {s.label}
              </Text>
              <View style={styles.statSubRow}>
                {s.key === 'residents' ? (
                  <View style={styles.activeDot} />
                ) : null}
                <Text style={styles.statSubText} numberOfLines={1}>
                  {s.sublabel}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Acoes rapidas</Text>
      <View style={styles.quickGrid}>
        {quickActions.map((action) => (
          <Pressable
            key={action.key}
            style={styles.quickCard}
            onPress={action.onPress}
          >
            <View style={styles.quickIconWrap}>
              <Ionicons name={action.icon} size={20} color={colors.primary} />
            </View>
            {action.badge && action.badge > 0 ? (
              <View style={styles.quickBadge}>
                <Text style={styles.quickBadgeText}>{action.badge}</Text>
              </View>
            ) : null}
            <Text style={styles.quickTitle} numberOfLines={1}>
              {action.title}
            </Text>
            <Text style={styles.quickDescription} numberOfLines={2}>
              {action.description}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={colors.textMuted}
              style={styles.quickChevron}
            />
          </Pressable>
        ))}
      </View>

      <View style={styles.reservationsHeader}>
        <Text style={styles.sectionTitle}>Solicitacoes de reservas</Text>
        <Pressable onPress={goToReservationApprovals} hitSlop={6}>
          <Text style={styles.linkText}>Ver todas</Text>
        </Pressable>
      </View>

      <View style={styles.reservationsRow}>
        {[bbqSummary, hallSummary].map((space) => {
          const palette =
            space.tone === 'green'
              ? { bg: '#EAF5EF', fg: '#0F7A43' }
              : { bg: '#FBEDD2', fg: '#B07A1A' };
          return (
            <Pressable
              key={space.key}
              style={styles.reservationCard}
              onPress={goToReservationApprovals}
            >
              <View style={[styles.reservationIcon, { backgroundColor: palette.bg }]}>
                <Ionicons name={space.icon} size={20} color={palette.fg} />
              </View>
              <Text style={styles.reservationLabel} numberOfLines={1}>
                {space.label}
              </Text>
              <Text style={[styles.reservationValue, { color: palette.fg }]}>
                {space.pending}
              </Text>
              <Text style={styles.reservationSub}>Pendentes</Text>
              <View style={styles.reservationFooter} />
              <Text style={styles.reservationFooterText} numberOfLines={1}>
                {space.approvedToday} aprovadas hoje
              </Text>
            </Pressable>
          );
        })}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: 6
  },
  greeting: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800'
  },
  greetingRole: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700'
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A1A10',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  bellDot: {
    position: 'absolute',
    top: 11,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 6
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 4,
    shadowColor: '#112016',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  statCardPressed: {
    opacity: 0.7
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800'
  },
  statLabel: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700'
  },
  statSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary
  },
  statSubText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600'
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  quickCard: {
    width: '31%',
    minHeight: 138,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    shadowColor: '#112016',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  quickIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F1F7F1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  quickBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    minWidth: 22,
    paddingHorizontal: 6,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  quickBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800'
  },
  quickTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 12
  },
  quickDescription: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2
  },
  quickChevron: {
    position: 'absolute',
    right: 10,
    bottom: 10
  },
  reservationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  linkText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700'
  },
  reservationsRow: {
    flexDirection: 'row',
    gap: 10
  },
  reservationCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    gap: 2,
    shadowColor: '#112016',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  reservationIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  reservationLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700'
  },
  reservationValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4
  },
  reservationSub: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600'
  },
  reservationFooter: {
    height: 1,
    backgroundColor: '#EEF1EF',
    marginVertical: 8
  },
  reservationFooterText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500'
  }
});
