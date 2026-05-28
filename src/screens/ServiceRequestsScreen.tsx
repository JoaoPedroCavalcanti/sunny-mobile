import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { AppScreen } from '../components/AppScreen';
import { SectionHeader } from '../components/SectionHeader';
import { AppCard } from '../components/AppCard';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import {
  acceptOrDeclineServiceRequest,
  createServiceRequest,
  deleteServiceRequest,
  getServiceRequest,
  listServiceRequests,
  patchServiceRequest
} from '../api/serviceRequests';
import type { ServiceRequest } from '../types/domain';
import { formatDateTime } from '../utils/date';
import { colors } from '../theme/colors';
import { extractErrorMessage } from '../utils/extractError';

export function ServiceRequestsScreen() {
  const { user } = useAuthStore();
  const [list, setList] = useState<ServiceRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await listServiceRequests();
      setList(data);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function onCreate() {
    if (!user) return;
    try {
      await createServiceRequest({
        requester_user: user.id,
        title,
        request_description: description,
        service_type: 'Outros',
        location: 'Condominio',
        priority: 'medium',
        request_scheduled_date: scheduledDate,
        status: 'requested',
        responsable_staff: '',
        scheduled_date: null,
        more_details: ''
      });
      setTitle('');
      setDescription('');
      setScheduledDate('');
      await loadData();
    } catch (error) {
      Alert.alert('Falha ao criar solicitacao', extractErrorMessage(error));
    }
  }

  async function onDelete(id: number) {
    try {
      await deleteServiceRequest(id);
      await loadData();
    } catch (error) {
      Alert.alert('Falha ao excluir solicitacao', extractErrorMessage(error));
    }
  }

  async function onPatch(item: ServiceRequest) {
    try {
      await patchServiceRequest(item.id, {
        more_details: `${item.more_details || ''} [atualizado pelo app]`.trim()
      });
      await loadData();
    } catch (error) {
      Alert.alert('Falha ao atualizar', extractErrorMessage(error));
    }
  }

  async function onDetail(id: number) {
    try {
      const detail = await getServiceRequest(id);
      Alert.alert('Detalhe', `${detail.title}\nStatus: ${detail.status}`);
    } catch (error) {
      Alert.alert('Falha ao buscar detalhe', extractErrorMessage(error));
    }
  }

  async function onDecision(id: number, action: 'accept' | 'decline') {
    try {
      await acceptOrDeclineServiceRequest(id, action);
      await loadData();
    } catch (error) {
      Alert.alert('Falha na acao', extractErrorMessage(error));
    }
  }

  return (
    <AppScreen onRefresh={loadData} refreshing={refreshing}>
      <SectionHeader title="Solicitacoes" subtitle="Abertura e acompanhamento de chamados" />

      <AppCard>
        <Text style={styles.formTitle}>Nova solicitacao</Text>
        <AppInput label="Titulo" value={title} onChangeText={setTitle} />
        <AppInput label="Descricao" value={description} onChangeText={setDescription} />
        <AppInput
          label="Data/Hora (ISO)"
          value={scheduledDate}
          onChangeText={setScheduledDate}
        />
        <AppButton title="Criar solicitacao" onPress={onCreate} />
      </AppCard>

      {list.map((item) => (
        <AppCard key={item.id}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.meta}>{formatDateTime(item.request_scheduled_date)}</Text>
          <Text style={styles.meta}>Status: {item.status}</Text>
          <View style={styles.row}>
            <AppButton title="Detalhe" variant="ghost" onPress={() => onDetail(item.id)} style={styles.action} />
            <AppButton title="Editar" variant="ghost" onPress={() => onPatch(item)} style={styles.action} />
            <AppButton title="Excluir" variant="danger" onPress={() => onDelete(item.id)} style={styles.action} />
          </View>
          <View style={styles.row}>
            <AppButton title="Aceitar" onPress={() => onDecision(item.id, 'accept')} style={styles.action} />
            <AppButton title="Recusar" variant="ghost" onPress={() => onDecision(item.id, 'decline')} style={styles.action} />
          </View>
        </AppCard>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  formTitle: {
    marginBottom: 10,
    fontWeight: '700',
    color: colors.textPrimary
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary
  },
  meta: {
    color: colors.textMuted,
    marginTop: 3
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  action: {
    flex: 1
  }
});
