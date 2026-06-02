import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AppScreen } from '../components/AppScreen';
import { SectionHeader } from '../components/SectionHeader';
import { AppCard } from '../components/AppCard';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import {
  createCondoPayment,
  deleteCondoPayment,
  listCondoPayments,
  patchCondoPayment,
  setPaymentsAsPaid
} from '../api/payments';
import type { CondoPayment } from '../types/domain';
import { brDateToIso, formatDate, maskBrDate } from '../utils/date';
import { colors } from '../theme/colors';
import { extractErrorMessage } from '../utils/extractError';

export function FinanceScreen() {
  const [list, setList] = useState<CondoPayment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  const [payerId, setPayerId] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentLink, setPaymentLink] = useState('');

  const pendingTotal = useMemo(() => {
    return list
      .filter((p) => p.status === 'pending')
      .reduce((acc, current) => acc + Number(current.amount), 0);
  }, [list]);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await listCondoPayments();
      setList(data);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  async function onCreate() {
    if (!payerId.trim() || !title.trim() || !paymentLink.trim()) {
      Alert.alert(
        'Dados incompletos',
        'Preencha ID do pagador, titulo e link de pagamento.'
      );
      return;
    }
    const apiDueDate = dueDate.trim() ? brDateToIso(dueDate.trim()) : null;
    if (dueDate.trim() && !apiDueDate) {
      Alert.alert('Data invalida', 'Informe o vencimento no formato DD-MM-AAAA.');
      return;
    }
    try {
      setCreating(true);
      await createCondoPayment({
        payer_user: Number(payerId),
        title,
        status: 'pending',
        description: '',
        payment_link: paymentLink,
        amount,
        due_date: apiDueDate,
        payment_date: null
      });
      setPayerId('');
      setTitle('');
      setAmount('');
      setDueDate('');
      setPaymentLink('');
      await loadData();
      Alert.alert('Cobranca criada', 'A cobranca foi registrada com sucesso.');
    } catch (error) {
      Alert.alert('Falha ao criar pagamento', extractErrorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  async function onMarkPaid(id: number) {
    try {
      await setPaymentsAsPaid([id]);
      await loadData();
    } catch (error) {
      Alert.alert('Falha ao marcar como pago', extractErrorMessage(error));
    }
  }

  async function onPatch(item: CondoPayment) {
    try {
      await patchCondoPayment(item.id, {
        description: `${item.description || ''} atualizado no app`.trim()
      });
      await loadData();
    } catch (error) {
      Alert.alert('Falha ao editar', extractErrorMessage(error));
    }
  }

  async function onDelete(id: number) {
    try {
      await deleteCondoPayment(id);
      await loadData();
    } catch (error) {
      Alert.alert('Falha ao excluir', extractErrorMessage(error));
    }
  }

  return (
    <AppScreen onRefresh={loadData} refreshing={refreshing}>
      <SectionHeader title="Financeiro" subtitle="Pagamentos e boletos do condominio" />

      <AppCard>
        <Text style={styles.balanceLabel}>Saldo pendente</Text>
        <Text style={styles.balanceValue}>
          {pendingTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </Text>
      </AppCard>

      <AppCard>
        <Text style={styles.blockTitle}>Criar cobranca (admin)</Text>
        <AppInput label="ID do pagador" value={payerId} onChangeText={setPayerId} keyboardType="number-pad" />
        <AppInput label="Titulo" value={title} onChangeText={setTitle} />
        <View style={styles.row}>
          <View style={styles.action}><AppInput label="Valor" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" /></View>
          <View style={styles.action}><AppInput label="Vencimento (DD-MM-AAAA)" value={dueDate} onChangeText={(v) => setDueDate(maskBrDate(v))} keyboardType="number-pad" /></View>
        </View>
        <AppInput label="Link de pagamento" value={paymentLink} onChangeText={setPaymentLink} autoCapitalize="none" />
        <AppButton title="Criar" onPress={onCreate} loading={creating} />
      </AppCard>

      {list.map((item) => (
        <AppCard key={item.id}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemMeta}>Status: {item.status}</Text>
          <Text style={styles.itemMeta}>Vencimento: {formatDate(item.due_date)}</Text>
          <Text style={styles.itemAmount}>
            {Number(item.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </Text>
          <View style={styles.row}>
            <AppButton title="Pago" onPress={() => onMarkPaid(item.id)} style={styles.action} />
            <AppButton title="Editar" variant="ghost" onPress={() => onPatch(item)} style={styles.action} />
            <AppButton title="Excluir" variant="danger" onPress={() => onDelete(item.id)} style={styles.action} />
          </View>
          <AppButton
            title="Abrir link"
            variant="ghost"
            onPress={() => Linking.openURL(item.payment_link)}
          />
        </AppCard>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  balanceLabel: {
    color: colors.textMuted,
    fontSize: 13
  },
  balanceValue: {
    color: colors.primary,
    fontSize: 30,
    fontWeight: '800',
    marginTop: 4
  },
  blockTitle: {
    marginBottom: 10,
    fontWeight: '700',
    color: colors.textPrimary
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary
  },
  itemMeta: {
    color: colors.textMuted,
    marginTop: 4
  },
  itemAmount: {
    color: colors.textPrimary,
    marginTop: 6,
    fontSize: 18,
    fontWeight: '700'
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10
  },
  action: {
    flex: 1
  }
});
