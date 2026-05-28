import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { SectionHeader } from '../components/SectionHeader';
import { AppCard } from '../components/AppCard';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { createVisitor, deleteVisitor, listVisitors, patchVisitor } from '../api/visitors';
import type { VisitorAccess } from '../types/domain';
import { formatDateTime } from '../utils/date';
import { colors } from '../theme/colors';
import { extractErrorMessage } from '../utils/extractError';

export function VisitorScreen() {
  const [list, setList] = useState<VisitorAccess[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [scheduled, setScheduled] = useState('');
  const [description, setDescription] = useState('');

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await listVisitors();
      setList(data);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function onCreate() {
    try {
      setLoading(true);
      await createVisitor({
        visitor_name: name,
        email,
        scheduled_date: scheduled,
        description
      });
      setName('');
      setEmail('');
      setScheduled('');
      setDescription('');
      await loadData();
    } catch (error) {
      Alert.alert('Falha ao cadastrar visitante', extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: number) {
    try {
      await deleteVisitor(id);
      await loadData();
    } catch (error) {
      Alert.alert('Falha ao excluir visitante', extractErrorMessage(error));
    }
  }

  async function onPatch(item: VisitorAccess) {
    try {
      await patchVisitor(item.id, {
        description: `${item.description || ''} [atualizado no app]`.trim()
      });
      await loadData();
    } catch (error) {
      Alert.alert('Falha ao atualizar visitante', extractErrorMessage(error));
    }
  }

  return (
    <AppScreen onRefresh={loadData} refreshing={refreshing}>
      <SectionHeader title="Visitantes" subtitle="Controle de visitas e horarios" />

      <AppCard>
        <Text style={styles.formTitle}>Novo visitante</Text>
        <AppInput label="Nome do visitante" value={name} onChangeText={setName} />
        <AppInput label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <AppInput
          label="Data/Hora (ISO: 2026-06-20T18:00:00Z)"
          value={scheduled}
          onChangeText={setScheduled}
        />
        <AppInput label="Descricao" value={description} onChangeText={setDescription} />
        <AppButton title="Cadastrar visitante" onPress={onCreate} loading={loading} />
      </AppCard>

      {list.map((item) => (
        <AppCard key={item.id}>
          <Text style={styles.itemName}>{item.visitor_name}</Text>
          <Text style={styles.itemMeta}>{formatDateTime(item.scheduled_date)}</Text>
          <Text style={styles.itemMeta}>Status: {item.status}</Text>
          <View style={styles.actions}>
            <AppButton title="Editar descricao" variant="ghost" onPress={() => onPatch(item)} style={styles.action} />
            <AppButton title="Excluir" variant="danger" onPress={() => onDelete(item.id)} style={styles.action} />
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
  itemName: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.textPrimary
  },
  itemMeta: {
    color: colors.textMuted,
    marginTop: 3
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10
  },
  action: { flex: 1 }
});
