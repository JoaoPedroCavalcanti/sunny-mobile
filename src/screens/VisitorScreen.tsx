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
  listVisitorGroups,
  listVisitors,
  scheduleVisitorGroup,
  updateVisitorGroup
} from '../api/visitors';
import { useAuthStore } from '../store/authStore';
import { extractErrorMessage } from '../utils/extractError';
import type { VisitorAccess, VisitorGroup } from '../types/domain';
import { colors } from '../theme/colors';
import { combineBrDateTime, maskBrDate, maskBrTime } from '../utils/date';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type OuterTab = 'upcoming' | 'history';
type InnerTab = 'visitors' | 'groups';

type StatusKey = 'authorized' | 'waiting' | 'completed' | 'cancelled';

type VisitorRow = {
  key: string;
  id: number;
  name: string;
  scheduledAt: string;
  allDay: boolean;
  apartment: string;
  status: StatusKey;
  isPast: boolean;
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

const STATUS_STYLES: Record<StatusKey, { label: string; color: string; bg: string }> = {
  authorized: { label: 'Autorizado', color: '#0F7A43', bg: '#E8F6EC' },
  waiting: { label: 'Aguardando', color: '#3B7AC9', bg: '#E5EEF9' },
  completed: { label: 'Concluida', color: '#5C6770', bg: '#EEF0F2' },
  cancelled: { label: 'Cancelada', color: '#CD3131', bg: '#FBE3E3' }
};

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

function toVisitorRow(item: VisitorAccess, fallbackApt: string): VisitorRow {
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
    allDay: Boolean(item.all_day),
    apartment: fallbackApt,
    status,
    isPast
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

function makeMemberKey() {
  return `m-${Math.random().toString(36).slice(2, 10)}`;
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

  const fallbackApartment = useMemo(() => {
    if (!currentUser?.apartment) return 'Apartamento';
    return currentUser.block
      ? `Apto ${currentUser.apartment}/${currentUser.block}`
      : `Apartamento ${currentUser.apartment}`;
  }, [currentUser?.apartment, currentUser?.block]);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [visitorsData, groupsData] = await Promise.all([
        listVisitors().catch(() => [] as VisitorAccess[]),
        listVisitorGroups().catch(() => [] as VisitorGroup[])
      ]);
      setItems(visitorsData);
      setGroups(groupsData);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const visitorRows = useMemo(
    () => items.map((v) => toVisitorRow(v, fallbackApartment)),
    [items, fallbackApartment]
  );

  const filteredVisitors = useMemo(() => {
    const wanted = outerTab === 'upcoming' ? false : true;
    return visitorRows
      .filter((r) => r.isPast === wanted)
      .sort(
        (a, b) =>
          new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
      );
  }, [visitorRows, outerTab]);

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
        'Data invalida',
        visitorAllDay
          ? 'Informe uma data valida (DD-MM-AAAA).'
          : 'Informe data e horario validos (DD-MM-AAAA e HH-MM).'
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
    setGroupMembers((prev) =>
      prev.length === 1 ? prev : prev.filter((m) => m.key !== key)
    );
  }

  function updateMemberRow(key: string, patch: Partial<Pick<MemberDraft, 'name' | 'email'>>) {
    setGroupMembers((prev) =>
      prev.map((m) => (m.key === key ? { ...m, ...patch } : m))
    );
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
      .map((m) => ({
        name: m.name,
        email: m.email ? m.email : undefined
      }));

    if (cleanMembers.length === 0) {
      Alert.alert('Membros obrigatorios', 'Inclua pelo menos um membro no grupo.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingGroup) {
        await updateVisitorGroup(editingGroup.id, {
          name: cleanName,
          members: cleanMembers
        });
      } else {
        await createVisitorGroup({ name: cleanName, members: cleanMembers });
      }
      setGroupSheetOpen(false);
      resetGroupSheet();
      await loadData();
      Alert.alert(
        editingGroup ? 'Grupo atualizado' : 'Grupo criado',
        editingGroup
          ? 'As alteracoes foram salvas.'
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
      `Deseja remover o grupo "${group.name}"? Visitas ja criadas a partir dele nao serao apagadas.`,
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

  function openGroupActions(group: VisitorGroup) {
    Alert.alert(group.name, undefined, [
      { text: 'Agendar visita', onPress: () => openScheduleSheet(group) },
      { text: 'Editar grupo', onPress: () => openEditGroup(group) },
      {
        text: 'Remover grupo',
        style: 'destructive',
        onPress: () => handleDeleteGroup(group)
      },
      { text: 'Cancelar', style: 'cancel' }
    ]);
  }

  async function submitSchedule() {
    if (!scheduleGroup) return;
    const scheduled = scheduleAllDay
      ? combineBrDateTime(scheduleDate, '00-00')
      : combineBrDateTime(scheduleDate, scheduleTime);
    if (!scheduled) {
      Alert.alert(
        'Data invalida',
        scheduleAllDay
          ? 'Informe uma data valida (DD-MM-AAAA).'
          : 'Informe data e horario validos (DD-MM-AAAA e HH-MM).'
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
          'Check-out invalido',
          'Informe data e horario validos para o check-out (DD-MM-AAAA e HH-MM).'
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      const created = await scheduleVisitorGroup(scheduleGroup.id, {
        scheduled_date: scheduled,
        all_day: scheduleAllDay || undefined,
        checkout_date_time: checkout ?? undefined,
        description: scheduleDescription.trim() || undefined
      });
      setScheduleSheetOpen(false);
      resetScheduleSheet();
      await loadData();
      Alert.alert(
        'Visita agendada',
        `${created.length} convite${created.length === 1 ? '' : 's'} enviado${
          created.length === 1 ? '' : 's'
        }.`
      );
    } catch (error) {
      Alert.alert('Falha ao agendar', extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const isVisitors = innerTab === 'visitors';
  const showEmpty = isVisitors ? filteredVisitors.length === 0 : groupRows.length === 0;

  return (
    <AppScreen onRefresh={loadData} refreshing={refreshing}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerSide} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Visitantes</Text>
        <View style={styles.headerSide} />
      </View>

      {isVisitors ? (
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
      ) : null}

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
            {isVisitors
              ? outerTab === 'upcoming'
                ? 'Nenhum visitante agendado.'
                : 'Nenhum registro no historico.'
              : 'Nenhum grupo cadastrado ainda.'}
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
        groupRows.map((row) => {
          const group = groups.find((g) => g.id === row.id);
          if (!group) return null;
          return (
            <GroupCard
              key={row.key}
              row={row}
              onPress={() => openScheduleSheet(group)}
              onLongPress={() => openGroupActions(group)}
            />
          );
        })
      )}

      <View style={styles.actionsBlock}>
        {isVisitors ? (
          <Pressable style={styles.primaryAction} onPress={openComposer}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Cadastrar visitante</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.primaryAction} onPress={openCreateGroup}>
            <Ionicons name="people" size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Cadastrar grupo de visitantes</Text>
          </Pressable>
        )}
      </View>

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
                    A visita ficara liberada das 00:00 ate 23:59 do dia.
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
                      label="Horario (HH-MM)"
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
                      <Pressable
                        onPress={() => removeMemberRow(member.key)}
                        hitSlop={6}
                      >
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
                  Sera criado 1 convite para cada um dos{' '}
                  {scheduleGroup.members.length} membros do grupo.
                </Text>
              ) : null}

              <View style={styles.toggleRow}>
                <View style={styles.toggleCopy}>
                  <Text style={styles.toggleLabel}>Dia inteiro</Text>
                  <Text style={styles.toggleHelp}>
                    Libera o acesso das 00:00 ate 23:59 do dia.
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
                      label="Horario (HH-MM)"
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
                label="Observacao (opcional)"
                value={scheduleDescription}
                onChangeText={setScheduleDescription}
                placeholder="Ex: Almoco de domingo"
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
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {row.name}
          </Text>
          {row.allDay && (
            <View style={styles.allDayBadge}>
              <Text style={styles.allDayBadgeText}>Dia inteiro</Text>
            </View>
          )}
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={13} color="#8D93A1" />
          <Text style={styles.metaText}>
            {row.allDay ? formatDateOnly(row.scheduledAt) : formatScheduled(row.scheduledAt)}
          </Text>
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

function GroupCard({
  row,
  onPress,
  onLongPress
}: {
  row: GroupRow;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const tone = pickAvatarTone(row.name);
  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={250}
    >
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
          <Ionicons name="time-outline" size={13} color="#8D93A1" />
          <Text style={styles.metaText}>
            Atualizado em {formatDateOnly(row.updatedAt)}
          </Text>
        </View>
      </View>
      <View style={styles.groupActionHint}>
        <Ionicons name="calendar-outline" size={16} color={colors.primary} />
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1
  },
  allDayBadge: {
    backgroundColor: '#FFF1D6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8
  },
  allDayBadgeText: {
    color: '#B07A1A',
    fontSize: 10,
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
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: 'center'
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700'
  },
  groupActionHint: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F7F1',
    alignItems: 'center',
    justifyContent: 'center'
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
