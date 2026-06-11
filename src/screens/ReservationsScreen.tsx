import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { AppCard } from '../components/AppCard';
import {
  deleteBbqReservation,
  deleteHallReservation,
  getBbqReservation,
  getHallReservation,
  listBbqReservations,
  listHallReservations
} from '../api/reservations';
import type { Reservation, ReservationStatus } from '../types/domain';
import { colors } from '../theme/colors';
import { extractErrorMessage } from '../utils/extractError';
import { formatDateTime, parseDateInput } from '../utils/date';
import { usePermissions } from '../hooks/usePermissions';
import type { ReservationsStackParamList } from '../navigation/types';

type ReservationTab = 'bbq' | 'hall';

type ReservationsNav = NativeStackNavigationProp<ReservationsStackParamList, 'ReservationsList'>;

export function ReservationsScreen() {
  const navigation = useNavigation<ReservationsNav>();
  const { isAdmin } = usePermissions();
  const [tab, setTab] = useState<ReservationTab>('bbq');
  const [list, setList] = useState<Reservation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Reservation | null>(null);
  const [detailContext, setDetailContext] = useState<'upcoming' | 'past'>('upcoming');
  const [detailSpace, setDetailSpace] = useState<ReservationTab>('bbq');

  const openDetails = useCallback(
    async (item: Reservation, context: 'upcoming' | 'past') => {
      setDetailVisible(true);
      setDetailLoading(true);
      setDetailError(null);
      setDetail(item);
      setDetailContext(context);
      setDetailSpace(tab);
      try {
        const fetched =
          tab === 'bbq'
            ? await getBbqReservation(item.id)
            : await getHallReservation(item.id);
        setDetail(fetched);
      } catch (error) {
        setDetailError(extractErrorMessage(error));
      } finally {
        setDetailLoading(false);
      }
    },
    [tab]
  );

  function closeDetails() {
    setDetailVisible(false);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(false);
  }

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = tab === 'bbq' ? await listBbqReservations() : await listHallReservations();
      setList(data);
    } finally {
      setRefreshing(false);
    }
  }, [tab]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  function openNewReservation() {
    navigation.navigate('NewReservation', { space: tab });
  }

  function openNewReservationForResident() {
    navigation.navigate('NewReservation', { space: tab, openUserPicker: true });
  }

  async function removeReservation(id: number) {
    try {
      if (tab === 'bbq') {
        await deleteBbqReservation(id);
      } else {
        await deleteHallReservation(id);
      }
      await loadData();
    } catch (error) {
      Alert.alert('Falha ao excluir', extractErrorMessage(error));
    }
  }

  const sortedReservations = useMemo(
    () =>
      [...list].sort(
        (a, b) =>
          parseDateInput(a.reservation_date).getTime() -
          parseDateInput(b.reservation_date).getTime()
      ),
    [list]
  );

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const upcomingReservations = sortedReservations.filter(
    (item) =>
      parseDateInput(item.reservation_date).getTime() >= todayStart &&
      item.status !== 'REJECTED'
  );

  const pastReservations = [...sortedReservations]
    .filter((item) => parseDateInput(item.reservation_date).getTime() < todayStart)
    .reverse();

  const rulesText =
    tab === 'bbq'
      ? 'Consulte as regras para uso da churrasqueira.'
      : 'Consulte as regras para uso do salao de festas.';

  return (
    <AppScreen onRefresh={loadData} refreshing={refreshing}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Reservas</Text>
          <Text style={styles.subtitle}>Confira suas reservas.</Text>
        </View>
        <Pressable style={styles.calendarButton} onPress={openNewReservation}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.segmented}>
        <Pressable
          style={[styles.segmentButton, tab === 'bbq' && styles.segmentButtonActive]}
          onPress={() => setTab('bbq')}
        >
          <Ionicons
            name="flame-outline"
            size={16}
            color={tab === 'bbq' ? colors.primary : '#8D93A1'}
          />
          <Text style={[styles.segmentText, tab === 'bbq' && styles.segmentTextActive]}>
            Churrasqueira
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentButton, tab === 'hall' && styles.segmentButtonActive]}
          onPress={() => setTab('hall')}
        >
          <Ionicons
            name="business-outline"
            size={16}
            color={tab === 'hall' ? colors.primary : '#8D93A1'}
          />
          <Text style={[styles.segmentText, tab === 'hall' && styles.segmentTextActive]}>
            Salao de festas
          </Text>
        </Pressable>
      </View>

      <Pressable style={styles.newReservationCta} onPress={openNewReservation}>
        <View style={styles.newReservationIcon}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
        </View>
        <Text style={styles.newReservationText}>Fazer nova reserva</Text>
      </Pressable>

      {isAdmin ? (
        <Pressable
          style={styles.adminReservationCta}
          onPress={openNewReservationForResident}
        >
          <View style={styles.adminReservationIcon}>
            <Ionicons name="people-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.adminReservationCopy}>
            <Text style={styles.adminReservationTitle}>Reservar para morador</Text>
            <Text style={styles.adminReservationSubtitle}>
              Crie uma reserva em nome de um morador
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
      ) : null}

      <Text style={styles.sectionTitle}>Proximas reservas</Text>

      {upcomingReservations.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIllustration}>
            <Ionicons
              name="leaf"
              size={20}
              color="#D8ECDB"
              style={styles.emptyLeafLeft}
            />
            <View style={styles.emptyCalendar}>
              <Ionicons name="calendar-clear-outline" size={42} color="#B7D5BC" />
              <View style={styles.emptyCheck}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
            </View>
            <Ionicons
              name="leaf"
              size={20}
              color="#D8ECDB"
              style={styles.emptyLeafRight}
            />
          </View>
          <Text style={styles.emptyTitle}>Voce nao tem reservas</Text>
          <Text style={styles.emptySubtitle}>Que tal fazer uma reserva?</Text>
          <Pressable style={styles.primaryCta} onPress={openNewReservation}>
            <Text style={styles.primaryCtaText}>Fazer reserva</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.listWrap}>
          {upcomingReservations.map((item) => {
            const { label, style } = statusPresentation(item.status, 'upcoming', styles);
            return (
              <ReservationRow
                key={`upcoming-${item.id}`}
                item={item}
                statusLabel={label}
                statusStyle={style}
                iconName={tab === 'bbq' ? 'flame-outline' : 'business-outline'}
                onPress={() => openDetails(item, 'upcoming')}
                onDelete={() => removeReservation(item.id)}
                showApartment={isAdmin}
              />
            );
          })}
        </View>
      )}

      <Text style={styles.sectionTitle}>Reservas anteriores</Text>

      {pastReservations.length > 0 ? (
        <View style={styles.listWrap}>
          {pastReservations.map((item) => {
            const { label, style } = statusPresentation(item.status, 'past', styles);
            return (
              <ReservationRow
                key={`past-${item.id}`}
                item={item}
                statusLabel={label}
                statusStyle={style}
                iconName={tab === 'bbq' ? 'flame-outline' : 'business-outline'}
                onPress={() => openDetails(item, 'past')}
                showApartment={isAdmin}
              />
            );
          })}
        </View>
      ) : (
        <AppCard>
          <Text style={styles.helperText}>Nenhuma reserva anterior encontrada.</Text>
        </AppCard>
      )}

      <Pressable
        style={styles.rulesCard}
        onPress={() => Alert.alert('Regras de utilizacao', rulesText)}
      >
        <View style={styles.rulesIconWrap}>
          <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.rulesCopy}>
          <Text style={styles.rulesTitle}>Regras de utilizacao</Text>
          <Text style={styles.rulesBody}>{rulesText}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
      </Pressable>

      <ReservationDetailsModal
        visible={detailVisible}
        onClose={closeDetails}
        loading={detailLoading}
        error={detailError}
        reservation={detail}
        space={detailSpace}
        context={detailContext}
      />
    </AppScreen>
  );
}

type ReservationDetailsModalProps = {
  visible: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  reservation: Reservation | null;
  space: ReservationTab;
  context: 'upcoming' | 'past';
};

function ReservationDetailsModal({
  visible,
  onClose,
  loading,
  error,
  reservation,
  space,
  context
}: ReservationDetailsModalProps) {
  const presentation = reservation
    ? statusPresentation(reservation.status, context, styles)
    : null;
  const timeRange = reservation
    ? formatTimeRange(reservation.start_time, reservation.end_time)
    : null;
  const ownerName =
    reservation?.reservation_user?.full_name?.trim() ||
    reservation?.reservation_user?.username ||
    null;
  const householdLabel = reservation?.household
    ? `Apto ${reservation.household.apartment}${
        reservation.household.block ? ` / Bloco ${reservation.household.block}` : ''
      }`
    : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.detailWrapper}>
        <Pressable style={styles.detailBackdrop} onPress={onClose} />
        <View style={styles.detailSheet}>
          <View style={styles.detailHandle} />

          <View style={styles.detailHeader}>
            <View style={styles.detailIcon}>
              <Ionicons
                name={space === 'bbq' ? 'flame-outline' : 'business-outline'}
                size={24}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailEyebrow}>
                {space === 'bbq' ? 'Churrasqueira' : 'Salao de festas'}
              </Text>
              <Text style={styles.detailTitle}>Detalhes da reserva</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.detailCloseButton}>
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.sheetDivider} />

          {loading ? (
            <View style={styles.detailLoadingWrap}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.detailLoadingText}>Carregando detalhes...</Text>
            </View>
          ) : error ? (
            <View style={styles.detailErrorWrap}>
              <Ionicons name="alert-circle-outline" size={26} color={colors.danger} />
              <Text style={styles.detailErrorText}>{error}</Text>
            </View>
          ) : reservation ? (
            <ScrollView
              style={styles.detailBody}
              contentContainerStyle={styles.detailBodyContent}
              showsVerticalScrollIndicator={false}
            >
              {presentation ? (
                <View style={[styles.statusChip, presentation.style, styles.detailStatusChip]}>
                  <Text
                    style={[
                      styles.statusText,
                      presentation.style === styles.statusCompleted &&
                        styles.statusTextCompleted,
                      presentation.style === styles.statusPending &&
                        styles.statusTextPending,
                      presentation.style === styles.statusRejected &&
                        styles.statusTextRejected
                    ]}
                  >
                    {presentation.label}
                  </Text>
                </View>
              ) : null}

              <Text style={styles.detailHeadline}>
                {formatReservationHeadline(reservation.reservation_date)}
              </Text>

              <View style={styles.detailGroup}>
                <DetailRow
                  icon="calendar-outline"
                  label="Data"
                  value={formatReservationFullDate(reservation.reservation_date)}
                />
                {timeRange ? (
                  <DetailRow icon="time-outline" label="Horario" value={timeRange} />
                ) : null}
                <DetailRow
                  icon="people-outline"
                  label="Convidados"
                  value={`${reservation.guest_count ?? 0} ${
                    (reservation.guest_count ?? 0) === 1 ? 'pessoa' : 'pessoas'
                  }`}
                />
                {ownerName ? (
                  <DetailRow icon="person-outline" label="Responsavel" value={ownerName} />
                ) : null}
                {householdLabel ? (
                  <DetailRow icon="home-outline" label="Unidade" value={householdLabel} />
                ) : null}
                <DetailRow
                  icon="create-outline"
                  label="Solicitada em"
                  value={formatDateTime(reservation.created_at)}
                />
                <DetailRow icon="pricetag-outline" label="ID" value={`#${reservation.id}`} />
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

type DetailRowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
};

function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailRowIcon}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={styles.detailRowCopy}>
        <Text style={styles.detailRowLabel}>{label}</Text>
        <Text style={styles.detailRowValue}>{value}</Text>
      </View>
    </View>
  );
}

type ReservationRowProps = {
  item: Reservation;
  statusLabel: string;
  statusStyle: object;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  onDelete?: () => void;
  showApartment?: boolean;
};

function ReservationRow({
  item,
  statusLabel,
  statusStyle,
  iconName,
  onPress,
  onDelete,
  showApartment = false
}: ReservationRowProps) {
  const timeRange = formatTimeRange(item.start_time, item.end_time);
  const apartmentLabel = item.household
    ? `Apto ${item.household.apartment}${item.household.block ? `/${item.household.block}` : ''}`
    : null;
  const ownerName =
    item.reservation_user?.full_name?.trim() ||
    item.reservation_user?.username ||
    (showApartment ? null : apartmentLabel);
  return (
    <Pressable style={styles.reservationRow} onPress={onPress}>
      <View style={styles.rowIconWrap}>
        <Ionicons name={iconName} size={22} color={colors.primary} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{formatReservationHeadline(item.reservation_date)}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={13} color="#8D93A1" />
          <Text style={styles.metaText}>{formatReservationFullDate(item.reservation_date)}</Text>
        </View>
        {timeRange ? (
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color="#8D93A1" />
            <Text style={styles.metaText}>{timeRange}</Text>
          </View>
        ) : null}
        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={13} color="#8D93A1" />
          <Text style={styles.metaText}>
            {item.guest_count ?? 0} {(item.guest_count ?? 0) === 1 ? 'pessoa' : 'pessoas'}
          </Text>
        </View>
        {ownerName ? (
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={13} color="#8D93A1" />
            <Text style={styles.metaText} numberOfLines={1}>
              {ownerName}
            </Text>
          </View>
        ) : null}
        {showApartment && apartmentLabel ? (
          <View style={styles.metaRow}>
            <Ionicons name="home-outline" size={13} color="#8D93A1" />
            <Text style={styles.metaText} numberOfLines={1}>
              {apartmentLabel}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.rowSide}>
        <View style={[styles.statusChip, statusStyle]}>
          <Text
            style={[
              styles.statusText,
              statusStyle === styles.statusCompleted && styles.statusTextCompleted,
              statusStyle === styles.statusPending && styles.statusTextPending,
              statusStyle === styles.statusRejected && styles.statusTextRejected
            ]}
          >
            {statusLabel}
          </Text>
        </View>
        <Pressable
          style={styles.chevronButton}
          onPress={onDelete ?? onPress}
          hitSlop={8}
        >
          <Ionicons
            name={onDelete ? 'trash-outline' : 'chevron-forward'}
            size={16}
            color={colors.textPrimary}
          />
        </Pressable>
      </View>
    </Pressable>
  );
}

function formatReservationHeadline(value: string) {
  const date = parseDateInput(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
    .format(date)
    .replace(/^\w/, (char) => char.toUpperCase());
}

function formatReservationFullDate(value: string) {
  const date = parseDateInput(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

type StatusPresentation = {
  label: string;
  style: object;
};

type StatusStyles = {
  statusUpcoming: object;
  statusCompleted: object;
  statusPending: object;
  statusRejected: object;
};

function statusPresentation(
  status: ReservationStatus,
  context: 'upcoming' | 'past',
  s: StatusStyles
): StatusPresentation {
  if (status === 'PENDING') {
    return { label: 'Aguardando aprovacao', style: s.statusPending };
  }
  if (status === 'REJECTED') {
    return { label: 'Recusada', style: s.statusRejected };
  }
  // APPROVED
  return context === 'upcoming'
    ? { label: 'Confirmada', style: s.statusUpcoming }
    : { label: 'Concluida', style: s.statusCompleted };
}

function trimSecondsLabel(time?: string | null): string | null {
  if (!time) return null;
  const [h, m] = time.split(':');
  if (!h || !m) return null;
  return `${h}:${m}`;
}

function formatTimeRange(start?: string | null, end?: string | null): string | null {
  const s = trimSecondsLabel(start);
  const e = trimSecondsLabel(end);
  if (!s && !e) return null;
  if (s && e) return `${s} - ${e}`;
  if (s) return `A partir das ${s}`;
  return `Ate as ${e}`;
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4
  },
  headerCopy: {
    gap: 4
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800'
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14
  },
  calendarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#132016',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4
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
  newReservationCta: {
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
  newReservationIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  newReservationText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  adminReservationCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D7E7DC',
    shadowColor: '#132016',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  adminReservationIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EAF5EF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  adminReservationCopy: {
    flex: 1,
    gap: 2
  },
  adminReservationTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800'
  },
  adminReservationSubtitle: {
    color: colors.textMuted,
    fontSize: 12
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 6
  },
  emptyCard: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingVertical: 26,
    alignItems: 'center',
    shadowColor: '#132016',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  emptyIllustration: {
    width: 150,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6
  },
  emptyCalendar: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#F2F7F2',
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyCheck: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF'
  },
  emptyLeafLeft: {
    position: 'absolute',
    left: 8,
    top: 30,
    transform: [{ rotate: '-25deg' }]
  },
  emptyLeafRight: {
    position: 'absolute',
    right: 8,
    top: 30,
    transform: [{ rotate: '25deg' }, { scaleX: -1 }]
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 18
  },
  primaryCta: {
    alignSelf: 'stretch',
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  listWrap: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#132016',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  reservationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFF2F0'
  },
  rowIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F2F7F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  rowCopy: {
    flex: 1,
    gap: 2
  },
  rowTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700'
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
  rowSide: {
    alignItems: 'flex-end',
    gap: 10,
    marginLeft: 8
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10
  },
  statusUpcoming: {
    backgroundColor: '#E8F6EC'
  },
  statusCompleted: {
    backgroundColor: '#F1F7F1'
  },
  statusPending: {
    backgroundColor: '#FFF4D6'
  },
  statusRejected: {
    backgroundColor: '#FBE3E3'
  },
  statusText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700'
  },
  statusTextCompleted: {
    color: colors.primaryDark
  },
  statusTextPending: {
    color: '#8A6300'
  },
  statusTextRejected: {
    color: colors.danger
  },
  chevronButton: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center'
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 13
  },
  rulesCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#132016',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  rulesIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#F2F7F2',
    alignItems: 'center',
    justifyContent: 'center'
  },
  rulesCopy: {
    flex: 1,
    gap: 2
  },
  rulesTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800'
  },
  rulesBody: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18
  },
  detailWrapper: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  detailBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 28, 19, 0.45)'
  },
  detailSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 14,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16
  },
  detailHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D8DCDA',
    marginBottom: 6
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4
  },
  detailIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#EAF5EF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  detailEyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase'
  },
  detailTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2
  },
  detailCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4F6F5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#EEF1EF',
    marginVertical: 2
  },
  detailLoadingWrap: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  detailLoadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600'
  },
  detailErrorWrap: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8
  },
  detailErrorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center'
  },
  detailBody: {
    flexGrow: 0
  },
  detailBodyContent: {
    gap: 14,
    paddingBottom: 8
  },
  detailStatusChip: {
    alignSelf: 'flex-start'
  },
  detailHeadline: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800'
  },
  detailGroup: {
    backgroundColor: '#F8FAF8',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#EAEFEB'
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6
  },
  detailRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EAF5EF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  detailRowCopy: {
    flex: 1,
    gap: 2
  },
  detailRowLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  detailRowValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  }
});
