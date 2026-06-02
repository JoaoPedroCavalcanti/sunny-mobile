import React, { useCallback, useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen } from '../components/AppScreen';
import { createNews, listNews } from '../api/news';
import type { News, NewsKind, Priority } from '../types/domain';
import { colors } from '../theme/colors';
import { usePermissions } from '../hooks/usePermissions';
import { extractErrorMessage } from '../utils/extractError';
import type { RootStackParamList } from '../navigation/types';

const SHEET_MIN_HEIGHT = Math.round(Dimensions.get('window').height * 0.6);

type FilterKey = 'all' | NewsKind;

type KindStyle = {
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
};

const KIND_STYLES: Record<NewsKind, KindStyle> = {
  NOTICE: {
    label: 'Aviso',
    iconName: 'clipboard-outline',
    color: '#0F7A43',
    bg: '#EAF5EF'
  },
  MAINTENANCE: {
    label: 'Manutencao',
    iconName: 'megaphone-outline',
    color: '#CD3131',
    bg: '#FBE3E3'
  },
  EVENT: {
    label: 'Evento',
    iconName: 'calendar-outline',
    color: '#3B7AC9',
    bg: '#E5EEF9'
  }
};

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'NOTICE', label: 'Avisos' },
  { key: 'MAINTENANCE', label: 'Manutencoes' },
  { key: 'EVENT', label: 'Eventos' }
];

const KIND_OPTIONS: Array<{ key: NewsKind; label: string }> = [
  { key: 'NOTICE', label: 'Aviso' },
  { key: 'MAINTENANCE', label: 'Manutencao' },
  { key: 'EVENT', label: 'Evento' }
];

type PriorityStyle = {
  label: string;
  helper: string;
  iconName: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
};

const PRIORITY_STYLES: Record<Priority, PriorityStyle> = {
  low: {
    label: 'Baixa',
    helper: 'Informativo',
    iconName: 'leaf-outline',
    color: '#0F7A43',
    bg: '#EAF5EF'
  },
  medium: {
    label: 'Media',
    helper: 'Atencao',
    iconName: 'alert-circle-outline',
    color: '#B07A1A',
    bg: '#FFF1D6'
  },
  high: {
    label: 'Alta',
    helper: 'Urgente',
    iconName: 'warning-outline',
    color: '#CD3131',
    bg: '#FBE3E3'
  }
};

const PRIORITY_OPTIONS: Priority[] = ['low', 'medium', 'high'];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  EMPLOYEE: 'Funcionario',
  RESIDENT: 'Morador'
};

function formatNewsDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const time = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);

  if (target.getTime() === today.getTime()) return `Hoje • ${time}`;
  if (target.getTime() === yesterday.getTime()) return `Ontem • ${time}`;

  const day = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  }).format(d);
  return `${day} • ${time}`;
}

type NewsNav = NativeStackNavigationProp<RootStackParamList, 'News'>;

export function NewsScreen() {
  const navigation = useNavigation<NewsNav>();
  const { isAdmin } = usePermissions();
  const [items, setItems] = useState<News[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');

  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<NewsKind>('NOTICE');
  const [priority, setPriority] = useState<Priority>('low');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await listNews();
      setItems(data);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const filteredItems = useMemo(() => {
    const sorted = [...items].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    if (filter === 'all') return sorted;
    return sorted.filter((item) => item.kind === filter);
  }, [items, filter]);

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainTabs');
    }
  }

  function openComposer() {
    setTitle('');
    setDescription('');
    setKind('NOTICE');
    setPriority('low');
    setComposerOpen(true);
  }

  async function handleCreate() {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle || !trimmedDescription) {
      Alert.alert(
        'Campos obrigatorios',
        'Informe o titulo e a descricao do comunicado.'
      );
      return;
    }

    try {
      setSubmitting(true);
      await createNews({
        title: trimmedTitle,
        description: trimmedDescription,
        kind,
        priority_level: priority
      });
      setComposerOpen(false);
      await loadData();
      Alert.alert('Comunicado publicado', 'O comunicado foi publicado com sucesso.');
    } catch (error) {
      Alert.alert('Falha ao publicar', extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppScreen onRefresh={loadData} refreshing={refreshing}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Comunicados</Text>
        {isAdmin ? (
          <Pressable
            onPress={openComposer}
            style={styles.createButton}
            hitSlop={8}
            accessibilityLabel="Criar comunicado"
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {FILTERS.map((f) => {
          const isActive = filter === f.key;
          return (
            <Pressable
              key={f.key}
              style={styles.tab}
              onPress={() => setFilter(f.key)}
              hitSlop={6}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {f.label}
              </Text>
              <View style={[styles.tabUnderline, isActive && styles.tabUnderlineActive]} />
            </Pressable>
          );
        })}
      </ScrollView>

      {filteredItems.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="newspaper-outline" size={26} color="#B6BAC3" />
          <Text style={styles.emptyText}>Nenhum comunicado por aqui ainda.</Text>
        </View>
      ) : (
        filteredItems.map((item) => {
          const style = KIND_STYLES[item.kind] ?? KIND_STYLES.NOTICE;
          const authorLabel = item.created_by.full_name?.trim();
          const roleLabel = ROLE_LABEL[item.created_by.role] ?? null;
          return (
            <Pressable
              key={item.id}
              style={styles.card}
              onPress={() => Alert.alert(item.title, item.description)}
            >
              <View style={[styles.cardIcon, { backgroundColor: style.bg }]}>
                <Ionicons name={style.iconName} size={22} color={style.color} />
              </View>
              <View style={styles.cardCopy}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={[styles.cardCategory, { color: style.color }]}>
                      {style.label}
                    </Text>
                    {item.priority_level && item.priority_level !== 'low' ? (
                      <View
                        style={[
                          styles.priorityPill,
                          { backgroundColor: PRIORITY_STYLES[item.priority_level].bg }
                        ]}
                      >
                        <Ionicons
                          name={PRIORITY_STYLES[item.priority_level].iconName}
                          size={10}
                          color={PRIORITY_STYLES[item.priority_level].color}
                        />
                        <Text
                          style={[
                            styles.priorityPillText,
                            { color: PRIORITY_STYLES[item.priority_level].color }
                          ]}
                        >
                          {PRIORITY_STYLES[item.priority_level].helper}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.cardDate}>{formatNewsDate(item.created_at)}</Text>
                </View>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.cardBody} numberOfLines={2}>
                  {item.description}
                </Text>
                {authorLabel ? (
                  <View style={styles.cardAuthorRow}>
                    <Ionicons name="person-circle-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.cardAuthor} numberOfLines={1}>
                      {authorLabel}
                      {roleLabel ? ` \u00b7 ${roleLabel}` : ''}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textPrimary}
                style={styles.cardChevron}
              />
            </Pressable>
          );
        })
      )}

      <Modal
        visible={composerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => (submitting ? null : setComposerOpen(false))}
      >
        <KeyboardAvoidingView
          style={styles.sheetWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => (submitting ? null : setComposerOpen(false))}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetIcon}>
                <Ionicons name="megaphone-outline" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetEyebrow}>Novo comunicado</Text>
                <Text style={styles.sheetTitle}>Publicar para o condominio</Text>
              </View>
              <Pressable
                onPress={() => setComposerOpen(false)}
                hitSlop={8}
                style={styles.sheetCloseButton}
                disabled={submitting}
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
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Titulo</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Ex: Manutencao do elevador"
                  placeholderTextColor="#B6BAC3"
                  maxLength={200}
                  style={styles.textInput}
                  editable={!submitting}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Descricao</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Detalhe o comunicado para os moradores."
                  placeholderTextColor="#B6BAC3"
                  multiline
                  textAlignVertical="top"
                  style={[styles.textInput, styles.textArea]}
                  editable={!submitting}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Tipo</Text>
                <View style={styles.segmented}>
                  {KIND_OPTIONS.map((opt) => {
                    const active = kind === opt.key;
                    const style = KIND_STYLES[opt.key];
                    return (
                      <Pressable
                        key={opt.key}
                        style={[
                          styles.segmentButton,
                          active && styles.segmentButtonActive
                        ]}
                        onPress={() => setKind(opt.key)}
                        disabled={submitting}
                      >
                        <Ionicons
                          name={style.iconName}
                          size={14}
                          color={active ? style.color : '#8D93A1'}
                        />
                        <Text
                          style={[
                            styles.segmentText,
                            active && { color: style.color, fontWeight: '800' }
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Importancia</Text>
                <View style={styles.priorityRow}>
                  {PRIORITY_OPTIONS.map((p) => {
                    const active = priority === p;
                    const style = PRIORITY_STYLES[p];
                    return (
                      <Pressable
                        key={p}
                        style={[
                          styles.priorityCard,
                          active && {
                            borderColor: style.color,
                            backgroundColor: style.bg
                          }
                        ]}
                        onPress={() => setPriority(p)}
                        disabled={submitting}
                      >
                        <Ionicons
                          name={style.iconName}
                          size={18}
                          color={active ? style.color : '#8D93A1'}
                        />
                        <Text
                          style={[
                            styles.priorityLabel,
                            active && { color: style.color }
                          ]}
                        >
                          {style.label}
                        </Text>
                        <Text
                          style={[
                            styles.priorityHelper,
                            active && { color: style.color, opacity: 0.85 }
                          ]}
                        >
                          {style.helper}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.composerActions}>
              <Pressable
                style={[styles.composerButton, styles.composerCancel]}
                onPress={() => setComposerOpen(false)}
                disabled={submitting}
              >
                <Text style={styles.composerCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.composerButton,
                  styles.composerSubmit,
                  submitting && styles.composerSubmitDisabled
                ]}
                onPress={handleCreate}
                disabled={submitting}
              >
                <Text style={styles.composerSubmitText}>
                  {submitting ? 'Publicando...' : 'Publicar'}
                </Text>
                {!submitting ? (
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                ) : null}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </AppScreen>
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
  createButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800'
  },
  tabsRow: {
    gap: 24,
    paddingVertical: 4,
    paddingHorizontal: 2
  },
  tab: {
    alignItems: 'center'
  },
  tabLabel: {
    color: '#9AA0AE',
    fontSize: 14,
    fontWeight: '600',
    paddingBottom: 8
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '800'
  },
  tabUnderline: {
    height: 2,
    width: 28,
    borderRadius: 1,
    backgroundColor: 'transparent'
  },
  tabUnderlineActive: {
    backgroundColor: colors.primary
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 36,
    borderRadius: 16,
    backgroundColor: '#FFFFFF'
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardCopy: {
    flex: 1,
    gap: 4
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  cardCategory: {
    fontSize: 12,
    fontWeight: '700'
  },
  cardDate: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500'
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800'
  },
  cardBody: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16
  },
  cardChevron: {
    alignSelf: 'center'
  },
  cardAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4
  },
  cardAuthor: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1
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
  sheetIcon: {
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
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2
  },
  sheetCloseButton: {
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
  sheetBody: {
    flexGrow: 0
  },
  sheetBodyContent: {
    gap: 14,
    paddingBottom: 4
  },
  field: {
    gap: 6
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700'
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E8E6',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600'
  },
  textArea: {
    minHeight: 110,
    paddingTop: 12
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 14,
    backgroundColor: '#F4F6F5',
    padding: 4,
    gap: 4
  },
  segmentButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#132016',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  segmentText: {
    color: '#7C8392',
    fontSize: 13,
    fontWeight: '600'
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: '800'
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
  composerSubmitDisabled: {
    opacity: 0.7
  },
  composerSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8
  },
  priorityCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E4E8E6',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF'
  },
  priorityLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800'
  },
  priorityHelper: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999
  },
  priorityPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  }
});
