import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen } from '../components/AppScreen';
import { colors } from '../theme/colors';
import {
  approveBbqReservation,
  approveHallReservation,
  listBbqReservations,
  listHallReservations,
  rejectBbqReservation,
  rejectHallReservation
} from '../api/reservations';
import { extractErrorMessage } from '../utils/extractError';
import { parseDateInput } from '../utils/date';
import type { Reservation, ReservationStatus } from '../types/domain';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ReservationApprovals'>;

type Space = 'bbq' | 'hall';

const SPACE_LABEL: Record<Space, string> = {
  bbq: 'Churrasqueira',
  hall: 'Salao de festas'
};

const STATUS_TABS: { key: ReservationStatus; label: string }[] = [
  { key: 'PENDING', label: 'Pendentes' },
  { key: 'APPROVED', label: 'Aprovadas' },
  { key: 'REJECTED', label: 'Recusadas' }
];

const WEEKDAY_SHORT_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

function formatRequestedAt(value: string): string {
  const d = parseDateInput(value);
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
  return `${date} as ${time}`;
}

function formatReservationDate(value: string): string {
  const d = parseDateInput(value);
  if (Number.isNaN(d.getTime())) return value;
  const day = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d);
  return `${day} (${WEEKDAY_SHORT_PT[d.getDay()]})`;
}

function trimSeconds(time?: string | null): string | null {
  if (!time) return null;
  const [h, m] = time.split(':');
  if (!h || !m) return null;
  return `${h}:${m}`;
}

function formatTimeRange(start?: string | null, end?: string | null): string {
  const s = trimSeconds(start);
  const e = trimSeconds(end);
  if (!s && !e) return 'Dia inteiro';
  if (s && e) return `${s} - ${e}`;
  if (s) return `A partir das ${s}`;
  return `Ate as ${e}`;
}

function residentLabel(item: Reservation): string {
  return (
    item.reservation_user?.full_name?.trim() ||
    item.reservation_user?.username ||
    'Morador'
  );
}

function householdLabel(item: Reservation): string | null {
  if (!item.household) return null;
  const apt = `Apartamento ${item.household.apartment}`;
  return item.household.block ? `${apt} \u00b7 Bloco ${item.household.block}` : apt;
}

export function ReservationApprovalsScreen() {
  const navigation = useNavigation<Nav>();
  const [space, setSpace] = useState<Space>('bbq');
  const [statusTab, setStatusTab] = useState<ReservationStatus>('PENDING');
  const [bbq, setBbq] = useState<Reservation[]>([]);
  const [hall, setHall] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const [bbqList, hallList] = await Promise.all([
          listBbqReservations(),
          listHallReservations()
        ]);
        setBbq(bbqList);
        setHall(hallList);
      } catch (e) {
        setError(extractErrorMessage(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  const source = space === 'bbq' ? bbq : hall;

  const counts = useMemo(() => {
    const map: Record<ReservationStatus, number> = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0
    };
    source.forEach((r) => {
      map[r.status] = (map[r.status] ?? 0) + 1;
    });
    return map;
  }, [source]);

  const visible = useMemo(() => {
    const filtered = source.filter((r) => r.status === statusTab);
    // Mais recentes primeiro nas Aprovadas/Recusadas; pendentes ordenadas pela
    // data da solicitacao (created_at) asc para resolver os mais antigos antes.
    return filtered.sort((a, b) => {
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      return statusTab === 'PENDING' ? at - bt : bt - at;
    });
  }, [source, statusTab]);

  function handleBack() {
    if (navigation.canGoBack()) navigation.goBack();
  }

  function handleInfo() {
    Alert.alert(
      'Sobre as aprovacoes',
      'Solicitacoes de reserva da churrasqueira e do salao de festas aguardam aprovacao do administrador. Apos aprovadas, o horario fica reservado para o morador.'
    );
  }

  async function performAction(item: Reservation, action: 'approve' | 'reject') {
    try {
      setActingId(item.id);
      const fn =
        space === 'bbq'
          ? action === 'approve'
            ? approveBbqReservation
            : rejectBbqReservation
          : action === 'approve'
            ? approveHallReservation
            : rejectHallReservation;
      const updated = await fn(item.id);
      const apply = (list: Reservation[]) =>
        list.map((r) => (r.id === item.id ? updated : r));
      if (space === 'bbq') setBbq(apply);
      else setHall(apply);
    } catch (e) {
      Alert.alert(
        action === 'approve' ? 'Falha ao aprovar' : 'Falha ao recusar',
        extractErrorMessage(e)
      );
    } finally {
      setActingId(null);
    }
  }

  function confirmAction(item: Reservation, action: 'approve' | 'reject') {
    const name = residentLabel(item);
    const spaceLabel = SPACE_LABEL[space];
    if (action === 'approve') {
      Alert.alert(
        'Aprovar reserva',
        `Confirma a aprovacao da reserva de ${name} para ${spaceLabel}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Aprovar', onPress: () => performAction(item, 'approve') }
        ]
      );
      return;
    }
    Alert.alert(
      'Recusar reserva',
      `Tem certeza que deseja recusar a reserva de ${name} para ${spaceLabel}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Recusar',
          style: 'destructive',
          onPress: () => performAction(item, 'reject')
        }
      ]
    );
  }

  return (
    <AppScreen onRefresh={() => load('refresh')} refreshing={refreshing}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerSide} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Aprovacoes de reservas</Text>
        <Pressable onPress={handleInfo} style={styles.headerSide} hitSlop={8}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color={colors.textPrimary}
          />
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Aprove ou recuse solicitacoes de reservas para Churrasqueira e Salao de
        festas.
      </Text>

      <View style={styles.segmented}>
        <SpaceButton
          icon="flame-outline"
          activeIcon="flame"
          label="Churrasqueira"
          active={space === 'bbq'}
          onPress={() => setSpace('bbq')}
        />
        <SpaceButton
          icon="business-outline"
          activeIcon="business"
          label="Salao de festas"
          active={space === 'hall'}
          onPress={() => setSpace('hall')}
        />
      </View>

      <View style={styles.statusTabsRow}>
        {STATUS_TABS.map((s) => (
          <StatusTab
            key={s.key}
            label={s.label}
            count={counts[s.key]}
            active={statusTab === s.key}
            onPress={() => setStatusTab(s.key)}
          />
        ))}
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => load('initial')} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : visible.length === 0 ? (
        <EmptyState statusTab={statusTab} space={space} />
      ) : (
        <View style={styles.list}>
          {visible.map((item) => (
            <ReservationCard
              key={`${space}-${item.id}`}
              item={item}
              space={space}
              acting={actingId === item.id}
              onApprove={() => confirmAction(item, 'approve')}
              onReject={() => confirmAction(item, 'reject')}
            />
          ))}
        </View>
      )}
    </AppScreen>
  );
}

type SpaceButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
};

function SpaceButton({ icon, activeIcon, label, active, onPress }: SpaceButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.spaceButton, active && styles.spaceButtonActive]}
    >
      <Ionicons
        name={active ? activeIcon : icon}
        size={16}
        color={active ? colors.primary : '#8D93A1'}
      />
      <Text style={[styles.spaceText, active && styles.spaceTextActive]}>{label}</Text>
    </Pressable>
  );
}

type StatusTabProps = {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
};

function StatusTab({ label, count, active, onPress }: StatusTabProps) {
  return (
    <Pressable style={styles.statusTab} onPress={onPress} hitSlop={6}>
      <View style={styles.statusTabLabelRow}>
        <Text style={[styles.statusTabLabel, active && styles.statusTabLabelActive]}>
          {label}
        </Text>
        <View style={[styles.statusTabBadge, active && styles.statusTabBadgeActive]}>
          <Text
            style={[
              styles.statusTabBadgeText,
              active && styles.statusTabBadgeTextActive
            ]}
          >
            {count}
          </Text>
        </View>
      </View>
      <View
        style={[styles.statusTabUnderline, active && styles.statusTabUnderlineActive]}
      />
    </Pressable>
  );
}

type ReservationCardProps = {
  item: Reservation;
  space: Space;
  acting: boolean;
  onApprove: () => void;
  onReject: () => void;
};

function ReservationCard({
  item,
  space,
  acting,
  onApprove,
  onReject
}: ReservationCardProps) {
  const apt = householdLabel(item);
  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View
          style={[
            styles.spaceIcon,
            space === 'hall' && styles.spaceIconHall
          ]}
        >
          <Ionicons
            name={space === 'bbq' ? 'flame' : 'business'}
            size={22}
            color={space === 'bbq' ? colors.primary : '#B07A1A'}
          />
        </View>
        <View style={styles.cardCopy}>
          <View
            style={[
              styles.spaceChip,
              space === 'hall' && styles.spaceChipHall
            ]}
          >
            <Text
              style={[
                styles.spaceChipText,
                space === 'hall' && styles.spaceChipTextHall
              ]}
            >
              {SPACE_LABEL[space]}
            </Text>
          </View>
          <Text style={styles.residentName} numberOfLines={1}>
            {residentLabel(item)}
          </Text>
          {apt ? (
            <Text style={styles.residentApt} numberOfLines={1}>
              {apt}
            </Text>
          ) : null}
        </View>
        <View style={styles.requestedAt}>
          <Text style={styles.requestedAtLabel}>Solicitado em</Text>
          <Text style={styles.requestedAtValue}>
            {formatRequestedAt(item.created_at)}
          </Text>
        </View>
      </View>

      <View style={styles.metaPanel}>
        <View style={styles.metaCell}>
          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
          <Text style={styles.metaText}>{formatReservationDate(item.reservation_date)}</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaCell}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={styles.metaText}>
            {formatTimeRange(item.start_time, item.end_time)}
          </Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaCell}>
          <Ionicons name="people-outline" size={14} color={colors.textMuted} />
          <Text style={styles.metaText}>
            {item.guest_count ?? 0} {(item.guest_count ?? 0) === 1 ? 'pessoa' : 'pessoas'}
          </Text>
        </View>
      </View>

      {item.status === 'PENDING' ? (
        <View style={styles.actionsRow}>
          {acting ? (
            <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
          ) : (
            <>
              <Pressable
                onPress={onApprove}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.approveButton,
                  pressed && styles.actionButtonPressed
                ]}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
                <Text style={[styles.actionText, styles.approveText]}>Aprovar</Text>
              </Pressable>
              <Pressable
                onPress={onReject}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.rejectButton,
                  pressed && styles.actionButtonPressed
                ]}
              >
                <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
                <Text style={[styles.actionText, styles.rejectText]}>Recusar</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : (
        <View style={styles.statusFooter}>
          <Ionicons
            name={item.status === 'APPROVED' ? 'checkmark-circle' : 'close-circle'}
            size={16}
            color={item.status === 'APPROVED' ? colors.primary : colors.danger}
          />
          <Text
            style={[
              styles.statusFooterText,
              item.status === 'APPROVED'
                ? styles.statusFooterApproved
                : styles.statusFooterRejected
            ]}
          >
            {item.status === 'APPROVED' ? 'Aprovada' : 'Recusada'}
          </Text>
        </View>
      )}
    </View>
  );
}

type EmptyStateProps = {
  statusTab: ReservationStatus;
  space: Space;
};

function EmptyState({ statusTab, space }: EmptyStateProps) {
  const text = (() => {
    if (statusTab === 'PENDING') {
      return `Nenhuma solicitacao pendente para ${SPACE_LABEL[space]}.`;
    }
    if (statusTab === 'APPROVED') {
      return `Nenhuma reserva aprovada para ${SPACE_LABEL[space]} ainda.`;
    }
    return `Nenhuma reserva recusada para ${SPACE_LABEL[space]}.`;
  })();
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name={statusTab === 'PENDING' ? 'checkmark-done-outline' : 'archive-outline'}
          size={22}
          color={colors.primary}
        />
      </View>
      <Text style={styles.emptyText}>{text}</Text>
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
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 12,
    marginTop: -4
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#132016',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  spaceButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  spaceButtonActive: {
    backgroundColor: '#F4F8F4'
  },
  spaceText: {
    color: '#7C8392',
    fontSize: 13,
    fontWeight: '600'
  },
  spaceTextActive: {
    color: colors.primary,
    fontWeight: '700'
  },
  statusTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1EF'
  },
  statusTab: {
    flex: 1,
    alignItems: 'center'
  },
  statusTabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10
  },
  statusTabLabel: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600'
  },
  statusTabLabelActive: {
    color: colors.textPrimary,
    fontWeight: '800'
  },
  statusTabBadge: {
    minWidth: 22,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F0F2F1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusTabBadgeActive: {
    backgroundColor: colors.primary
  },
  statusTabBadgeText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800'
  },
  statusTabBadgeTextActive: {
    color: '#FFFFFF'
  },
  statusTabUnderline: {
    height: 3,
    width: '70%',
    borderRadius: 2,
    backgroundColor: 'transparent'
  },
  statusTabUnderlineActive: {
    backgroundColor: colors.primary
  },
  centerState: {
    paddingVertical: 32,
    alignItems: 'center'
  },
  errorBox: {
    backgroundColor: '#FBECEC',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 8
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center'
  },
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F2D5D5'
  },
  retryBtnText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700'
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#132016',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EAF5EF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18
  },
  list: {
    gap: 12
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: '#132016',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  cardTopRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start'
  },
  spaceIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EAF5EF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  spaceIconHall: {
    backgroundColor: '#FBEDD2'
  },
  cardCopy: {
    flex: 1,
    gap: 4
  },
  spaceChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#EAF5EF'
  },
  spaceChipHall: {
    backgroundColor: '#FBEDD2'
  },
  spaceChipText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '800'
  },
  spaceChipTextHall: {
    color: '#7C5212'
  },
  residentName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800'
  },
  residentApt: {
    color: colors.textMuted,
    fontSize: 12
  },
  requestedAt: {
    alignItems: 'flex-end'
  },
  requestedAtLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600'
  },
  requestedAtValue: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right'
  },
  metaPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F6F5',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8
  },
  metaCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  metaDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#E3E8E5'
  },
  metaText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600'
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF'
  },
  approveButton: {
    borderColor: '#BFE0CB'
  },
  rejectButton: {
    borderColor: '#F2C5C5'
  },
  actionButtonPressed: {
    opacity: 0.7
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700'
  },
  approveText: {
    color: colors.primary
  },
  rejectText: {
    color: colors.danger
  },
  statusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F4F6F5'
  },
  statusFooterText: {
    fontSize: 12,
    fontWeight: '700'
  },
  statusFooterApproved: {
    color: colors.primary
  },
  statusFooterRejected: {
    color: colors.danger
  }
});
