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

type FieldKind = 'remote' | 'local';

type FieldDef = {
  key: FieldKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  kind: FieldKind;
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
        kind: 'remote',
        autoCapitalize: 'words'
      },
      {
        key: 'birthDate',
        label: 'Data de nascimento',
        icon: 'calendar-outline',
        placeholder: 'DD/MM/AAAA',
        kind: 'local',
        keyboardType: 'number-pad'
      },
      {
        key: 'document',
        label: 'CPF',
        icon: 'card-outline',
        placeholder: '000.000.000-00',
        kind: 'local',
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
        kind: 'local',
        keyboardType: 'phone-pad'
      },
      {
        key: 'email',
        label: 'E-mail',
        icon: 'mail-outline',
        placeholder: 'seu@email.com',
        kind: 'remote',
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
        placeholder: 'Apartamento 101',
        kind: 'local'
      },
      {
        key: 'block',
        label: 'Bloco/Torre',
        icon: 'business-outline',
        placeholder: 'Torre A',
        kind: 'local'
      }
    ]
  }
];

function splitFullName(value: string) {
  const parts = value.trim().split(/\s+/);
  if (parts.length === 0) return { first: '', last: '' };
  const [first, ...rest] = parts;
  return { first, last: rest.join(' ') };
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
    switch (field.key) {
      case 'fullName':
        return [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
      case 'email':
        return user?.email ?? '';
      default:
        return extras[field.key] ?? '';
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
    const value = draftValue.trim();

    if (editingField.kind === 'local') {
      setExtraField(editingField.key as keyof typeof extras, value);
      setEditingField(null);
      setDraftValue('');
      return;
    }

    try {
      setSubmitting(true);
      if (editingField.key === 'fullName') {
        const { first, last } = splitFullName(value);
        const updated = await patchMe({ first_name: first, last_name: last });
        setUser(updated);
      } else if (editingField.key === 'email') {
        if (!value) {
          Alert.alert('E-mail invalido', 'Informe um e-mail valido.');
          return;
        }
        const updated = await patchMe({ email: value });
        setUser(updated);
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
                {editingField.kind === 'local' ? (
                  <Text style={styles.helperText}>
                    Esta informacao fica salva apenas neste dispositivo por enquanto.
                  </Text>
                ) : null}
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
