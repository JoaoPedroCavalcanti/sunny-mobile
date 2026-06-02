import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen } from '../components/AppScreen';
import { colors } from '../theme/colors';
import {
  completeServiceRequest,
  deleteServiceRequest,
  getServiceRequest,
  respondServiceRequest
} from '../api/serviceRequests';
import { extractErrorMessage } from '../utils/extractError';
import { formatDateTime } from '../utils/date';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';
import {
  PRIORITY_VISUAL,
  SERVICE_REQUEST_STATUS,
  SERVICE_TYPE_VISUAL,
  getRequesterApartmentLabel,
  getRequesterDisplayName,
  getRequesterId
} from '../utils/serviceRequest';
import type { ServiceRequest } from '../types/domain';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ServiceRequestDetails'>;
type RouteProps = RouteProp<RootStackParamList, 'ServiceRequestDetails'>;

type RespondModalState = {
  open: boolean;
  action: 'accept' | 'decline';
};

export function ServiceRequestDetailsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { requestId } = route.params;
  const { isAdmin } = usePermissions();
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const [respondModal, setRespondModal] = useState<RespondModalState>({
    open: false,
    action: 'accept'
  });
  const [responseText, setResponseText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getServiceRequest(requestId);
      setRequest(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function handleBack() {
    if (navigation.canGoBack()) navigation.goBack();
  }

  function openRespond(action: 'accept' | 'decline') {
    setResponseText('');
    setRespondModal({ open: true, action });
  }

  async function submitRespond() {
    if (!request) return;
    const cleaned = responseText.trim();
    if (!cleaned) {
      Alert.alert(
        'Resposta obrigatoria',
        'Escreva um motivo pra aceitar ou recusar a solicitacao.'
      );
      return;
    }
    try {
      setWorking(true);
      const updated = await respondServiceRequest(request.id, {
        action: respondModal.action,
        response: cleaned
      });
      setRequest(updated);
      setRespondModal({ open: false, action: respondModal.action });
      setResponseText('');
    } catch (err) {
      Alert.alert('Falha na acao', extractErrorMessage(err));
    } finally {
      setWorking(false);
    }
  }

  async function complete() {
    if (!request) return;
    Alert.alert(
      'Marcar como concluida?',
      'Confirma que o servico foi finalizado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Concluir',
          onPress: async () => {
            try {
              setWorking(true);
              const updated = await completeServiceRequest(request.id);
              setRequest(updated);
            } catch (err) {
              Alert.alert('Falha ao concluir', extractErrorMessage(err));
            } finally {
              setWorking(false);
            }
          }
        }
      ]
    );
  }

  async function remove() {
    if (!request) return;
    Alert.alert(
      'Excluir solicitacao?',
      'Essa acao nao pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              setWorking(true);
              await deleteServiceRequest(request.id);
              navigation.goBack();
            } catch (err) {
              Alert.alert('Falha ao excluir', extractErrorMessage(err));
              setWorking(false);
            }
          }
        }
      ]
    );
  }

  if (loading) {
    return (
      <AppScreen scroll={false}>
        <DetailsHeader title="Detalhes da solicitacao" onBack={handleBack} />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </AppScreen>
    );
  }

  if (error || !request) {
    return (
      <AppScreen scroll={false}>
        <DetailsHeader title="Detalhes da solicitacao" onBack={handleBack} />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
          <Text style={styles.errorText}>
            {error ?? 'Solicitacao nao encontrada.'}
          </Text>
          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </Pressable>
        </View>
      </AppScreen>
    );
  }

  const typeVisual = SERVICE_TYPE_VISUAL[request.service_type];
  const statusVisual = SERVICE_REQUEST_STATUS[request.status];
  const priorityVisual = PRIORITY_VISUAL[request.priority];
  const requesterName = getRequesterDisplayName(request.requester);
  const requesterApt = getRequesterApartmentLabel(request.requester);
  const requesterId = getRequesterId(request.requester);
  const isMine = requesterId !== null && requesterId === currentUserId;
  const respondedByName = request.responded_by
    ? getRequesterDisplayName(request.responded_by)
    : null;

  const canRespond = isAdmin && request.status === 'PENDING';
  const canComplete = isAdmin && request.status === 'ACCEPTED';
  const canEditOrDelete = isMine && request.status === 'PENDING';

  return (
    <AppScreen>
      <DetailsHeader title="Detalhes da solicitacao" onBack={handleBack} />

      <View style={styles.heroCard}>
        <View style={[styles.heroIcon, { backgroundColor: typeVisual.bg }]}>
          <Ionicons name={typeVisual.icon} size={26} color={typeVisual.fg} />
        </View>
        <View style={styles.heroCopy}>
          <View style={[styles.statusChip, { backgroundColor: statusVisual.bg }]}>
            <Text style={[styles.statusText, { color: statusVisual.fg }]}>
              {statusVisual.label}
            </Text>
          </View>
          <Text style={styles.heroTitle} numberOfLines={3}>
            {request.title}
          </Text>
          <View style={styles.heroMetaRow}>
            <View style={[styles.metaPill, { backgroundColor: typeVisual.bg }]}>
              <Ionicons
                name={typeVisual.icon}
                size={12}
                color={typeVisual.fg}
              />
              <Text style={[styles.metaPillText, { color: typeVisual.fg }]}>
                {typeVisual.label}
              </Text>
            </View>
            <View style={[styles.metaPill, { backgroundColor: priorityVisual.bg }]}>
              <Ionicons name="flag" size={11} color={priorityVisual.fg} />
              <Text style={[styles.metaPillText, { color: priorityVisual.fg }]}>
                {priorityVisual.label}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Section title="Descricao">
        <Text style={styles.descriptionText}>
          {request.description?.trim() || 'Sem descricao adicional.'}
        </Text>
      </Section>

      <Section title="Informacoes">
        <InfoRow
          icon="location-outline"
          label="Local"
          value={request.location?.trim() || 'Nao informado'}
        />
        <InfoRow
          icon="person-outline"
          label="Solicitante"
          value={
            requesterApt
              ? `${requesterName} - ${requesterApt}`
              : requesterName
          }
        />
        <InfoRow
          icon="calendar-outline"
          label="Aberta em"
          value={formatDateTime(request.created_at)}
        />
        {request.request_scheduled_date ? (
          <InfoRow
            icon="time-outline"
            label="Data desejada"
            value={formatDateTime(request.request_scheduled_date)}
          />
        ) : null}
        <InfoRow
          icon="refresh-outline"
          label="Ultima atualizacao"
          value={formatDateTime(request.updated_at)}
          isLast
        />
      </Section>

      {request.admin_response?.trim() ? (
        <Section title="Resposta do sindico">
          <Text style={styles.descriptionText}>{request.admin_response}</Text>
          {respondedByName ? (
            <View style={styles.responseFooter}>
              <Ionicons name="person-circle-outline" size={14} color={colors.textMuted} />
              <Text style={styles.responseFooterText}>
                Por {respondedByName}
                {request.responded_at
                  ? ` - ${formatDateTime(request.responded_at)}`
                  : ''}
              </Text>
            </View>
          ) : null}
        </Section>
      ) : null}

      {canRespond ? (
        <View style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Responder solicitacao</Text>
          <Text style={styles.actionsSubtitle}>
            Voce precisa informar um motivo ao aceitar ou recusar.
          </Text>
          <View style={styles.actionsRow}>
            <Pressable
              style={[styles.primaryAction]}
              onPress={() => openRespond('accept')}
              disabled={working}
            >
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Aceitar</Text>
            </Pressable>
            <Pressable
              style={[styles.dangerAction]}
              onPress={() => openRespond('decline')}
              disabled={working}
            >
              <Ionicons name="close" size={18} color="#FFFFFF" />
              <Text style={styles.dangerActionText}>Recusar</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {canComplete ? (
        <Pressable style={styles.completeButton} onPress={complete} disabled={working}>
          <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
          <Text style={styles.completeButtonText}>
            {working ? 'Finalizando...' : 'Marcar como concluida'}
          </Text>
        </Pressable>
      ) : null}

      {canEditOrDelete ? (
        <Pressable style={styles.deleteButton} onPress={remove} disabled={working}>
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={styles.deleteButtonText}>Excluir solicitacao</Text>
        </Pressable>
      ) : null}

      <Modal
        visible={respondModal.open}
        transparent
        animationType="slide"
        onRequestClose={() => setRespondModal({ ...respondModal, open: false })}
      >
        <KeyboardAvoidingView
          style={styles.sheetWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => setRespondModal({ ...respondModal, open: false })}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetEyebrow}>
                  {respondModal.action === 'accept' ? 'Aceitar' : 'Recusar'}
                </Text>
                <Text style={styles.sheetTitle}>{request.title}</Text>
              </View>
              <Pressable
                onPress={() => setRespondModal({ ...respondModal, open: false })}
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
              <Text style={styles.sheetLabel}>Motivo</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={responseText}
                onChangeText={setResponseText}
                placeholder={
                  respondModal.action === 'accept'
                    ? 'Ex: equipe sera enviada amanha pela manha.'
                    : 'Ex: a manutencao ja foi resolvida pelo sindico.'
                }
                placeholderTextColor="#B6BAC3"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                autoFocus
              />
            </ScrollView>

            <View style={styles.sheetActions}>
              <Pressable
                style={[styles.sheetButton, styles.sheetCancel]}
                onPress={() => setRespondModal({ ...respondModal, open: false })}
                disabled={working}
              >
                <Text style={styles.sheetCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.sheetButton,
                  respondModal.action === 'accept'
                    ? styles.sheetSubmit
                    : styles.sheetSubmitDanger
                ]}
                onPress={submitRespond}
                disabled={working}
              >
                <Text style={styles.sheetSubmitText}>
                  {working
                    ? 'Enviando...'
                    : respondModal.action === 'accept'
                    ? 'Aceitar solicitacao'
                    : 'Recusar solicitacao'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </AppScreen>
  );
}

type DetailsHeaderProps = {
  title: string;
  onBack: () => void;
};

function DetailsHeader({ title, onBack }: DetailsHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.headerSide} hitSlop={8}>
        <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerSide} />
    </View>
  );
}

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

type InfoRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isLast?: boolean;
};

function InfoRow({ icon, label, value, isLast }: InfoRowProps) {
  return (
    <View style={[styles.infoRow, !isLast && styles.infoRowDivider]}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24
  },
  errorText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center'
  },
  retryButton: {
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primary
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13
  },
  heroCard: {
    flexDirection: 'row',
    gap: 14,
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
    flex: 1,
    gap: 8
  },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800'
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999
  },
  metaPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  sectionWrap: {
    gap: 8
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 4
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#132016',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  descriptionText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20
  },
  responseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEF1EF'
  },
  responseFooterText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600'
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10
  },
  infoRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1EF'
  },
  infoIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  infoCopy: {
    flex: 1,
    gap: 2
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600'
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    shadowColor: '#132016',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  actionsTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800'
  },
  actionsSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10
  },
  primaryAction: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14
  },
  dangerAction: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  dangerActionText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FBE3E3'
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 13,
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
    minHeight: '45%',
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
    alignItems: 'flex-start',
    gap: 12
  },
  sheetEyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase'
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2
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
    gap: 8
  },
  sheetLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600'
  },
  input: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: '#F4F6F5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  inputMultiline: {
    minHeight: 110,
    textAlignVertical: 'top'
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10
  },
  sheetButton: {
    flex: 1,
    height: 48,
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
  sheetSubmitDanger: {
    backgroundColor: colors.danger
  },
  sheetSubmitText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14
  }
});
