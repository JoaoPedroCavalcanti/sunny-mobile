import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen } from '../components/AppScreen';
import { listServiceRequests } from '../api/serviceRequests';
import { colors } from '../theme/colors';
import {
  SERVICE_REQUEST_STATUS,
  SERVICE_TYPE_VISUAL,
  getRequesterApartmentLabel,
  getRequesterDisplayName
} from '../utils/serviceRequest';
import { formatDate } from '../utils/date';
import type {
  ServiceRequest,
  ServiceRequestStatus
} from '../types/domain';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ServiceRequests'>;

type FilterKey = 'all' | ServiceRequestStatus;

type FilterDef = {
  key: FilterKey;
  label: string;
  toneBg: string;
  toneFg: string;
};

const FILTERS: FilterDef[] = [
  { key: 'all', label: 'Todas', toneBg: '#EAF5EF', toneFg: '#0F7A43' },
  {
    key: 'PENDING',
    label: 'Pendentes',
    toneBg: SERVICE_REQUEST_STATUS.PENDING.bg,
    toneFg: SERVICE_REQUEST_STATUS.PENDING.fg
  },
  {
    key: 'ACCEPTED',
    label: 'Em andamento',
    toneBg: SERVICE_REQUEST_STATUS.ACCEPTED.bg,
    toneFg: SERVICE_REQUEST_STATUS.ACCEPTED.fg
  },
  {
    key: 'COMPLETED',
    label: 'Concluidas',
    toneBg: SERVICE_REQUEST_STATUS.COMPLETED.bg,
    toneFg: SERVICE_REQUEST_STATUS.COMPLETED.fg
  }
];

export function ServiceRequestsScreen() {
  const navigation = useNavigation<Nav>();
  const [list, setList] = useState<ServiceRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await listServiceRequests();
      setList(data);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const counts = useMemo(() => {
    const acc: Record<FilterKey, number> = {
      all: list.length,
      PENDING: 0,
      ACCEPTED: 0,
      COMPLETED: 0,
      DECLINED: 0
    };
    list.forEach((r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
    });
    return acc;
  }, [list]);

  const filteredList = useMemo(() => {
    const arr =
      filter === 'all' ? list : list.filter((r) => r.status === filter);
    return [...arr].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [list, filter]);

  function handleBack() {
    if (navigation.canGoBack()) navigation.goBack();
  }

  function openDetails(item: ServiceRequest) {
    navigation.navigate('ServiceRequestDetails', { requestId: item.id });
  }

  function openCreate() {
    navigation.navigate('NewServiceRequest');
  }

  return (
    <AppScreen onRefresh={loadData} refreshing={refreshing}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerSide} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Solicitacoes de servico</Text>
        <Pressable onPress={openCreate} style={styles.headerSide} hitSlop={8}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Acompanhe e gerencie todas as solicitacoes de servico do condominio.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = counts[f.key];
          return (
            <Pressable
              key={f.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setFilter(f.key)}
              hitSlop={4}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {f.label}
              </Text>
              <View
                style={[
                  styles.tabBadge,
                  active && { backgroundColor: f.toneBg }
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    active && { color: f.toneFg }
                  ]}
                >
                  {count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {filteredList.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="construct-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>
            {list.length === 0
              ? 'Nenhuma solicitacao por aqui'
              : 'Nenhuma solicitacao neste filtro'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {list.length === 0
              ? 'Quando voce ou outros moradores abrirem chamados, eles aparecerao por aqui.'
              : 'Tente outro filtro ou crie uma nova solicitacao.'}
          </Text>
          <Pressable style={styles.emptyCta} onPress={openCreate}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.emptyCtaText}>Nova solicitacao</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.listWrap}>
          {filteredList.map((item) => (
            <RequestRow key={item.id} item={item} onPress={() => openDetails(item)} />
          ))}
        </View>
      )}

      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
        <Text style={styles.infoText}>
          Toque em uma solicitacao para ver mais detalhes e atualizar o status.
        </Text>
      </View>

      <Pressable style={styles.fabCta} onPress={openCreate}>
        <View style={styles.fabIcon}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </View>
        <Text style={styles.fabText}>Abrir nova solicitacao</Text>
      </Pressable>
    </AppScreen>
  );
}

type RequestRowProps = {
  item: ServiceRequest;
  onPress: () => void;
};

function RequestRow({ item, onPress }: RequestRowProps) {
  const typeVisual = SERVICE_TYPE_VISUAL[item.service_type];
  const statusVisual = SERVICE_REQUEST_STATUS[item.status];
  const requesterName = getRequesterDisplayName(item.requester);
  const apartmentLabel = getRequesterApartmentLabel(item.requester);

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.rowIconWrap, { backgroundColor: typeVisual.bg }]}>
        <Ionicons name={typeVisual.icon} size={22} color={typeVisual.fg} />
      </View>

      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          Area: {item.location || typeVisual.label}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          Solicitante:{' '}
          {apartmentLabel ? `${apartmentLabel} - ${requesterName}` : requesterName}
        </Text>
      </View>

      <View style={styles.rowSide}>
        <View style={[styles.statusChip, { backgroundColor: statusVisual.bg }]}>
          <Text style={[styles.statusText, { color: statusVisual.fg }]}>
            {statusVisual.label}
          </Text>
        </View>
        <Text style={styles.rowDate}>{formatDate(item.created_at)}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </Pressable>
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
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: -6,
    textAlign: 'center'
  },
  tabsRow: {
    gap: 8,
    paddingVertical: 2,
    paddingHorizontal: 2
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E8E6'
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.primary
  },
  tabLabel: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700'
  },
  tabLabelActive: {
    color: colors.primary
  },
  tabBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 7,
    backgroundColor: '#F1F4F2',
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabBadgeText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '800'
  },
  listWrap: {
    gap: 10
  },
  row: {
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
  rowIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  rowCopy: {
    flex: 1,
    gap: 3
  },
  rowTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800'
  },
  rowMeta: {
    color: colors.textMuted,
    fontSize: 12
  },
  rowSide: {
    alignItems: 'flex-end',
    gap: 6,
    minWidth: 92
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800'
  },
  rowDate: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600'
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 28,
    gap: 10,
    shadowColor: '#132016',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#EAF5EF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800'
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primaryDark,
    marginTop: 6
  },
  emptyCtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800'
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F4EC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  infoText: {
    color: colors.primaryDark,
    fontSize: 12,
    flex: 1,
    lineHeight: 16
  },
  fabCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5
  },
  fabIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  }
});
