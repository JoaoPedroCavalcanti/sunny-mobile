import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen } from '../components/AppScreen';
import { colors } from '../theme/colors';
import { getMe, patchMe } from '../api/users';
import { useAuthStore } from '../store/authStore';
import { useProfileExtrasStore } from '../store/profileExtraStore';
import { extractErrorMessage } from '../utils/extractError';
import type { ProfileStackParamList } from '../navigation/types';

type MyDataNav = NativeStackNavigationProp<ProfileStackParamList, 'MyData'>;

type FieldKey =
  | 'fullName'
  | 'birthDate'
  | 'document'
  | 'phone'
  | 'email'
  | 'apartment'
  | 'block';

type FieldDef = {
  key: FieldKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

const SECTIONS: Array<{ title: string; fields: FieldDef[] }> = [
  {
    title: 'Informacoes pessoais',
    fields: [
      {
        key: 'fullName',
        label: 'Nome completo',
        icon: 'person-outline',
        placeholder: 'Seu nome completo',
        autoCapitalize: 'words'
      },
      {
        key: 'birthDate',
        label: 'Data de nascimento',
        icon: 'calendar-outline',
        placeholder: 'DD/MM/AAAA',
        keyboardType: 'number-pad'
      },
      {
        key: 'document',
        label: 'CPF',
        icon: 'card-outline',
        placeholder: '000.000.000-00',
        keyboardType: 'number-pad'
      }
    ]
  },
  {
    title: 'Contato',
    fields: [
      {
        key: 'phone',
        label: 'Telefone',
        icon: 'call-outline',
        placeholder: '(00) 00000-0000',
        keyboardType: 'phone-pad'
      },
      {
        key: 'email',
        label: 'E-mail',
        icon: 'mail-outline',
        placeholder: 'seu@email.com',
        keyboardType: 'email-address',
        autoCapitalize: 'none'
      }
    ]
  },
  {
    title: 'Endereco',
    fields: [
      {
        key: 'apartment',
        label: 'Apartamento/Unidade',
        icon: 'location-outline',
        placeholder: 'Apartamento 101'
      },
      {
        key: 'block',
        label: 'Bloco/Torre',
        icon: 'business-outline',
        placeholder: 'Torre A'
      }
    ]
  }
];

const REMOTE_FIELD_MAP: Record<
  FieldKey,
  'full_name' | 'birth_date' | 'cpf' | 'phone' | 'email' | 'apartment' | 'block'
> = {
  fullName: 'full_name',
  birthDate: 'birth_date',
  document: 'cpf',
  phone: 'phone',
  email: 'email',
  apartment: 'apartment',
  block: 'block'
};

const LOCAL_FALLBACK_MAP: Partial<Record<FieldKey, 'birthDate' | 'document' | 'phone' | 'apartment' | 'block'>> = {
  birthDate: 'birthDate',
  document: 'document',
  phone: 'phone',
  apartment: 'apartment',
  block: 'block'
};

function formatBirthDateForDisplay(value: string | null | undefined): string {
  if (!value) return '';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, yyyy, mm, dd] = match;
    return `${dd}/${mm}/${yyyy}`;
  }
  return value;
}

function birthDateToApi(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const display = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (display) {
    const [, dd, mm, yyyy] = display;
    return `${yyyy}-${mm}-${dd}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return null;
}

export function MyDataScreen() {
  const navigation = useNavigation<MyDataNav>();
  const { user, setUser } = useAuthStore();
  const extras = useProfileExtrasStore((state) => state.extras);
  const setExtraField = useProfileExtrasStore((state) => state.setField);

  const [loadingMe, setLoadingMe] = useState(false);
  const [editingField, setEditingField] = useState<FieldDef | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoadingMe(true);
    getMe()
      .then((me) => {
        if (mounted) setUser(me);
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setLoadingMe(false);
      });
    return () => {
      mounted = false;
    };
  }, [setUser]);

  function handleBack() {
    if (navigation.canGoBack()) navigation.goBack();
  }

  function valueOf(field: FieldDef): string {
    if (!user) {
      const localKey = LOCAL_FALLBACK_MAP[field.key];
      return localKey ? extras[localKey] ?? '' : '';
    }
    switch (field.key) {
      case 'fullName': {
        if (user.full_name) return user.full_name;
        const composed = [user.first_name, user.last_name]
          .filter(Boolean)
          .join(' ')
          .trim();
        return composed;
      }
      case 'email':
        return user.email ?? '';
      case 'birthDate':
        return formatBirthDateForDisplay(user.birth_date) || extras.birthDate || '';
      case 'document':
        return user.cpf ?? extras.document ?? '';
      case 'phone':
        return user.phone ?? extras.phone ?? '';
      case 'apartment':
        return user.apartment ?? extras.apartment ?? '';
      case 'block':
        return user.block ?? extras.block ?? '';
      default:
        return '';
    }
  }

  function openEditor(field: FieldDef) {
    setDraftValue(valueOf(field));
    setEditingField(field);
  }

  function closeEditor() {
    if (submitting) return;
    setEditingField(null);
    setDraftValue('');
  }

  async function saveDraft() {
    if (!editingField) return;
    const rawValue = draftValue.trim();

    if (editingField.key === 'email' && !rawValue) {
      Alert.alert('E-mail invalido', 'Informe um e-mail valido.');
      return;
    }

    let payloadValue: string = rawValue;
    if (editingField.key === 'birthDate') {
      const apiDate = birthDateToApi(rawValue);
      if (apiDate === null) {
        Alert.alert('Data invalida', 'Informe a data no formato DD/MM/AAAA.');
        return;
      }
      payloadValue = apiDate;
    }

    const remoteKey = REMOTE_FIELD_MAP[editingField.key];

    try {
      setSubmitting(true);
      const updated = await patchMe({ [remoteKey]: payloadValue });
      setUser(updated);

      const localKey = LOCAL_FALLBACK_MAP[editingField.key];
      if (localKey) {
        setExtraField(localKey, rawValue);
      }

      setEditingField(null);
      setDraftValue('');
    } catch (error) {
      Alert.alert('Falha ao atualizar', extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerSide} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Meus dados</Text>
          {loadingMe ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : null}
        </View>
        <View style={styles.headerSide} />
      </View>

      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.card}>
            {section.fields.map((field, idx) => {
              const value = valueOf(field);
              return (
                <Pressable
                  key={field.key}
                  style={[
                    styles.row,
                    idx !== section.fields.length - 1 && styles.rowDivider
                  ]}
                  onPress={() => openEditor(field)}
                >
                  <View style={styles.rowIcon}>
                    <Ionicons name={field.icon} size={20} color={colors.primary} />
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowLabel}>{field.label}</Text>
                    <Text
                      style={[styles.rowValue, !value && styles.rowValueEmpty]}
                      numberOfLines={1}
                    >
                      {value || 'Nao informado'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#B6BAC3" />
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <View style={styles.notice}>
        <View style={styles.noticeIcon}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
        </View>
        <Text style={styles.noticeText}>
          Seus dados estao protegidos e sao utilizados apenas para fins de seguranca e
          comunicacao do condominio.
        </Text>
      </View>

      <Modal
        visible={editingField !== null}
        transparent
        animationType="slide"
        onRequestClose={closeEditor}
      >
        <KeyboardAvoidingView
          style={styles.sheetWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.sheetBackdrop} onPress={closeEditor} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>
                {editingField ? `Editar ${editingField.label.toLowerCase()}` : ''}
              </Text>
              <Pressable onPress={closeEditor} hitSlop={8} style={styles.sheetClose}>
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>

            {editingField ? (
              <View style={styles.formField}>
                <Text style={styles.formLabel}>{editingField.label}</Text>
                <TextInput
                  value={draftValue}
                  onChangeText={setDraftValue}
                  placeholder={editingField.placeholder}
                  placeholderTextColor="#B6BAC3"
                  keyboardType={editingField.keyboardType}
                  autoCapitalize={editingField.autoCapitalize}
                  autoFocus
                  style={styles.formInput}
                />
              </View>
            ) : null}

            <View style={styles.sheetActions}>
              <Pressable
                style={[styles.sheetButton, styles.sheetCancel]}
                onPress={closeEditor}
                disabled={submitting}
              >
                <Text style={styles.sheetCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.sheetButton,
                  styles.sheetSubmit,
                  submitting && styles.sheetSubmitDisabled
                ]}
                onPress={saveDraft}
                disabled={submitting}
              >
                <Text style={styles.sheetSubmitText}>
                  {submitting ? 'Salvando...' : 'Salvar'}
                </Text>
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
    marginTop: 4,
    marginBottom: 4
  },
  headerSide: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800'
  },
  sectionWrap: {
    gap: 8
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    marginLeft: 4
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#132016',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1EF'
  },
  rowIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  rowCopy: {
    flex: 1,
    gap: 2
  },
  rowLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  },
  rowValue: {
    color: colors.textMuted,
    fontSize: 13
  },
  rowValueEmpty: {
    fontStyle: 'italic',
    color: '#B6BAC3'
  },
  notice: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: '#EFF6F1',
    borderRadius: 14,
    padding: 14,
    marginTop: 4
  },
  noticeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCEBDF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  noticeText: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: 12,
    lineHeight: 17
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
    gap: 14
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
    fontSize: 16,
    fontWeight: '800',
    flex: 1
  },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4F6F5',
    alignItems: 'center',
    justifyContent: 'center'
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
  helperText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4
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
  sheetSubmitDisabled: {
    opacity: 0.6
  },
  sheetSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14
  }
});
