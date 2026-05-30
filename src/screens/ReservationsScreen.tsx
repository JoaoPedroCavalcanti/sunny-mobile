import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen } from '../components/AppScreen';
import { AppCard } from '../components/AppCard';
import {
  deleteBbqReservation,
  deleteHallReservation,
  listBbqReservations,
  listHallReservations
} from '../api/reservations';
import type { Reservation } from '../types/domain';
import { colors } from '../theme/colors';
import { extractErrorMessage } from '../utils/extractError';
import type { ReservationsStackParamList } from '../navigation/types';

type ReservationTab = 'bbq' | 'hall';

type ReservationsNav = NativeStackNavigationProp<ReservationsStackParamList, 'ReservationsList'>;

export function ReservationsScreen() {
  const navigation = useNavigation<ReservationsNav>();
  const [tab, setTab] = useState<ReservationTab>('bbq');
  const [list, setList] = useState<Reservation[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = tab === 'bbq' ? await listBbqReservations() : await listHallReservations();
      setList(data);
    } finally {
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openNewReservation() {
    navigation.navigate('NewReservation', { space: tab });
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
          new Date(a.reservation_date).getTime() - new Date(b.reservation_date).getTime()
      ),
    [list]
  );

  const now = Date.now();

  const upcomingReservations = sortedReservations.filter(
    (item) => new Date(item.reservation_date).getTime() >= now
  );

  const pastReservations = [...sortedReservations]
    .filter((item) => new Date(item.reservation_date).getTime() < now)
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
          {upcomingReservations.map((item) => (
            <ReservationRow
              key={`upcoming-${item.id}`}
              item={item}
              statusLabel="Agendada"
              statusStyle={styles.statusUpcoming}
              iconName={tab === 'bbq' ? 'flame-outline' : 'business-outline'}
              onPress={() =>
                Alert.alert(
                  'Reserva',
                  `Reserva para ${formatReservationFullDate(item.reservation_date)}`
                )
              }
              onDelete={() => removeReservation(item.id)}
            />
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Reservas anteriores</Text>

      {pastReservations.length > 0 ? (
        <View style={styles.listWrap}>
          {pastReservations.map((item) => (
            <ReservationRow
              key={`past-${item.id}`}
              item={item}
              statusLabel="Concluida"
              statusStyle={styles.statusCompleted}
              iconName={tab === 'bbq' ? 'flame-outline' : 'business-outline'}
              onPress={() =>
                Alert.alert(
                  'Reserva anterior',
                  `Reserva realizada em ${formatReservationFullDate(item.reservation_date)}`
                )
              }
            />
          ))}
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
    </AppScreen>
  );
}

type ReservationRowProps = {
  item: Reservation;
  statusLabel: string;
  statusStyle: object;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  onDelete?: () => void;
};

function ReservationRow({
  item,
  statusLabel,
  statusStyle,
  iconName,
  onPress,
  onDelete
}: ReservationRowProps) {
  return (
    <Pressable style={styles.reservationRow} onPress={onPress}>
      <View style={styles.rowIconWrap}>
        <Ionicons name={iconName} size={22} color={colors.primary} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{formatReservationHeadline(item.reservation_date)}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color="#8D93A1" />
          <Text style={styles.metaText}>{formatReservationSlot(item.reservation_date)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={13} color="#8D93A1" />
          <Text style={styles.metaText}>
            {item.guest_count ?? 0} {(item.guest_count ?? 0) === 1 ? 'pessoa' : 'pessoas'}
          </Text>
        </View>
      </View>
      <View style={styles.rowSide}>
        <View style={[styles.statusChip, statusStyle]}>
          <Text style={[styles.statusText, statusStyle === styles.statusCompleted && styles.statusTextCompleted]}>
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
  const date = new Date(value);
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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function formatReservationSlot(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Horario a confirmar';
  }

  const start = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);

  const endDate = new Date(date.getTime() + 4 * 60 * 60 * 1000);
  const end = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(endDate);

  return `${start} - ${end}`;
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
  statusText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700'
  },
  statusTextCompleted: {
    color: colors.primaryDark
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
  }
});
