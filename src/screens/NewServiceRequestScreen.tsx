import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen } from '../components/AppScreen';
import { colors } from '../theme/colors';
import { createServiceRequest } from '../api/serviceRequests';
import { extractErrorMessage } from '../utils/extractError';
import {
  PRIORITY_OPTIONS,
  PRIORITY_VISUAL,
  SERVICE_TYPE_OPTIONS,
  SERVICE_TYPE_VISUAL
} from '../utils/serviceRequest';
import type {
  ServiceRequestPriority,
  ServiceType
} from '../types/domain';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'NewServiceRequest'>;

type PickerKind = 'service_type' | 'priority' | null;

export function NewServiceRequestScreen() {
  const navigation = useNavigation<Nav>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>('MAINTENANCE');
  const [priority, setPriority] = useState<ServiceRequestPriority>('MEDIUM');
  const [picker, setPicker] = useState<PickerKind>(null);
  const [submitting, setSubmitting] = useState(false);

  const typeVisual = SERVICE_TYPE_VISUAL[serviceType];
  const priorityVisual = PRIORITY_VISUAL[priority];

  function handleBack() {
    if (navigation.canGoBack()) navigation.goBack();
  }

  async function submit() {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      Alert.alert('Titulo obrigatorio', 'Informe um titulo curto pra solicitacao.');
      return;
    }

    try {
      setSubmitting(true);
      await createServiceRequest({
        title: cleanTitle,
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        service_type: serviceType,
        priority
      });
      Alert.alert(
        'Solicitacao enviada',
        'Seu chamado foi registrado e o sindico sera avisado.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Falha ao criar solicitacao', extractErrorMessage(error));
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
        <Text style={styles.headerTitle}>Nova solicitacao</Text>
        <View style={styles.headerSide} />
      </View>

      <Text style={styles.subtitle}>
        Descreva o que precisa de atencao. O sindico recebera o chamado e avisara
        voce assim que houver uma resposta.
      </Text>

      <View style={styles.heroCard}>
        <View style={[styles.heroIcon, { backgroundColor: typeVisual.bg }]}>
          <Ionicons name={typeVisual.icon} size={26} color={typeVisual.fg} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>Tipo de servico</Text>
          <Text style={styles.heroTitle}>{typeVisual.label}</Text>
          <Text style={styles.heroSubtitle}>
            Escolha a categoria que melhor descreve o problema.
          </Text>
        </View>
      </View>

      <FieldGroup title="Categoria">
        <SelectField
          icon={typeVisual.icon}
          label="Tipo de servico"
          value={typeVisual.label}
          onPress={() => setPicker('service_type')}
        />
        <SelectField
          icon="flag-outline"
          label="Prioridade"
          value={priorityVisual.label}
          accent={priorityVisual.fg}
          onPress={() => setPicker('priority')}
        />
      </FieldGroup>

      <FieldGroup title="Detalhes do chamado">
        <Field label="Titulo">
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ex: Vazamento na torneira da area comum"
            placeholderTextColor="#B6BAC3"
            maxLength={150}
          />
        </Field>

        <Field label="Local">
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="Ex: Bloco A - 2o Andar"
            placeholderTextColor="#B6BAC3"
            maxLength={150}
          />
        </Field>

        <Field label="Descricao">
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Conte o que esta acontecendo, quando comecou e qualquer detalhe util."
            placeholderTextColor="#B6BAC3"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Field>
      </FieldGroup>

      <Pressable
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={submit}
        disabled={submitting}
      >
        <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
        <Text style={styles.submitButtonText}>
          {submitting ? 'Enviando...' : 'Abrir solicitacao'}
        </Text>
      </Pressable>

      <PickerSheet
        visible={picker === 'service_type'}
        title="Tipo de servico"
        onClose={() => setPicker(null)}
      >
        {SERVICE_TYPE_OPTIONS.map((opt) => {
          const visual = SERVICE_TYPE_VISUAL[opt];
          const selected = opt === serviceType;
          return (
            <Pressable
              key={opt}
              style={[styles.pickerRow, selected && styles.pickerRowSelected]}
              onPress={() => {
                setServiceType(opt);
                setPicker(null);
              }}
            >
              <View style={[styles.pickerIcon, { backgroundColor: visual.bg }]}>
                <Ionicons name={visual.icon} size={18} color={visual.fg} />
              </View>
              <Text style={styles.pickerLabel}>{visual.label}</Text>
              {selected ? (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.primary}
                />
              ) : null}
            </Pressable>
          );
        })}
      </PickerSheet>

      <PickerSheet
        visible={picker === 'priority'}
        title="Prioridade"
        onClose={() => setPicker(null)}
      >
        {PRIORITY_OPTIONS.map((opt) => {
          const visual = PRIORITY_VISUAL[opt];
          const selected = opt === priority;
          return (
            <Pressable
              key={opt}
              style={[styles.pickerRow, selected && styles.pickerRowSelected]}
              onPress={() => {
                setPriority(opt);
                setPicker(null);
              }}
            >
              <View style={[styles.pickerIcon, { backgroundColor: visual.bg }]}>
                <Ionicons name="flag" size={16} color={visual.fg} />
              </View>
              <Text style={styles.pickerLabel}>{visual.label}</Text>
              {selected ? (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.primary}
                />
              ) : null}
            </Pressable>
          );
        })}
      </PickerSheet>
    </AppScreen>
  );
}

type FieldGroupProps = {
  title: string;
  children: React.ReactNode;
};

function FieldGroup({ title, children }: FieldGroupProps) {
  return (
    <View style={styles.groupWrap}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupCard}>{children}</View>
    </View>
  );
}

type FieldProps = {
  label: string;
  children: React.ReactNode;
};

function Field({ label, children }: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

type SelectFieldProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent?: string;
  onPress: () => void;
};

function SelectField({ icon, label, value, accent, onPress }: SelectFieldProps) {
  return (
    <Pressable style={styles.selectField} onPress={onPress}>
      <View style={styles.selectIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={accent ?? colors.primary}
        />
      </View>
      <View style={styles.selectCopy}>
        <Text style={styles.selectLabel}>{label}</Text>
        <Text style={styles.selectValue}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

type PickerSheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

function PickerSheet({ visible, title, onClose, children }: PickerSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.sheetWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8} style={styles.sheetClose}>
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.sheetBody}
            contentContainerStyle={styles.sheetBodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
    lineHeight: 18,
    marginTop: -6
  },
  heroCard: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#132016',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  heroCopy: {
    flex: 1
  },
  heroEyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase'
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2
  },
  heroSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16
  },
  groupWrap: {
    gap: 8
  },
  groupTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 4
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#132016',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1EF'
  },
  selectIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  selectCopy: {
    flex: 1
  },
  selectLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600'
  },
  selectValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2
  },
  fieldWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1EF'
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600'
  },
  input: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 4
  },
  inputMultiline: {
    minHeight: 90,
    textAlignVertical: 'top',
    paddingTop: 6
  },
  submitButton: {
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
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800'
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
    maxHeight: '70%',
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
    justifyContent: 'space-between'
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 16,
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
    paddingBottom: 12,
    gap: 6
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
  pickerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pickerLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    flex: 1
  }
});
