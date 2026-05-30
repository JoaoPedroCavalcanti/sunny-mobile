import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import { Ionicons } from '@expo/vector-icons';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen } from '../components/AppScreen';
import { createVisitor, deleteVisitor, listVisitors } from '../api/visitors';
import { useAuthStore } from '../store/authStore';
import { extractErrorMessage } from '../utils/extractError';
import type { VisitorAccess } from '../types/domain';
import { colors } from '../theme/colors';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type OuterTab = 'upcoming' | 'history';
type InnerTab = 'visitors' | 'groups';

type StatusKey = 'authorized' | 'waiting' | 'completed' | 'cancelled';

type VisitorRow = {
  key: string;
  id: number;
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

// Backend nao expoe endpoint de grupos de visitantes ainda; mantemos mock.
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
    id: item.id,
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

function combineDateTime(dateStr: string, timeStr: string): string | null {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return null;
  const [hourPart = '0', minutePart = '0'] = (timeStr || '00:00').split(':');
  const hours = Number(hourPart);
  const minutes = Number(minutePart);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

type VisitorsNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Visitantes'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function VisitorScreen() {
  const navigation = useNavigation<VisitorsNav>();
  const currentUser = useAuthStore((state) => state.user);
  const [items, setItems] = useState<VisitorAccess[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [outerTab, setOuterTab] = useState<OuterTab>('upcoming');
  const [innerTab, setInnerTab] = useState<InnerTab>('visitors');

  const [composerOpen, setComposerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [visitorDate, setVisitorDate] = useState('');
  const [visitorTime, setVisitorTime] = useState('');
  const [visitorDescription, setVisitorDescription] = useState('');

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

  function resetComposer() {
    setVisitorName('');
    setVisitorEmail('');
    setVisitorDate('');
    setVisitorTime('');
    setVisitorDescription('');
  }

  function openComposer() {
    resetComposer();
    setComposerOpen(true);
  }

  async function submitVisitor() {
    if (!visitorName.trim()) {
      Alert.alert('Dados incompletos', 'Informe o nome do visitante.');
      return;
    }
    const scheduled = combineDateTime(visitorDate, visitorTime);
    if (!scheduled) {
      Alert.alert('Data invalida', 'Informe data e horario validos (AAAA-MM-DD e HH:MM).');
      return;
    }

    try {
      setSubmitting(true);
      await createVisitor({
        visitor_name: visitorName.trim(),
        scheduled_date: scheduled,
        host_user: currentUser?.id ?? null,
        email: visitorEmail.trim() || undefined,
        description: visitorDescription.trim() || undefined
      });
      setComposerOpen(false);
      resetComposer();
      await loadData();
    } catch (error) {
      Alert.alert('Falha ao cadastrar', extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteVisitor(row: VisitorRow) {
    Alert.alert(
      'Remover visitante',
      `Deseja remover ${row.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteVisitor(row.id);
              await loadData();
            } catch (error) {
              Alert.alert('Falha ao remover', extractErrorMessage(error));
            }
          }
        }
      ]
    );
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
        filteredVisitors.map((row) => (
          <VisitorCard
            key={row.key}
            row={row}
            onLongPress={() => handleDeleteVisitor(row)}
          />
        ))
      ) : (
        filteredGroups.map((row) => <GroupCard key={row.key} row={row} />)
      )}

      <View style={styles.actionsBlock}>
        <Pressable style={styles.primaryAction} onPress={openComposer}>
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
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>Novo visitante</Text>
              <Pressable
                onPress={() => setComposerOpen(false)}
                hitSlop={8}
                style={styles.sheetClose}
              >
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.sheetBody}
              contentContainerStyle={styles.sheetBodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <FormField
                label="Nome do visitante"
                value={visitorName}
                onChangeText={setVisitorName}
                placeholder="Ex: Maria Souza"
              />
              <FormField
                label="E-mail (opcional)"
                value={visitorEmail}
                onChangeText={setVisitorEmail}
                placeholder="visitante@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={styles.row}>
                <View style={styles.flex1}>
                  <FormField
                    label="Data (AAAA-MM-DD)"
                    value={visitorDate}
                    onChangeText={setVisitorDate}
                    placeholder="2025-12-31"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.flex1}>
                  <FormField
                    label="Horario (HH:MM)"
                    value={visitorTime}
                    onChangeText={setVisitorTime}
                    placeholder="19:30"
                    autoCapitalize="none"
                  />
                </View>
              </View>
              <FormField
                label="Observacao (opcional)"
                value={visitorDescription}
                onChangeText={setVisitorDescription}
                placeholder="Detalhes da visita"
                multiline
              />
            </ScrollView>

            <View style={styles.sheetActions}>
              <Pressable
                style={[styles.sheetButton, styles.sheetCancel]}
                onPress={() => setComposerOpen(false)}
                disabled={submitting}
              >
                <Text style={styles.sheetCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.sheetButton, styles.sheetSubmit]}
                onPress={submitVisitor}
                disabled={submitting}
              >
                <Text style={styles.sheetSubmitText}>
                  {submitting ? 'Enviando...' : 'Cadastrar'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </AppScreen>
  );
}

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
};

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  multiline
}: FormFieldProps) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#B6BAC3"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        style={[styles.formInput, multiline && styles.formInputMultiline]}
      />
    </View>
  );
}

function VisitorCard({
  row,
  onLongPress
}: {
  row: VisitorRow;
  onLongPress: () => void;
}) {
  const tone = pickAvatarTone(row.name);
  const statusStyle = STATUS_STYLES[row.status];
  return (
    <Pressable style={styles.card} onLongPress={onLongPress} delayLongPress={250}>
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
    </Pressable>
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
    gap: 14,
    minHeight: 420
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D8DCDA',
    marginBottom: 6
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800'
  },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4F6F5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sheetBody: {
    flexGrow: 0
  },
  sheetBodyContent: {
    gap: 12,
    paddingBottom: 4
  },
  formField: {
    gap: 6
  },
  formLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600'
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E8E6',
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 46,
    color: colors.textPrimary,
    fontSize: 14
  },
  formInputMultiline: {
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 80,
    textAlignVertical: 'top'
  },
  row: {
    flexDirection: 'row',
    gap: 10
  },
  flex1: {
    flex: 1
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10
  },
  sheetButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sheetCancel: {
    backgroundColor: '#F4F6F5'
  },
  sheetCancelText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14
  },
  sheetSubmit: {
    backgroundColor: colors.primaryDark
  },
  sheetSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14
  }
});
