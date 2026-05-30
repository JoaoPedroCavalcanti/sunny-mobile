import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen } from '../components/AppScreen';
import { listVisitors } from '../api/visitors';
import type { VisitorAccess } from '../types/domain';
import { colors } from '../theme/colors';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type OuterTab = 'upcoming' | 'history';
type InnerTab = 'visitors' | 'groups';

type StatusKey = 'authorized' | 'waiting' | 'completed' | 'cancelled';

type VisitorRow = {
  key: string;
  name: string;
  scheduledAt: string;
  apartment: string;
  status: StatusKey;
  isPast: boolean;
};

type GroupRow = {
  key: string;
  name: string;
  count: number;
  scheduledAt: string;
  apartment: string;
  status: StatusKey;
  isPast: boolean;
};

const STATUS_STYLES: Record<StatusKey, { label: string; color: string; bg: string }> = {
  authorized: { label: 'Autorizado', color: '#0F7A43', bg: '#E8F6EC' },
  waiting: { label: 'Aguardando', color: '#3B7AC9', bg: '#E5EEF9' },
  completed: { label: 'Concluida', color: '#5C6770', bg: '#EEF0F2' },
  cancelled: { label: 'Cancelada', color: '#CD3131', bg: '#FBE3E3' }
};

// Mocked groups until the backend exposes the real endpoint.
const MOCK_GROUPS: GroupRow[] = [
  {
    key: 'g-1',
    name: 'Familia Silva',
    count: 4,
    scheduledAt: '2025-05-26T19:00:00Z',
    apartment: 'Apartamento 101',
    status: 'authorized',
    isPast: false
  },
  {
    key: 'g-2',
    name: 'Equipe da reforma',
    count: 3,
    scheduledAt: '2025-05-27T08:30:00Z',
    apartment: 'Apartamento 203',
    status: 'waiting',
    isPast: false
  },
  {
    key: 'g-3',
    name: 'Aniversario do Joao',
    count: 12,
    scheduledAt: '2025-04-12T20:00:00Z',
    apartment: 'Apartamento 305',
    status: 'completed',
    isPast: true
  }
];

function mapStatus(item: VisitorAccess): StatusKey {
  const s = item.status?.toLowerCase() ?? '';
  if (item.checkout_date_time) return 'completed';
  if (item.checkin_date_time) return 'authorized';
  if (s.includes('check-out')) return 'completed';
  if (s.includes('check-in') || s.includes('authorized') || s.includes('autorizado')) {
    return 'authorized';
  }
  if (s.includes('cancel')) return 'cancelled';
  return 'waiting';
}

function toVisitorRow(item: VisitorAccess): VisitorRow {
  const status = mapStatus(item);
  const scheduled = item.scheduled_date;
  const isPast =
    status === 'completed' ||
    status === 'cancelled' ||
    new Date(scheduled).getTime() < Date.now();
  return {
    key: `v-${item.id}`,
    name: item.visitor_name || 'Visitante',
    scheduledAt: scheduled,
    apartment: 'Apartamento 101',
    status,
    isPast
  };
}

function formatScheduled(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const date = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d);
  const time = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
  return `${date} • ${time}`;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function pickAvatarTone(seed: string) {
  const palette = [
    { bg: '#EAF5EF', color: '#0F7A43' },
    { bg: '#E5EEF9', color: '#3B7AC9' },
    { bg: '#FBE9DC', color: '#C5732E' },
    { bg: '#F3E7F8', color: '#7B3DA0' },
    { bg: '#FDECEC', color: '#CD3131' }
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1000;
  }
  return palette[hash % palette.length];
}

type VisitorsNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Visitantes'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function VisitorScreen() {
  const navigation = useNavigation<VisitorsNav>();
  const [items, setItems] = useState<VisitorAccess[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [outerTab, setOuterTab] = useState<OuterTab>('upcoming');
  const [innerTab, setInnerTab] = useState<InnerTab>('visitors');

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await listVisitors();
      setItems(data);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visitorRows = useMemo(() => items.map(toVisitorRow), [items]);

  const filteredVisitors = useMemo(() => {
    const wanted = outerTab === 'upcoming' ? false : true;
    return visitorRows
      .filter((r) => r.isPast === wanted)
      .sort(
        (a, b) =>
          new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
      );
  }, [visitorRows, outerTab]);

  const filteredGroups = useMemo(() => {
    const wanted = outerTab === 'upcoming' ? false : true;
    return MOCK_GROUPS.filter((r) => r.isPast === wanted).sort(
      (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    );
  }, [outerTab]);

  function handleBack() {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Home');
  }

  const isVisitors = innerTab === 'visitors';
  const showEmpty = isVisitors ? filteredVisitors.length === 0 : filteredGroups.length === 0;

  return (
    <AppScreen onRefresh={loadData} refreshing={refreshing}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerSide} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Visitantes</Text>
        <View style={styles.headerSide} />
      </View>

      <View style={styles.outerTabs}>
        {([
          { key: 'upcoming', label: 'Proximos' },
          { key: 'history', label: 'Historico' }
        ] as const).map((t) => {
          const isActive = outerTab === t.key;
          return (
            <Pressable
              key={t.key}
              style={styles.outerTab}
              onPress={() => setOuterTab(t.key)}
            >
              <Text style={[styles.outerTabLabel, isActive && styles.outerTabLabelActive]}>
                {t.label}
              </Text>
              <View
                style={[styles.outerTabIndicator, isActive && styles.outerTabIndicatorActive]}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.segmented}>
        <Pressable
          style={[styles.segmentButton, isVisitors && styles.segmentButtonActive]}
          onPress={() => setInnerTab('visitors')}
        >
          <Ionicons
            name="person-outline"
            size={16}
            color={isVisitors ? colors.primary : '#8D93A1'}
          />
          <Text style={[styles.segmentText, isVisitors && styles.segmentTextActive]}>
            Visitantes
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentButton, !isVisitors && styles.segmentButtonActive]}
          onPress={() => setInnerTab('groups')}
        >
          <Ionicons
            name="people-outline"
            size={16}
            color={!isVisitors ? colors.primary : '#8D93A1'}
          />
          <Text style={[styles.segmentText, !isVisitors && styles.segmentTextActive]}>
            Grupos de visitantes
          </Text>
        </Pressable>
      </View>

      {showEmpty ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name={isVisitors ? 'person-outline' : 'people-outline'}
            size={26}
            color="#B6BAC3"
          />
          <Text style={styles.emptyText}>
            {outerTab === 'upcoming'
              ? `Nenhum ${isVisitors ? 'visitante' : 'grupo'} agendado.`
              : 'Nenhum registro no historico.'}
          </Text>
        </View>
      ) : isVisitors ? (
        filteredVisitors.map((row) => <VisitorCard key={row.key} row={row} />)
      ) : (
        filteredGroups.map((row) => <GroupCard key={row.key} row={row} />)
      )}

      <View style={styles.actionsBlock}>
        <Pressable
          style={styles.primaryAction}
          onPress={() =>
            Alert.alert(
              'Cadastrar visitante',
              'Em breve voce podera cadastrar um novo visitante por aqui.'
            )
          }
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.primaryActionText}>Cadastrar visitante</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryAction}
          onPress={() =>
            Alert.alert(
              'Cadastrar grupo',
              'Em breve voce podera cadastrar um grupo de visitantes.'
            )
          }
        >
          <Ionicons name="people-outline" size={18} color={colors.primary} />
          <Text style={styles.secondaryActionText}>Cadastrar grupo de visitantes</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

function VisitorCard({ row }: { row: VisitorRow }) {
  const tone = pickAvatarTone(row.name);
  const statusStyle = STATUS_STYLES[row.status];
  return (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: tone.bg }]}>
        <Text style={[styles.avatarText, { color: tone.color }]}>
          {getInitials(row.name)}
        </Text>
      </View>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{row.name}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={13} color="#8D93A1" />
          <Text style={styles.metaText}>{formatScheduled(row.scheduledAt)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="business-outline" size={13} color="#8D93A1" />
          <Text style={styles.metaText}>{row.apartment}</Text>
        </View>
      </View>
      <View style={[styles.statusChip, { backgroundColor: statusStyle.bg }]}>
        <Text style={[styles.statusText, { color: statusStyle.color }]}>
          {statusStyle.label}
        </Text>
      </View>
    </View>
  );
}

function GroupCard({ row }: { row: GroupRow }) {
  const tone = pickAvatarTone(row.name);
  const statusStyle = STATUS_STYLES[row.status];
  return (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: tone.bg }]}>
        <Ionicons name="people" size={20} color={tone.color} />
      </View>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{row.name}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={13} color="#8D93A1" />
          <Text style={styles.metaText}>
            {row.count} {row.count === 1 ? 'pessoa' : 'pessoas'}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={13} color="#8D93A1" />
          <Text style={styles.metaText}>{formatScheduled(row.scheduledAt)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="business-outline" size={13} color="#8D93A1" />
          <Text style={styles.metaText}>{row.apartment}</Text>
        </View>
      </View>
      <View style={[styles.statusChip, { backgroundColor: statusStyle.bg }]}>
        <Text style={[styles.statusText, { color: statusStyle.color }]}>
          {statusStyle.label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4
  },
  headerSide: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800'
  },
  outerTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1EF',
    marginTop: 4
  },
  outerTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8
  },
  outerTabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9AA0AE',
    paddingBottom: 8
  },
  outerTabLabelActive: {
    color: colors.primary,
    fontWeight: '800'
  },
  outerTabIndicator: {
    height: 2,
    width: 60,
    borderRadius: 1,
    backgroundColor: 'transparent'
  },
  outerTabIndicatorActive: {
    backgroundColor: colors.primary
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 4,
    shadowColor: '#132016',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  segmentButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  segmentButtonActive: {
    backgroundColor: '#F4F8F4'
  },
  segmentText: {
    color: '#7C8392',
    fontSize: 13,
    fontWeight: '600'
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: '700'
  },
  emptyCard: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF'
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#132016',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontWeight: '800',
    fontSize: 14
  },
  cardCopy: {
    flex: 1,
    gap: 3
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800'
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 12
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: 'center'
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700'
  },
  actionsBlock: {
    gap: 10,
    marginTop: 16
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.primary
  },
  secondaryActionText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700'
  }
});
