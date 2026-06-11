import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

const SHEET_MIN_HEIGHT = Math.round(Dimensions.get('window').height * 0.5);
const PICKER_MAX_HEIGHT = Math.round(Dimensions.get('window').height * 0.75);
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen } from '../components/AppScreen';
import {
  createBbqReservation,
  createHallReservation,
  listBbqReservations,
  listHallReservations,
  type ReservationInput
} from '../api/reservations';
import { listUsers } from '../api/users';
import { colors } from '../theme/colors';
import { extractErrorMessage } from '../utils/extractError';
import { parseDateInput, toApiDate } from '../utils/date';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import type { ReservationsStackParamList } from '../navigation/types';
import type { Reservation, ReservationStatus, User } from '../types/domain';

type SpaceType = 'bbq' | 'hall';

type DayReservation = {
  id: string;
  resident: string;
  guests: number;
  timeRange: string | null;
  status: ReservationStatus;
  statusLabel: string;
};

const WEEKDAYS_PT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
const MONTHS_PT_SHORT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez'
];

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function getUserDisplayName(u: User) {
  return u.full_name?.trim() || u.username;
}

function getUserApartmentLabel(u: User): string | null {
  const apt = u.apartment?.trim();
  if (!apt) return null;
  const block = u.block?.trim();
  return block ? `Apto ${apt}/${block}` : `Apto ${apt}`;
}

function isSameApiDay(reservationDate: string, day: Date) {
  return toApiDate(parseDateInput(reservationDate)) === toApiDate(day);
}

function trimSeconds(time?: string | null): string | null {
  if (!time) return null;
  const [h, m] = time.split(':');
  if (!h || !m) return null;
  return `${h}:${m}`;
}

function buildTimeRange(start?: string | null, end?: string | null): string | null {
  const s = trimSeconds(start);
  const e = trimSeconds(end);
  if (!s && !e) return 'Dia inteiro';
  if (s && e) return `${s} - ${e}`;
  if (s) return `A partir das ${s}`;
  return `Ate as ${e}`;
}

const STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING: 'Aguardando',
  APPROVED: 'Confirmada',
  REJECTED: 'Recusada'
};

function buildDayReservations(
  reservations: Reservation[],
  day: Date
): DayReservation[] {
  return reservations
    .filter((r) => isSameApiDay(r.reservation_date, day))
    .map((r) => {
      const ownerName =
        r.reservation_user?.full_name?.trim() ||
        r.reservation_user?.username ||
        (r.household
          ? `Apto ${r.household.apartment}${r.household.block ? `/${r.household.block}` : ''}`
          : 'Morador');
      return {
        id: String(r.id),
        resident: ownerName,
        guests: r.guest_count ?? 0,
        timeRange: buildTimeRange(r.start_time, r.end_time),
        status: r.status,
        statusLabel: STATUS_LABEL[r.status]
      };
    });
}

type NewReservationNav = NativeStackNavigationProp<ReservationsStackParamList, 'NewReservation'>;
type NewReservationRouteProp = RouteProp<ReservationsStackParamList, 'NewReservation'>;

export function NewReservationScreen() {
  const navigation = useNavigation<NewReservationNav>();
  const route = useRoute<NewReservationRouteProp>();
  const { isAdmin } = usePermissions();
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const initialSpace = route.params?.space ?? 'bbq';
  const initialOpenUserPicker = route.params?.openUserPicker ?? false;

  const [space, setSpace] = useState<SpaceType>(initialSpace);
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()));
  const [composerOpen, setComposerOpen] = useState(false);
  const [startHour, setStartHour] = useState('18');
  const [endHour, setEndHour] = useState('23');
  const [guestCount, setGuestCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const [residents, setResidents] = useState<User[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [pickerOpen, setPickerOpen] = useState(initialOpenUserPicker && isAdmin);
  const [pickerSearch, setPickerSearch] = useState('');

  const weekDays = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const dayReservations = useMemo(
    () => buildDayReservations(reservations, selectedDay),
    [reservations, selectedDay]
  );

  const reservedDays = useMemo(() => {
    const set = new Set<string>();
    reservations.forEach((r) => {
      set.add(toApiDate(parseDateInput(r.reservation_date)));
    });
    return set;
  }, [reservations]);

  const loadReservations = useCallback(async () => {
    try {
      const list = space === 'bbq' ? await listBbqReservations() : await listHallReservations();
      setReservations(list);
    } catch (error) {
      // Silenciamos a falha aqui pra UI nao quebrar; o composer ainda funciona.
    }
  }, [space]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  useEffect(() => {
    setComposerOpen(false);
  }, [selectedDay, space]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingResidents(true);
        const list = await listUsers({ role: 'RESIDENT' });
        if (!cancelled) {
          const sorted = [...list].sort((a, b) =>
            getUserDisplayName(a).localeCompare(getUserDisplayName(b), 'pt-BR')
          );
          setResidents(sorted);
        }
      } catch (error) {
        // Ignoramos: o admin ainda consegue reservar pra si mesmo.
      } finally {
        if (!cancelled) setLoadingResidents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const filteredResidents = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return residents;
    return residents.filter((u) => {
      const name = getUserDisplayName(u).toLowerCase();
      const apt = getUserApartmentLabel(u)?.toLowerCase() ?? '';
      const username = u.username.toLowerCase();
      return name.includes(q) || apt.includes(q) || username.includes(q);
    });
  }, [residents, pickerSearch]);

  const selectedLabel = useMemo(() => {
    const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })
      .format(selectedDay)
      .replace(/^\w/, (c) => c.toUpperCase());
    const day = selectedDay.getDate();
    const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(selectedDay);
    return `${weekday}, ${day} de ${month}`;
  }, [selectedDay]);

  async function submitReservation() {
    const sh = Number(startHour);
    const eh = Number(endHour);
    if (Number.isNaN(sh) || Number.isNaN(eh) || sh < 0 || sh > 23 || eh < 1 || eh > 24) {
      Alert.alert('Horario invalido', 'Informe um horario entre 00 e 24.');
      return;
    }
    if (eh <= sh) {
      Alert.alert('Horario invalido', 'O horario final precisa ser maior que o inicial.');
      return;
    }

    const payload: ReservationInput = {
      reservation_date: toApiDate(selectedDay),
      guest_count: guestCount ? Number(guestCount) : undefined
    };
    // Omitimos start/end quando cobrem o dia inteiro para o backend tratar como
    // reserva sem janela especifica (e respeitar as combinacoes validas).
    if (sh > 0) payload.start_time = `${String(sh).padStart(2, '0')}:00`;
    if (eh < 24) payload.end_time = `${String(eh).padStart(2, '0')}:00`;
    // Backend exige reservation_user sempre que requester.is_staff. Se o admin
    // nao escolheu morador, mandamos o proprio id como fallback.
    if (isAdmin) {
      const targetId = targetUser?.id ?? currentUserId;
      if (targetId != null) {
        payload.reservation_user = targetId;
      }
    }

    try {
      setLoading(true);
      if (space === 'bbq') {
        await createBbqReservation(payload);
      } else {
        await createHallReservation(payload);
      }
      await loadReservations();
      setComposerOpen(false);
      const successMessage =
        isAdmin && targetUser
          ? `Reserva criada para ${getUserDisplayName(targetUser)}.`
          : 'Sua solicitacao foi registrada com sucesso e esta aguardando aprovacao.';
      Alert.alert('Reserva enviada', successMessage, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Falha ao reservar', extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Nova reserva</Text>
        <View style={styles.backButton} />
      </View>
      <Text style={styles.subtitle}>
        Selecione o espaco e o dia desejado para fazer sua solicitacao.
      </Text>

      <View style={styles.segmented}>
        <Pressable
          style={[styles.segmentButton, space === 'bbq' && styles.segmentButtonActive]}
          onPress={() => setSpace('bbq')}
        >
          <Ionicons
            name="flame-outline"
            size={16}
            color={space === 'bbq' ? colors.primary : '#8D93A1'}
          />
          <Text style={[styles.segmentText, space === 'bbq' && styles.segmentTextActive]}>
            Churrasqueira
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentButton, space === 'hall' && styles.segmentButtonActive]}
          onPress={() => setSpace('hall')}
        >
          <Ionicons
            name="business-outline"
            size={16}
            color={space === 'hall' ? colors.primary : '#8D93A1'}
          />
          <Text style={[styles.segmentText, space === 'hall' && styles.segmentTextActive]}>
            Salao de festas
          </Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Calendario</Text>

      <View style={styles.weekStrip}>
        <Pressable
          style={styles.weekNav}
          onPress={() => setWeekStart((w) => addDays(w, -7))}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.weekDays}>
          {weekDays.map((day) => {
            const isSelected = sameDay(day, selectedDay);
            const hasReservations = reservedDays.has(toApiDate(day));
            return (
              <Pressable
                key={day.toISOString()}
                style={styles.dayCell}
                onPress={() => setSelectedDay(day)}
              >
                <Text style={[styles.dayWeekday, isSelected && styles.dayWeekdayActive]}>
                  {WEEKDAYS_PT[day.getDay()]}
                </Text>
                <View style={[styles.dayNumberWrap, isSelected && styles.dayNumberWrapActive]}>
                  <Text
                    style={[styles.dayNumber, isSelected && styles.dayNumberActive]}
                  >
                    {day.getDate()}
                  </Text>
                </View>
                <Text style={[styles.dayMonth, isSelected && styles.dayMonthActive]}>
                  {MONTHS_PT_SHORT[day.getMonth()]}
                </Text>
                <View
                  style={[
                    styles.dayDot,
                    hasReservations && styles.dayDotActive,
                    isSelected && hasReservations && styles.dayDotActiveSelected
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={styles.weekNav}
          onPress={() => setWeekStart((w) => addDays(w, 7))}
          hitSlop={8}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.selectedDayCard}>
        <View style={styles.selectedDayIcon}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.selectedDayCopy}>
          <Text style={styles.selectedDayTitle}>{selectedLabel}</Text>
          <Text style={styles.selectedDaySpace}>Reservando para este dia</Text>
        </View>
        <View style={styles.spacePill}>
          <Ionicons
            name={space === 'bbq' ? 'flame' : 'business'}
            size={14}
            color="#FFFFFF"
          />
          <Text style={styles.spacePillText}>
            {space === 'bbq' ? 'Churrasqueira' : 'Salao de festas'}
          </Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
        <Text style={styles.infoText}>
          As reservas sao solicitadas ao sindico e dependem de aprovacao.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Reservas do dia</Text>

      {dayReservations.length > 0 ? (
        <View style={styles.listWrap}>
          {dayReservations.map((r, idx) => (
            <View
              key={r.id}
              style={[
                styles.reservationRow,
                idx === dayReservations.length - 1 && styles.reservationRowLast
              ]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(r.resident)}</Text>
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{r.resident}</Text>
                {r.timeRange ? (
                  <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={13} color="#8D93A1" />
                    <Text style={styles.metaText}>{r.timeRange}</Text>
                  </View>
                ) : null}
                <View style={styles.metaRow}>
                  <Ionicons name="people-outline" size={13} color="#8D93A1" />
                  <Text style={styles.metaText}>
                    {r.guests} {r.guests === 1 ? 'pessoa' : 'pessoas'}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.statusChip,
                  r.status === 'PENDING' && styles.statusPending,
                  r.status === 'APPROVED' && styles.statusApproved,
                  r.status === 'REJECTED' && styles.statusRejected
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    r.status === 'PENDING' && styles.statusTextPending,
                    r.status === 'APPROVED' && styles.statusTextApproved,
                    r.status === 'REJECTED' && styles.statusTextRejected
                  ]}
                >
                  {r.statusLabel}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyDayCard}>
          <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
          <Text style={styles.emptyDayText}>
            Nenhuma reserva para este dia. O espaco esta livre.
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Fazer nova solicitacao</Text>

      {isAdmin ? (
        <Pressable
          style={styles.targetCard}
          onPress={() => {
            setPickerSearch('');
            setPickerOpen(true);
          }}
        >
          <View style={styles.targetIconWrap}>
            <Ionicons
              name={targetUser ? 'person' : 'person-outline'}
              size={18}
              color={colors.primary}
            />
          </View>
          <View style={styles.targetCopy}>
            <Text style={styles.targetEyebrow}>Reservar para</Text>
            <Text style={styles.targetTitle} numberOfLines={1}>
              {targetUser ? getUserDisplayName(targetUser) : 'Eu mesmo'}
            </Text>
            <Text style={styles.targetSubtitle} numberOfLines={1}>
              {targetUser
                ? getUserApartmentLabel(targetUser) ?? `@${targetUser.username}`
                : 'Toque para escolher um morador'}
            </Text>
          </View>
          {targetUser ? (
            <Pressable
              hitSlop={8}
              style={styles.targetClear}
              onPress={() => setTargetUser(null)}
            >
              <Ionicons name="close" size={16} color={colors.textPrimary} />
            </Pressable>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
          )}
        </Pressable>
      ) : null}

      <Pressable style={styles.ctaCard} onPress={() => setComposerOpen(true)}>
        <View style={styles.ctaIcon}>
          <Ionicons name={space === 'bbq' ? 'flame' : 'business'} size={22} color="#FFFFFF" />
        </View>
        <View style={styles.ctaCopy}>
          <Text style={styles.ctaTitle}>
            Solicitar reserva para {space === 'bbq' ? 'Churrasqueira' : 'Salao de festas'}
          </Text>
          <Text style={styles.ctaBody}>
            Informe o horario e os detalhes da sua reserva.{'\n'}A solicitacao sera enviada ao
            sindico para aprovacao.
          </Text>
        </View>
        <View style={styles.ctaChevron}>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </View>
      </Pressable>

      <Modal
        visible={composerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setComposerOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.sheetWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.sheetBackdrop} onPress={() => setComposerOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetSpaceIcon}>
                <Ionicons
                  name={space === 'bbq' ? 'flame' : 'business'}
                  size={26}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetEyebrow}>Nova reserva</Text>
                <Text style={styles.sheetSpaceName}>
                  {space === 'bbq' ? 'Churrasqueira' : 'Salao de festas'}
                </Text>
                <View style={styles.sheetDateRow}>
                  <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.sheetSubtitle}>{selectedLabel}</Text>
                </View>
                {isAdmin ? (
                  <View style={styles.sheetDateRow}>
                    <Ionicons name="person-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.sheetSubtitle} numberOfLines={1}>
                      Para: {targetUser ? getUserDisplayName(targetUser) : 'Eu mesmo'}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Pressable
                onPress={() => setComposerOpen(false)}
                hitSlop={8}
                style={styles.sheetCloseButton}
              >
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.sheetDivider} />

            <ScrollView
              style={styles.sheetBody}
              contentContainerStyle={styles.sheetBodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.sectionLabel}>Horario</Text>
              <View style={styles.composerRow}>
                <View style={styles.composerField}>
                  <Text style={styles.fieldLabel}>Inicio</Text>
                  <NumberField
                    value={startHour}
                    onChange={setStartHour}
                    min={0}
                    max={23}
                    maxLength={2}
                    suffix="h"
                    placeholder="00"
                  />
                </View>
                <View style={styles.composerArrow}>
                  <Ionicons name="arrow-forward" size={16} color="#B6BAC3" />
                </View>
                <View style={styles.composerField}>
                  <Text style={styles.fieldLabel}>Fim</Text>
                  <NumberField
                    value={endHour}
                    onChange={setEndHour}
                    min={1}
                    max={24}
                    maxLength={2}
                    suffix="h"
                    placeholder="00"
                  />
                </View>
              </View>

              <View style={styles.durationPill}>
                <Ionicons name="time-outline" size={13} color={colors.primary} />
                <Text style={styles.durationText}>
                  {(() => {
                    const sh = Number(startHour);
                    const eh = Number(endHour);
                    if (
                      Number.isFinite(sh) &&
                      Number.isFinite(eh) &&
                      eh > sh &&
                      sh >= 0 &&
                      eh <= 24
                    ) {
                      const diff = eh - sh;
                      return `${diff} ${diff === 1 ? 'hora' : 'horas'} reservadas`;
                    }
                    return 'Defina um horario valido';
                  })()}
                </Text>
              </View>

              <Text style={styles.sectionLabel}>Convidados</Text>
              <View style={styles.composerField}>
                <Text style={styles.fieldLabel}>Numero de pessoas</Text>
                <NumberField
                  value={guestCount}
                  onChange={setGuestCount}
                  min={0}
                  maxLength={3}
                  placeholder="0"
                />
              </View>
            </ScrollView>

            <View style={styles.composerActions}>
              <Pressable
                style={[styles.composerButton, styles.composerCancel]}
                onPress={() => setComposerOpen(false)}
                disabled={loading}
              >
                <Text style={styles.composerCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.composerButton, styles.composerSubmit]}
                onPress={submitReservation}
                disabled={loading}
              >
                <Text style={styles.composerSubmitText}>
                  {loading ? 'Enviando...' : 'Solicitar reserva'}
                </Text>
                {!loading ? (
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                ) : null}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.sheetWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.sheetBackdrop} onPress={() => setPickerOpen(false)} />
          <View style={[styles.sheet, styles.pickerSheet]}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetSpaceIcon}>
                <Ionicons name="people-outline" size={26} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetEyebrow}>Reservar para</Text>
                <Text style={styles.sheetSpaceName}>Escolha um morador</Text>
                <Text style={styles.sheetSubtitle}>
                  {residents.length} {residents.length === 1 ? 'morador' : 'moradores'} cadastrados
                </Text>
              </View>
              <Pressable
                onPress={() => setPickerOpen(false)}
                hitSlop={8}
                style={styles.sheetCloseButton}
              >
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.searchField}>
              <Ionicons name="search" size={16} color="#8D93A1" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nome ou apartamento"
                placeholderTextColor="#B6BAC3"
                value={pickerSearch}
                onChangeText={setPickerSearch}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {pickerSearch.length > 0 ? (
                <Pressable hitSlop={8} onPress={() => setPickerSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#B6BAC3" />
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              style={styles.pickerList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Pressable
                style={[
                  styles.pickerRow,
                  targetUser === null && styles.pickerRowSelected
                ]}
                onPress={() => {
                  setTargetUser(null);
                  setPickerOpen(false);
                }}
              >
                <View style={styles.pickerAvatar}>
                  <Ionicons name="person" size={16} color={colors.primary} />
                </View>
                <View style={styles.pickerCopy}>
                  <Text style={styles.pickerName}>Eu mesmo</Text>
                  <Text style={styles.pickerMeta}>Reservar em meu nome</Text>
                </View>
                {targetUser === null ? (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                ) : null}
              </Pressable>

              {loadingResidents ? (
                <Text style={styles.pickerEmpty}>Carregando moradores...</Text>
              ) : filteredResidents.length === 0 ? (
                <Text style={styles.pickerEmpty}>
                  {residents.length === 0
                    ? 'Nenhum morador cadastrado.'
                    : 'Nenhum morador encontrado.'}
                </Text>
              ) : (
                filteredResidents.map((u) => {
                  const selected = targetUser?.id === u.id;
                  const apt = getUserApartmentLabel(u);
                  return (
                    <Pressable
                      key={u.id}
                      style={[styles.pickerRow, selected && styles.pickerRowSelected]}
                      onPress={() => {
                        setTargetUser(u);
                        setPickerOpen(false);
                      }}
                    >
                      <View style={styles.pickerAvatar}>
                        <Text style={styles.pickerAvatarText}>
                          {getInitials(getUserDisplayName(u))}
                        </Text>
                      </View>
                      <View style={styles.pickerCopy}>
                        <Text style={styles.pickerName} numberOfLines={1}>
                          {getUserDisplayName(u)}
                        </Text>
                        <Text style={styles.pickerMeta} numberOfLines={1}>
                          {apt ?? `@${u.username}`}
                        </Text>
                      </View>
                      {selected ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={colors.primary}
                        />
                      ) : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </AppScreen>
  );
}

type NumberFieldProps = {
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  suffix?: string;
  placeholder?: string;
  maxLength?: number;
};

function NumberField({
  value,
  onChange,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  suffix,
  placeholder = '0',
  maxLength = 3
}: NumberFieldProps) {
  function step(delta: number) {
    const current = Number(value);
    const safe = Number.isFinite(current) ? current : 0;
    const next = Math.min(max, Math.max(min, safe + delta));
    onChange(String(next));
  }

  function handleChange(raw: string) {
    const cleaned = raw.replace(/[^0-9]/g, '').slice(0, maxLength);
    onChange(cleaned);
  }

  function handleBlur() {
    if (value === '') return;
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    const clamped = Math.min(max, Math.max(min, n));
    if (clamped !== n) onChange(String(clamped));
  }

  return (
    <View style={styles.numberField}>
      <TextInput
        value={value}
        onChangeText={handleChange}
        onBlur={handleBlur}
        keyboardType="number-pad"
        placeholder={placeholder}
        placeholderTextColor="#B6BAC3"
        maxLength={maxLength}
        style={styles.numberInput}
      />
      {suffix ? <Text style={styles.numberSuffix}>{suffix}</Text> : null}
      <View style={styles.numberSteppers}>
        <Pressable style={styles.numberStepperButton} onPress={() => step(1)} hitSlop={6}>
          <Ionicons name="chevron-up" size={12} color="#8D93A1" />
        </Pressable>
        <Pressable style={styles.numberStepperButton} onPress={() => step(-1)} hitSlop={6}>
          <Ionicons name="chevron-down" size={12} color="#8D93A1" />
        </Pressable>
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
  backButton: {
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
    marginTop: -2
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
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6
  },
  weekStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 4,
    shadowColor: '#132016',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  weekNav: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center'
  },
  weekDays: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    gap: 4
  },
  dayWeekday: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9AA0AE',
    letterSpacing: 0.5
  },
  dayWeekdayActive: {
    color: colors.textPrimary
  },
  dayNumberWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dayNumberWrapActive: {
    backgroundColor: colors.primary
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary
  },
  dayNumberActive: {
    color: '#FFFFFF'
  },
  dayMonth: {
    fontSize: 10,
    color: '#9AA0AE',
    fontWeight: '500'
  },
  dayMonthActive: {
    color: colors.textPrimary
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginTop: 2
  },
  dayDotActive: {
    backgroundColor: colors.primary
  },
  dayDotActiveSelected: {
    backgroundColor: '#FFFFFF',
    width: 5,
    height: 5,
    borderRadius: 3
  },
  selectedDayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: '#132016',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  spacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999
  },
  spacePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700'
  },
  selectedDayIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F2F7F2',
    alignItems: 'center',
    justifyContent: 'center'
  },
  selectedDayCopy: {
    flex: 1
  },
  selectedDayTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800'
  },
  selectedDaySpace: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2
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
  listWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 4,
    shadowColor: '#132016',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  reservationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F1'
  },
  reservationRowLast: {
    borderBottomWidth: 0
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F7F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  avatarText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 12
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
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10
  },
  statusPending: {
    backgroundColor: '#FFF4D6'
  },
  statusApproved: {
    backgroundColor: '#E8F6EC'
  },
  statusRejected: {
    backgroundColor: '#FBE3E3'
  },
  statusText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700'
  },
  statusTextPending: {
    color: '#8A6300'
  },
  statusTextApproved: {
    color: colors.primary
  },
  statusTextRejected: {
    color: colors.danger
  },
  emptyDayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14
  },
  emptyDayText: {
    color: colors.textMuted,
    fontSize: 13,
    flex: 1
  },
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primaryDark,
    borderRadius: 18,
    padding: 16,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8
  },
  ctaIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  ctaCopy: {
    flex: 1
  },
  ctaTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  },
  ctaBody: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16
  },
  ctaChevron: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 28, 19, 0.45)'
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    minHeight: SHEET_MIN_HEIGHT,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16
  },
  sheetBody: {
    flexGrow: 0
  },
  sheetBodyContent: {
    gap: 14,
    paddingBottom: 4
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D8DCDA',
    marginBottom: 6
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4
  },
  sheetSpaceIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#EAF5EF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sheetEyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase'
  },
  sheetSpaceName: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2
  },
  sheetDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3
  },
  sheetSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500'
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#EEF1EF',
    marginVertical: 2
  },
  sectionLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: -2
  },
  composerArrow: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 22
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EAF5EF'
  },
  durationText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700'
  },
  sheetCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4F6F5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  composerTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800'
  },
  composerRow: {
    flexDirection: 'row',
    gap: 12
  },
  composerField: {
    flex: 1,
    gap: 6
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600'
  },
  numberField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E8E6',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    gap: 4
  },
  numberInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    paddingVertical: 0,
    letterSpacing: 0.3
  },
  numberSuffix: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    marginRight: 6
  },
  numberSteppers: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 1,
    paddingLeft: 6,
    borderLeftWidth: 1,
    borderLeftColor: '#EEF1EF',
    height: 32
  },
  numberStepperButton: {
    width: 22,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  composerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4
  },
  composerButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  composerCancel: {
    backgroundColor: '#F4F6F5'
  },
  composerCancelText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14
  },
  composerSubmit: {
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    gap: 8
  },
  composerSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14
  },
  targetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E4E8E6',
    shadowColor: '#132016',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  targetIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F2F7F2',
    alignItems: 'center',
    justifyContent: 'center'
  },
  targetCopy: {
    flex: 1
  },
  targetEyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase'
  },
  targetTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2
  },
  targetSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2
  },
  targetClear: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F4F6F5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  pickerSheet: {
    maxHeight: PICKER_MAX_HEIGHT
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F4F6F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingVertical: 0
  },
  pickerList: {
    flexGrow: 0
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12
  },
  pickerRowSelected: {
    backgroundColor: '#EAF5EF'
  },
  pickerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F2F7F2',
    alignItems: 'center',
    justifyContent: 'center'
  },
  pickerAvatarText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 12
  },
  pickerCopy: {
    flex: 1
  },
  pickerName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  },
  pickerMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2
  },
  pickerEmpty: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24
  }
});
