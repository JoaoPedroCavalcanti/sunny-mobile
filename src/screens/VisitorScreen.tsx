import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen } from '../components/AppScreen';
import {
  createVisitor,
  createVisitorGroup,
  deleteVisitor,
  deleteVisitorGroup,
  listVisitorGroupVisits,
  listVisitorGroups,
  listVisitors,
  scheduleVisitorGroup,
  updateVisitorGroup
} from '../api/visitors';
import { listUsers } from '../api/users';
import { useAuthStore } from '../store/authStore';
import { extractErrorMessage } from '../utils/extractError';
import type { User, VisitorAccess, VisitorGroup, VisitorStatus } from '../types/domain';
import { colors } from '../theme/colors';
import { combineBrDateTime, maskBrDate, maskBrTime } from '../utils/date';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type MainTab = 'upcoming' | 'history' | 'groups';
type StatusFilter = 'all' | VisitorStatus;

type VisitorRow = {
  key: string;
  id: number;
  name: string;
  scheduledAt: string;
  allDay: boolean;
  hostUserId: number | null;
  hostName: string | null;
  status: VisitorStatus;
  isGroup: boolean;
};

type GroupRow = {
  key: string;
  id: number;
  name: string;
  count: number;
  updatedAt: string;
};

type MemberDraft = {
  key: string;
  name: string;
  email: string;
};

const STATUS_META: Record<
  VisitorStatus,
  { label: string; dot: string; chipBg: string; chipColor: string }
> = {
  SCHEDULED: { label: 'Agendado', dot: '#3B7AC9', chipBg: '#E5EEF9', chipColor: '#1E4F8C' },
  CHECKED_IN: { label: 'Check-in', dot: '#0F7A43', chipBg: '#E8F6EC', chipColor: '#0C5F35' },
  CHECKED_OUT: { label: 'Check-out', dot: '#7B3DA0', chipBg: '#F3E7F8', chipColor: '#5C2A7E' },
  NO_SHOW: { label: 'Não compareceu', dot: '#E08A2A', chipBg: '#FBE9DC', chipColor: '#8A5212' },
  EXPIRED: { label: 'Expirado', dot: '#8D93A1', chipBg: '#EEF0F2', chipColor: '#5C6770' },
  CANCELLED: { label: 'Cancelado', dot: '#CD3131', chipBg: '#FBE3E3', chipColor: '#A52424' }
};

const STATUS_ORDER: VisitorStatus[] = [
  'SCHEDULED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'NO_SHOW',
  'EXPIRED',
  'CANCELLED'
];

const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: 'upcoming', label: 'Próximas visitas' },
  { key: 'history', label: 'Histórico' },
  { key: 'groups', label: 'Grupos de visitantes' }
];

function normalizeStatus(raw: string | undefined | null): VisitorStatus {
  const value = (raw ?? '').toString().trim().toUpperCase();
  if (
    value === 'SCHEDULED' ||
    value === 'CHECKED_IN' ||
    value === 'CHECKED_OUT' ||
    value === 'NO_SHOW' ||
    value === 'EXPIRED' ||
    value === 'CANCELLED'
  ) {
    return value;
  }
  return 'SCHEDULED';
}

function toVisitorRow(item: VisitorAccess, hostName: string | null): VisitorRow {
  const isGroup = item.visitor_group != null;
  return {
    key: `${isGroup ? 'gv' : 'v'}-${item.id}`,
    id: item.id,
    name: item.visitor_name || (isGroup ? 'Grupo de visitantes' : 'Visitante'),
    scheduledAt: item.scheduled_date,
    allDay: Boolean(item.all_day),
    hostUserId: item.host_user,
    hostName,
    status: normalizeStatus(item.status),
    isGroup
  };
}

function toGroupRow(item: VisitorGroup): GroupRow {
  return {
    key: `g-${item.id}`,
    id: item.id,
    name: item.name,
    count: item.members?.length ?? 0,
    updatedAt: item.updated_at
  };
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatRelativeDateTime(value: string, allDay: boolean) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  const today = startOfDay(new Date());
  const target = startOfDay(d);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

  let label = '';
  if (diffDays === 0) label = 'Hoje';
  else if (diffDays === 1) label = 'Amanhã';
  else if (diffDays === -1) label = 'Ontem';

  const dateStr = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d);
  const timeStr = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);

  const datePart = label ? `${label}, ${dateStr}` : dateStr;
  return allDay ? datePart : `${datePart} • ${timeStr}`;
}

function formatDateOnly(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d);
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function makeMemberKey() {
  return `m-${Math.random().toString(36).slice(2, 10)}`;
}

function getUserDisplayName(user: User | null | undefined) {
  if (!user) return null;
  const full = user.full_name?.trim();
  if (full) return full;
  const combined = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  if (combined) return combined;
  return user.username || null;
}

type VisitorsNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Visitantes'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function VisitorScreen() {
  const navigation = useNavigation<VisitorsNav>();
  const currentUser = useAuthStore((state) => state.user);
  const [items, setItems] = useState<VisitorAccess[]>([]);
  const [groups, setGroups] = useState<VisitorGroup[]>([]);
  const [hostsById, setHostsById] = useState<Record<number, string>>({});
  const [refreshing, setRefreshing] = useState(false);

  const [mainTab, setMainTab] = useState<MainTab>('upcoming');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);

  const [composerOpen, setComposerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [visitorDate, setVisitorDate] = useState('');
  const [visitorTime, setVisitorTime] = useState('');
  const [visitorDescription, setVisitorDescription] = useState('');
  const [visitorAllDay, setVisitorAllDay] = useState(false);

  const [groupSheetOpen, setGroupSheetOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<VisitorGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState<MemberDraft[]>([]);

  const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false);
  const [scheduleGroup, setScheduleGroup] = useState<VisitorGroup | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleCheckoutDate, setScheduleCheckoutDate] = useState('');
  const [scheduleCheckoutTime, setScheduleCheckoutTime] = useState('');
  const [scheduleAllDay, setScheduleAllDay] = useState(false);
  const [scheduleDescription, setScheduleDescription] = useState('');

  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [detailGroup, setDetailGroup] = useState<VisitorGroup | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);

  const isGroupsTab = mainTab === 'groups';
  const isUpcoming = mainTab === 'upcoming';

  const apiParams = useMemo(() => {
    const params: { period?: 'future' | 'past'; status?: VisitorStatus } = {};
    if (mainTab === 'upcoming') params.period = 'future';
    else if (mainTab === 'history') params.period = 'past';
    if (statusFilter !== 'all') params.status = statusFilter;
    return params;
  }, [mainTab, statusFilter]);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const fetchSolo = isGroupsTab
        ? Promise.resolve([] as VisitorAccess[])
        : listVisitors(apiParams).catch(() => [] as VisitorAccess[]);
      const fetchGroupVisits = isGroupsTab
        ? Promise.resolve([] as VisitorAccess[])
        : listVisitorGroupVisits(apiParams).catch(() => [] as VisitorAccess[]);
      const [soloData, groupVisitsData, groupsData, usersData] = await Promise.all([
        fetchSolo,
        fetchGroupVisits,
        listVisitorGroups().catch(() => [] as VisitorGroup[]),
        listUsers().catch(() => [] as User[])
      ]);
      setItems([...soloData, ...groupVisitsData]);
      setGroups(groupsData);

      const map: Record<number, string> = {};
      if (currentUser?.id) {
        const meName = getUserDisplayName(currentUser);
        if (meName) map[currentUser.id] = meName;
      }
      for (const u of usersData) {
        const name = getUserDisplayName(u);
        if (name && typeof u.id === 'number') map[u.id] = name;
      }
      setHostsById(map);
    } finally {
      setRefreshing(false);
    }
  }, [apiParams, currentUser, isGroupsTab]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const visitorRows = useMemo(() => {
    const rows = items.map((v) =>
      toVisitorRow(v, v.host_user != null ? hostsById[v.host_user] ?? null : null)
    );
    rows.sort((a, b) => {
      const aT = new Date(a.scheduledAt).getTime();
      const bT = new Date(b.scheduledAt).getTime();
      return isUpcoming ? aT - bT : bT - aT;
    });
    return rows;
  }, [items, hostsById, isUpcoming]);

  const groupRows = useMemo(
    () =>
      groups
        .map(toGroupRow)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [groups]
  );

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
    setVisitorAllDay(false);
  }

  function openComposer() {
    resetComposer();
    setComposerOpen(true);
  }

  function openCreateActions() {
    Alert.alert('Nova reserva', 'Selecione o tipo da reserva:', [
      { text: 'Reserva de visitante', onPress: openComposer },
      { text: 'Reserva de grupo', onPress: openGroupReservation },
      { text: 'Cancelar', style: 'cancel' }
    ]);
  }

  function openGroupReservation() {
    if (groups.length === 0) {
      Alert.alert(
        'Nenhum grupo cadastrado',
        'Crie um grupo de visitantes antes de fazer a reserva.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Criar grupo', onPress: openCreateGroup }
        ]
      );
      return;
    }
    setGroupPickerOpen(true);
  }

  function handleHeaderAdd() {
    if (isGroupsTab) {
      openCreateGroup();
    } else {
      openCreateActions();
    }
  }

  async function submitVisitor() {
    if (!visitorName.trim()) {
      Alert.alert('Dados incompletos', 'Informe o nome do visitante.');
      return;
    }
    const scheduled = visitorAllDay
      ? combineBrDateTime(visitorDate, '00-00')
      : combineBrDateTime(visitorDate, visitorTime);
    if (!scheduled) {
      Alert.alert(
        'Data inválida',
        visitorAllDay
          ? 'Informe uma data válida (DD-MM-AAAA).'
          : 'Informe data e horário válidos (DD-MM-AAAA e HH-MM).'
      );
      return;
    }

    try {
      setSubmitting(true);
      await createVisitor({
        visitor_name: visitorName.trim(),
        scheduled_date: scheduled,
        host_user: currentUser?.id ?? null,
        email: visitorEmail.trim() || undefined,
        description: visitorDescription.trim() || undefined,
        all_day: visitorAllDay || undefined
      });
      setComposerOpen(false);
      resetComposer();
      await loadData();
      Alert.alert('Visitante cadastrado', 'O acesso foi registrado com sucesso.');
    } catch (error) {
      Alert.alert('Falha ao cadastrar', extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  function openVisitorActions(row: VisitorRow) {
    Alert.alert(row.name, undefined, [
      {
        text: 'Cancelar visita',
        style: 'destructive',
        onPress: () => handleDeleteVisitor(row)
      },
      { text: 'Voltar', style: 'cancel' }
    ]);
  }

  async function handleDeleteVisitor(row: VisitorRow) {
    const message = row.isGroup
      ? `Deseja cancelar a visita do grupo "${row.name}"?`
      : `Deseja cancelar a visita de ${row.name}?`;
    Alert.alert('Cancelar visita', message, [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Cancelar visita',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteVisitor(row.id);
            await loadData();
          } catch (error) {
            Alert.alert('Falha ao cancelar', extractErrorMessage(error));
          }
        }
      }
    ]);
  }

  function resetGroupSheet() {
    setEditingGroup(null);
    setGroupName('');
    setGroupMembers([{ key: makeMemberKey(), name: '', email: '' }]);
  }

  function openCreateGroup() {
    resetGroupSheet();
    setGroupSheetOpen(true);
  }

  function openEditGroup(group: VisitorGroup) {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupMembers(
      (group.members ?? []).map((m) => ({
        key: makeMemberKey(),
        name: m.name,
        email: m.email ?? ''
      }))
    );
    setGroupSheetOpen(true);
  }

  function addMemberRow() {
    setGroupMembers((prev) => [...prev, { key: makeMemberKey(), name: '', email: '' }]);
  }

  function removeMemberRow(key: string) {
    setGroupMembers((prev) => (prev.length === 1 ? prev : prev.filter((m) => m.key !== key)));
  }

  function updateMemberRow(
    key: string,
    patch: Partial<Pick<MemberDraft, 'name' | 'email'>>
  ) {
    setGroupMembers((prev) => prev.map((m) => (m.key === key ? { ...m, ...patch } : m)));
  }

  async function submitGroup() {
    const cleanName = groupName.trim();
    if (!cleanName) {
      Alert.alert('Dados incompletos', 'Informe o nome do grupo.');
      return;
    }
    const cleanMembers = groupMembers
      .map((m) => ({ name: m.name.trim(), email: m.email.trim() }))
      .filter((m) => m.name.length > 0)
      .map((m) => ({ name: m.name, email: m.email ? m.email : undefined }));

    if (cleanMembers.length === 0) {
      Alert.alert('Membros obrigatórios', 'Inclua pelo menos um membro no grupo.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingGroup) {
        await updateVisitorGroup(editingGroup.id, { name: cleanName, members: cleanMembers });
      } else {
        await createVisitorGroup({ name: cleanName, members: cleanMembers });
      }
      setGroupSheetOpen(false);
      resetGroupSheet();
      await loadData();
      Alert.alert(
        editingGroup ? 'Grupo atualizado' : 'Grupo criado',
        editingGroup
          ? 'As alterações foram salvas.'
          : 'O grupo de visitantes foi criado com sucesso.'
      );
    } catch (error) {
      Alert.alert('Falha ao salvar grupo', extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteGroup(group: VisitorGroup) {
    Alert.alert(
      'Remover grupo',
      `Deseja remover o grupo "${group.name}"? Visitas já criadas a partir dele não serão apagadas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteVisitorGroup(group.id);
              await loadData();
            } catch (error) {
              Alert.alert('Falha ao remover', extractErrorMessage(error));
            }
          }
        }
      ]
    );
  }

  function resetScheduleSheet() {
    setScheduleGroup(null);
    setScheduleDate('');
    setScheduleTime('');
    setScheduleCheckoutDate('');
    setScheduleCheckoutTime('');
    setScheduleAllDay(false);
    setScheduleDescription('');
  }

  function openScheduleSheet(group: VisitorGroup) {
    if ((group.members?.length ?? 0) === 0) {
      Alert.alert(
        'Grupo vazio',
        'Adicione pelo menos um membro ao grupo antes de agendar.'
      );
      return;
    }
    resetScheduleSheet();
    setScheduleGroup(group);
    setScheduleSheetOpen(true);
  }

  function toggleGroupExpansion(groupId: number) {
    setExpandedGroupId((prev) => (prev === groupId ? null : groupId));
  }

  function openGroupDetails(group: VisitorGroup) {
    setDetailGroup(group);
  }

  function closeGroupDetails() {
    setDetailGroup(null);
  }

  function pickGroupForReservation(group: VisitorGroup) {
    setGroupPickerOpen(false);
    openScheduleSheet(group);
  }

  async function submitSchedule() {
    if (!scheduleGroup) return;
    const scheduled = scheduleAllDay
      ? combineBrDateTime(scheduleDate, '00-00')
      : combineBrDateTime(scheduleDate, scheduleTime);
    if (!scheduled) {
      Alert.alert(
        'Data inválida',
        scheduleAllDay
          ? 'Informe uma data válida (DD-MM-AAAA).'
          : 'Informe data e horário válidos (DD-MM-AAAA e HH-MM).'
      );
      return;
    }
    let checkout: string | null | undefined;
    if (!scheduleAllDay && (scheduleCheckoutDate || scheduleCheckoutTime)) {
      checkout = combineBrDateTime(
        scheduleCheckoutDate || scheduleDate,
        scheduleCheckoutTime || scheduleTime
      );
      if (!checkout) {
        Alert.alert(
          'Check-out inválido',
          'Informe data e horário válidos para o check-out (DD-MM-AAAA e HH-MM).'
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      await scheduleVisitorGroup(scheduleGroup.id, {
        scheduled_date: scheduled,
        all_day: scheduleAllDay || undefined,
        checkout_date_time: checkout ?? undefined,
        description: scheduleDescription.trim() || undefined
      });
      setScheduleSheetOpen(false);
      resetScheduleSheet();
      await loadData();
      Alert.alert('Visita agendada', 'O grupo foi agendado com sucesso.');
    } catch (error) {
      Alert.alert('Falha ao agendar', extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const statusLabels: Record<StatusFilter, string> = {
    all: 'Todos os status',
    SCHEDULED: STATUS_META.SCHEDULED.label,
    CHECKED_IN: STATUS_META.CHECKED_IN.label,
    CHECKED_OUT: STATUS_META.CHECKED_OUT.label,
    NO_SHOW: STATUS_META.NO_SHOW.label,
    EXPIRED: STATUS_META.EXPIRED.label,
    CANCELLED: STATUS_META.CANCELLED.label
  };

  const sectionTitle = isUpcoming ? 'Próximas visitas' : 'Histórico';
  const sectionEmptyText = isUpcoming
    ? 'Nenhuma visita agendada para os próximos dias.'
    : 'Nenhum registro no histórico ainda.';
  const groupsEmptyText = 'Nenhum grupo cadastrado ainda.';

  return (
    <AppScreen onRefresh={loadData} refreshing={refreshing}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerSide} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Visitantes</Text>
        <Pressable
          onPress={handleHeaderAdd}
          style={styles.headerSide}
          hitSlop={8}
        >
          <View style={styles.headerPlus}>
            <Ionicons name="add" size={18} color={colors.primary} />
          </View>
        </Pressable>
      </View>

      <View style={styles.mainTabs}>
        {MAIN_TABS.map((t) => {
          const isActive = mainTab === t.key;
          return (
            <Pressable
              key={t.key}
              style={styles.mainTab}
              onPress={() => setMainTab(t.key)}
            >
              <Text
                style={[styles.mainTabLabel, isActive && styles.mainTabLabelActive]}
                numberOfLines={1}
              >
                {t.label}
              </Text>
              <View
                style={[
                  styles.mainTabIndicator,
                  isActive && styles.mainTabIndicatorActive
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      {!isGroupsTab ? (
        <Pressable
          style={styles.statusFilter}
          onPress={() => setStatusPickerOpen(true)}
        >
          <Ionicons name="filter-outline" size={16} color={colors.textPrimary} />
          <Text style={styles.statusFilterLabel} numberOfLines={1}>
            {statusLabels[statusFilter]}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#8D93A1" />
        </Pressable>
      ) : null}

      {isGroupsTab ? (
        <View style={styles.listGroup}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Grupos de visitantes</Text>
            <View style={styles.sectionCountChip}>
              <Text style={styles.sectionCountText}>{groupRows.length}</Text>
            </View>
          </View>
          <Text style={styles.sectionSubtitle}>
            Gerencie os grupos e os visitantes que pertencem a eles.
          </Text>

          {groupRows.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={26} color="#B6BAC3" />
              <Text style={styles.emptyText}>{groupsEmptyText}</Text>
            </View>
          ) : (
            groupRows.map((row) => {
              const group = groups.find((g) => g.id === row.id);
              if (!group) return null;
              return (
                <GroupCard
                  key={row.key}
                  row={row}
                  group={group}
                  expanded={expandedGroupId === group.id}
                  onToggle={() => toggleGroupExpansion(group.id)}
                  onViewDetails={() => openGroupDetails(group)}
                  onEdit={() => openEditGroup(group)}
                  onDelete={() => handleDeleteGroup(group)}
                />
              );
            })
          )}

          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={colors.primary}
              />
            </View>
            <View style={styles.infoCopy}>
              <Text style={styles.infoTitle}>Sobre os grupos de visitantes</Text>
              <Text style={styles.infoText}>
                Grupos facilitam o agendamento frequente de visitas. Você pode
                adicionar, editar ou remover visitantes a qualquer momento.
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.listGroup}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{sectionTitle}</Text>
            <View style={styles.sectionCountChip}>
              <Text style={styles.sectionCountText}>{visitorRows.length}</Text>
            </View>
          </View>

          {visitorRows.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="person-outline" size={26} color="#B6BAC3" />
              <Text style={styles.emptyText}>{sectionEmptyText}</Text>
            </View>
          ) : (
            visitorRows.map((row) => (
              <VisitorCard
                key={row.key}
                row={row}
                onPress={() => openVisitorActions(row)}
                onLongPress={() => handleDeleteVisitor(row)}
              />
            ))
          )}
        </View>
      )}

      <Pressable style={styles.primaryAction} onPress={openCreateActions}>
        <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
        <Text style={styles.primaryActionText}>Nova reserva de visitante ou grupo</Text>
      </Pressable>

      <PickerSheet
        visible={statusPickerOpen}
        title="Filtrar por status"
        options={(Object.keys(statusLabels) as StatusFilter[]).map((k) => ({
          key: k,
          label: statusLabels[k],
          dot: k === 'all' ? undefined : STATUS_META[k as VisitorStatus].dot
        }))}
        selectedKey={statusFilter}
        onSelect={(k) => {
          setStatusFilter(k as StatusFilter);
          setStatusPickerOpen(false);
        }}
        onClose={() => setStatusPickerOpen(false)}
      />

      {/* New visitor modal */}
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
              <View style={styles.toggleRow}>
                <View style={styles.toggleCopy}>
                  <Text style={styles.toggleLabel}>Dia inteiro</Text>
                  <Text style={styles.toggleHelp}>
                    A visita ficará liberada das 00:00 até 23:59 do dia.
                  </Text>
                </View>
                <Switch
                  value={visitorAllDay}
                  onValueChange={setVisitorAllDay}
                  trackColor={{ false: '#D0D5D2', true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <View style={styles.row}>
                <View style={styles.flex1}>
                  <FormField
                    label="Data (DD-MM-AAAA)"
                    value={visitorDate}
                    onChangeText={(v) => setVisitorDate(maskBrDate(v))}
                    placeholder="31-12-2025"
                    autoCapitalize="none"
                    keyboardType="number-pad"
                  />
                </View>
                {!visitorAllDay && (
                  <View style={styles.flex1}>
                    <FormField
                      label="Horário (HH-MM)"
                      value={visitorTime}
                      onChangeText={(v) => setVisitorTime(maskBrTime(v))}
                      placeholder="19-30"
                      autoCapitalize="none"
                      keyboardType="number-pad"
                    />
                  </View>
                )}
              </View>
              <FormField
                label="Observação (opcional)"
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

      {/* Group create/edit modal */}
      <Modal
        visible={groupSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setGroupSheetOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.sheetWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.sheetBackdrop} onPress={() => setGroupSheetOpen(false)} />
          <View style={[styles.sheet, styles.sheetTall]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>
                {editingGroup ? 'Editar grupo' : 'Novo grupo'}
              </Text>
              <Pressable
                onPress={() => setGroupSheetOpen(false)}
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
                label="Nome do grupo"
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Ex: Familia Silva"
              />

              <View style={styles.membersHeader}>
                <Text style={styles.formLabel}>Membros</Text>
                <Pressable onPress={addMemberRow} hitSlop={6} style={styles.addMemberBtn}>
                  <Ionicons name="add" size={14} color={colors.primary} />
                  <Text style={styles.addMemberText}>Adicionar</Text>
                </Pressable>
              </View>

              {groupMembers.map((member, index) => (
                <View key={member.key} style={styles.memberCard}>
                  <View style={styles.memberCardHeader}>
                    <Text style={styles.memberCardTitle}>Membro {index + 1}</Text>
                    {groupMembers.length > 1 && (
                      <Pressable onPress={() => removeMemberRow(member.key)} hitSlop={6}>
                        <Ionicons name="trash-outline" size={16} color="#CD3131" />
                      </Pressable>
                    )}
                  </View>
                  <TextInput
                    value={member.name}
                    onChangeText={(text) => updateMemberRow(member.key, { name: text })}
                    placeholder="Nome"
                    placeholderTextColor="#B6BAC3"
                    style={styles.formInput}
                  />
                  <TextInput
                    value={member.email}
                    onChangeText={(text) => updateMemberRow(member.key, { email: text })}
                    placeholder="E-mail (opcional)"
                    placeholderTextColor="#B6BAC3"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={[styles.formInput, { marginTop: 8 }]}
                  />
                </View>
              ))}
            </ScrollView>

            <View style={styles.sheetActions}>
              <Pressable
                style={[styles.sheetButton, styles.sheetCancel]}
                onPress={() => setGroupSheetOpen(false)}
                disabled={submitting}
              >
                <Text style={styles.sheetCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.sheetButton, styles.sheetSubmit]}
                onPress={submitGroup}
                disabled={submitting}
              >
                <Text style={styles.sheetSubmitText}>
                  {submitting ? 'Salvando...' : editingGroup ? 'Salvar' : 'Criar grupo'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Schedule group modal */}
      <Modal
        visible={scheduleSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setScheduleSheetOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.sheetWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => setScheduleSheetOpen(false)}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>
                Agendar {scheduleGroup?.name ?? 'grupo'}
              </Text>
              <Pressable
                onPress={() => setScheduleSheetOpen(false)}
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
              {scheduleGroup ? (
                <Text style={styles.scheduleInfo}>
                  O grupo entra como 1 visita, com {scheduleGroup.members.length}{' '}
                  {scheduleGroup.members.length === 1 ? 'membro' : 'membros'} usando o
                  mesmo link de check-in.
                </Text>
              ) : null}

              <View style={styles.toggleRow}>
                <View style={styles.toggleCopy}>
                  <Text style={styles.toggleLabel}>Dia inteiro</Text>
                  <Text style={styles.toggleHelp}>
                    Libera o acesso das 00:00 até 23:59 do dia.
                  </Text>
                </View>
                <Switch
                  value={scheduleAllDay}
                  onValueChange={setScheduleAllDay}
                  trackColor={{ false: '#D0D5D2', true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.row}>
                <View style={styles.flex1}>
                  <FormField
                    label="Data (DD-MM-AAAA)"
                    value={scheduleDate}
                    onChangeText={(v) => setScheduleDate(maskBrDate(v))}
                    placeholder="31-12-2025"
                    autoCapitalize="none"
                    keyboardType="number-pad"
                  />
                </View>
                {!scheduleAllDay && (
                  <View style={styles.flex1}>
                    <FormField
                      label="Horário (HH-MM)"
                      value={scheduleTime}
                      onChangeText={(v) => setScheduleTime(maskBrTime(v))}
                      placeholder="19-30"
                      autoCapitalize="none"
                      keyboardType="number-pad"
                    />
                  </View>
                )}
              </View>

              {!scheduleAllDay && (
                <View style={styles.row}>
                  <View style={styles.flex1}>
                    <FormField
                      label="Check-out data (opcional)"
                      value={scheduleCheckoutDate}
                      onChangeText={(v) => setScheduleCheckoutDate(maskBrDate(v))}
                      placeholder="31-12-2025"
                      autoCapitalize="none"
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.flex1}>
                    <FormField
                      label="Check-out hora"
                      value={scheduleCheckoutTime}
                      onChangeText={(v) => setScheduleCheckoutTime(maskBrTime(v))}
                      placeholder="22-00"
                      autoCapitalize="none"
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              )}

              <FormField
                label="Observação (opcional)"
                value={scheduleDescription}
                onChangeText={setScheduleDescription}
                placeholder="Ex: Almoço de domingo"
                multiline
              />
            </ScrollView>

            <View style={styles.sheetActions}>
              <Pressable
                style={[styles.sheetButton, styles.sheetCancel]}
                onPress={() => setScheduleSheetOpen(false)}
                disabled={submitting}
              >
                <Text style={styles.sheetCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.sheetButton, styles.sheetSubmit]}
                onPress={submitSchedule}
                disabled={submitting}
              >
                <Text style={styles.sheetSubmitText}>
                  {submitting ? 'Enviando...' : 'Agendar'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Group reservation picker */}
      <Modal
        visible={groupPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setGroupPickerOpen(false)}
      >
        <View style={styles.sheetWrapper}>
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => setGroupPickerOpen(false)}
          />
          <View style={styles.pickerSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>Escolha o grupo</Text>
              <Pressable
                onPress={() => setGroupPickerOpen(false)}
                hitSlop={8}
                style={styles.sheetClose}
              >
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>
            <Text style={styles.sectionSubtitle}>
              Selecione um grupo cadastrado para agendar a visita.
            </Text>
            <ScrollView
              style={{ maxHeight: 360 }}
              contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {groups.map((g) => (
                <Pressable
                  key={g.id}
                  style={styles.groupPickerOption}
                  onPress={() => pickGroupForReservation(g)}
                >
                  <View style={styles.avatar}>
                    <Ionicons name="people" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {g.name}
                    </Text>
                    <Text style={styles.metaText} numberOfLines={1}>
                      {g.members.length}{' '}
                      {g.members.length === 1 ? 'pessoa' : 'pessoas'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#8D93A1" />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Group details modal */}
      <Modal
        visible={detailGroup != null}
        transparent
        animationType="slide"
        onRequestClose={closeGroupDetails}
      >
        <View style={styles.sheetWrapper}>
          <Pressable style={styles.sheetBackdrop} onPress={closeGroupDetails} />
          <View style={[styles.sheet, styles.sheetTall]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>
                {detailGroup?.name ?? 'Detalhes do grupo'}
              </Text>
              <Pressable
                onPress={closeGroupDetails}
                hitSlop={8}
                style={styles.sheetClose}
              >
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.sheetBody}
              contentContainerStyle={styles.sheetBodyContent}
              showsVerticalScrollIndicator={false}
            >
              {detailGroup ? (
                <>
                  <View style={styles.detailRow}>
                    <Ionicons name="people-outline" size={16} color="#8D93A1" />
                    <Text style={styles.detailRowText}>
                      {detailGroup.members.length}{' '}
                      {detailGroup.members.length === 1 ? 'pessoa' : 'pessoas'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={16} color="#8D93A1" />
                    <Text style={styles.detailRowText}>
                      Criado em {formatDateOnly(detailGroup.created_at)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="refresh-outline" size={16} color="#8D93A1" />
                    <Text style={styles.detailRowText}>
                      Atualizado em {formatDateOnly(detailGroup.updated_at)}
                    </Text>
                  </View>

                  <Text style={[styles.groupMembersLabel, { marginTop: 4 }]}>
                    Visitantes do grupo
                  </Text>
                  {detailGroup.members.length === 0 ? (
                    <Text style={styles.groupMembersEmpty}>
                      Nenhum visitante neste grupo.
                    </Text>
                  ) : (
                    detailGroup.members.map((member) => (
                      <View key={member.id} style={styles.memberRow}>
                        <View style={styles.memberAvatar}>
                          <Text style={styles.memberAvatarText}>
                            {getInitials(member.name)}
                          </Text>
                        </View>
                        <View style={styles.memberCopy}>
                          <Text style={styles.memberName} numberOfLines={1}>
                            {member.name}
                          </Text>
                          {member.email ? (
                            <Text style={styles.memberEmail} numberOfLines={1}>
                              {member.email}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    ))
                  )}
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

type PickerOption = { key: string; label: string; dot?: string };

type PickerSheetProps = {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
  onClose: () => void;
};

function PickerSheet({
  visible,
  title,
  options,
  selectedKey,
  onSelect,
  onClose
}: PickerSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetWrapper}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View style={styles.pickerSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          <View style={{ height: 8 }} />
          {options.map((opt) => {
            const isSelected = opt.key === selectedKey;
            return (
              <Pressable
                key={opt.key}
                style={[styles.pickerOption, isSelected && styles.pickerOptionActive]}
                onPress={() => onSelect(opt.key)}
              >
                {opt.dot ? (
                  <View style={[styles.legendDot, { backgroundColor: opt.dot }]} />
                ) : (
                  <View style={styles.pickerDotPlaceholder} />
                )}
                <Text
                  style={[
                    styles.pickerOptionLabel,
                    isSelected && styles.pickerOptionLabelActive
                  ]}
                >
                  {opt.label}
                </Text>
                {isSelected ? (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
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
  onPress,
  onLongPress
}: {
  row: VisitorRow;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const meta = STATUS_META[row.status];
  const dateLabel = formatRelativeDateTime(row.scheduledAt, row.allDay);
  const hostLabel = row.hostName ? `Morador: ${row.hostName}` : 'Morador: -';

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
    >
      <View style={styles.avatar}>
        {row.isGroup ? (
          <Ionicons name="people" size={20} color={colors.primaryDark} />
        ) : (
          <Text style={styles.avatarText}>{getInitials(row.name)}</Text>
        )}
      </View>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {row.name}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={13} color="#8D93A1" />
          <Text style={styles.metaText} numberOfLines={1}>
            {dateLabel}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="person-outline" size={13} color="#8D93A1" />
          <Text style={styles.metaText} numberOfLines={1}>
            {hostLabel}
          </Text>
        </View>
      </View>
      <View style={styles.cardSide}>
        <View style={[styles.statusChip, { backgroundColor: meta.chipBg }]}>
          <Text style={[styles.statusText, { color: meta.chipColor }]}>
            {meta.label}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#8D93A1" />
      </View>
    </Pressable>
  );
}

type GroupCardProps = {
  row: GroupRow;
  group: VisitorGroup;
  expanded: boolean;
  onToggle: () => void;
  onViewDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

function GroupCard({
  row,
  group,
  expanded,
  onToggle,
  onViewDetails,
  onEdit,
  onDelete
}: GroupCardProps) {
  return (
    <View style={styles.groupCard}>
      <Pressable style={styles.groupCardHead} onPress={onToggle}>
        <View style={styles.avatar}>
          <Ionicons name="people" size={20} color={colors.primary} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {row.name}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={13} color="#8D93A1" />
            <Text style={styles.metaText}>
              {row.count} {row.count === 1 ? 'pessoa' : 'pessoas'}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color="#8D93A1" />
            <Text style={styles.metaText}>
              Atualizado em {formatDateOnly(row.updatedAt)}
            </Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#8D93A1"
        />
      </Pressable>

      {expanded ? (
        <View style={styles.groupCardBody}>
          <View style={styles.groupCardActions}>
            <Pressable style={styles.groupAction} onPress={onViewDetails}>
              <Ionicons name="eye-outline" size={16} color={colors.primary} />
              <Text style={styles.groupActionText}>Ver detalhes</Text>
            </Pressable>
            <View style={styles.groupActionDivider} />
            <Pressable style={styles.groupAction} onPress={onEdit}>
              <Ionicons name="pencil-outline" size={16} color={colors.primary} />
              <Text style={styles.groupActionText}>Editar</Text>
            </Pressable>
            <View style={styles.groupActionDivider} />
            <Pressable style={styles.groupAction} onPress={onDelete}>
              <Ionicons name="trash-outline" size={16} color="#CD3131" />
              <Text style={[styles.groupActionText, styles.groupActionTextDanger]}>
                Excluir
              </Text>
            </Pressable>
          </View>

          <Text style={styles.groupMembersLabel}>Visitantes do grupo</Text>
          {group.members.length === 0 ? (
            <Text style={styles.groupMembersEmpty}>Nenhum visitante neste grupo.</Text>
          ) : (
            group.members.map((member) => (
              <View key={member.id} style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {getInitials(member.name)}
                  </Text>
                </View>
                <View style={styles.memberCopy}>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {member.name}
                  </Text>
                  {member.email ? (
                    <Text style={styles.memberEmail} numberOfLines={1}>
                      {member.email}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>
      ) : null}
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
  headerPlus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  mainTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1EF'
  },
  mainTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8
  },
  mainTabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9AA0AE',
    paddingBottom: 8,
    textAlign: 'center'
  },
  mainTabLabelActive: {
    color: colors.primary,
    fontWeight: '800'
  },
  mainTabIndicator: {
    height: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: 'transparent'
  },
  mainTabIndicatorActive: {
    backgroundColor: colors.primary
  },
  statusFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E8E6'
  },
  statusFilterLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary
  },
  listGroup: {
    gap: 10
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800'
  },
  sectionCountChip: {
    minWidth: 24,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 11,
    backgroundColor: '#E8F6EC',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sectionCountText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '800'
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
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 16
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D9ECDF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontWeight: '800',
    fontSize: 13,
    color: colors.primaryDark
  },
  cardCopy: {
    flex: 1,
    gap: 3
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 12,
    flexShrink: 1
  },
  cardSide: {
    alignItems: 'flex-end',
    gap: 8
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700'
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  groupActionHint: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F7F1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    paddingHorizontal: 2,
    marginBottom: 4
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    shadowColor: '#132016',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    overflow: 'hidden'
  },
  groupCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14
  },
  groupCardBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10
  },
  groupCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9F7',
    borderRadius: 12,
    paddingVertical: 6
  },
  groupAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8
  },
  groupActionText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700'
  },
  groupActionTextDanger: {
    color: '#CD3131'
  },
  groupActionDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#E4E8E6',
    marginVertical: 4
  },
  groupMembersLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2
  },
  groupMembersEmpty: {
    color: colors.textMuted,
    fontSize: 12
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F0'
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5F1EA',
    alignItems: 'center',
    justifyContent: 'center'
  },
  memberAvatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark
  },
  memberCopy: {
    flex: 1,
    gap: 2
  },
  memberName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700'
  },
  memberEmail: {
    color: colors.textMuted,
    fontSize: 11
  },
  infoCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#F4F8F4',
    borderRadius: 14,
    padding: 12,
    marginTop: 4
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E1EFE3',
    alignItems: 'center',
    justifyContent: 'center'
  },
  infoCopy: {
    flex: 1,
    gap: 4
  },
  infoTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800'
  },
  infoText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16
  },
  groupPickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F7F9F7',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  detailRowText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600'
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
    elevation: 5,
    marginTop: 4
  },
  primaryActionText: {
    color: '#FFFFFF',
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
  sheetTall: {
    maxHeight: '88%'
  },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 4
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12
  },
  pickerOptionActive: {
    backgroundColor: '#F4F8F4'
  },
  pickerOptionLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600'
  },
  pickerOptionLabelActive: {
    color: colors.primary,
    fontWeight: '800'
  },
  pickerDotPlaceholder: {
    width: 8,
    height: 8
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
  scheduleInfo: {
    backgroundColor: '#F4F8F4',
    color: colors.primaryDark,
    padding: 12,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600'
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9F7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12
  },
  toggleCopy: {
    flex: 1,
    gap: 2
  },
  toggleLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  },
  toggleHelp: {
    color: colors.textMuted,
    fontSize: 11
  },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F1F7F1',
    borderRadius: 10
  },
  addMemberText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700'
  },
  memberCard: {
    backgroundColor: '#F7F9F7',
    borderRadius: 12,
    padding: 12,
    gap: 4
  },
  memberCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  memberCardTitle: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700'
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
