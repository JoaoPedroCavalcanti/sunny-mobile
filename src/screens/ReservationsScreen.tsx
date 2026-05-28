import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { SectionHeader } from '../components/SectionHeader';
import { AppCard } from '../components/AppCard';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import {
  createBbqReservation,
  createHallReservation,
  deleteBbqReservation,
  deleteHallReservation,
  listBbqReservations,
  listHallReservations,
  patchBbqReservation,
  patchHallReservation
} from '../api/reservations';
import type { Reservation } from '../types/domain';
import { formatDate } from '../utils/date';
import { colors } from '../theme/colors';
import { extractErrorMessage } from '../utils/extractError';

export function ReservationsScreen() {
  const [tab, setTab] = useState<'bbq' | 'hall'>('bbq');
  const [list, setList] = useState<Reservation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [date, setDate] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = tab === 'bbq' ? await listBbqReservations() : await listHallReservations();
      setList(data);
    } finally {
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function createReservation() {
    try {
      setLoading(true);
      const payload = {
        reservation_date: date,
        guest_count: guestCount ? Number(guestCount) : undefined
      };
      if (tab === 'bbq') {
        await createBbqReservation(payload);
      } else {
        await createHallReservation(payload);
      }
      setDate('');
      setGuestCount('');
      await loadData();
    } catch (error) {
      Alert.alert('Falha ao reservar', extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function removeReservation(id: number) {
    try {
      if (tab === 'bbq') await deleteBbqReservation(id);
      else await deleteHallReservation(id);
      await loadData();
    } catch (error) {
      Alert.alert('Falha ao excluir', extractErrorMessage(error));
    }
  }

  async function increaseGuests(item: Reservation) {
    try {
      const next = (item.guest_count || 0) + 1;
      if (tab === 'bbq') await patchBbqReservation(item.id, { guest_count: next });
      else await patchHallReservation(item.id, { guest_count: next });
      await loadData();
    } catch (error) {
      Alert.alert('Falha ao atualizar', extractErrorMessage(error));
    }
  }

  const tabText = useMemo(() => (tab === 'bbq' ? 'churrasqueira' : 'salao de festas'), [tab]);

  return (
    <AppScreen onRefresh={loadData} refreshing={refreshing}>
      <SectionHeader title="Reservas" subtitle="Gerencie reservas de churrasqueira e salao" />

      <View style={styles.toggleRow}>
        <Pressable style={[styles.tabBtn, tab === 'bbq' && styles.tabBtnActive]} onPress={() => setTab('bbq')}>
          <Text style={[styles.tabText, tab === 'bbq' && styles.tabTextActive]}>Churrasqueira</Text>
        </Pressable>
        <Pressable style={[styles.tabBtn, tab === 'hall' && styles.tabBtnActive]} onPress={() => setTab('hall')}>
          <Text style={[styles.tabText, tab === 'hall' && styles.tabTextActive]}>Salao</Text>
        </Pressable>
      </View>

      <AppCard>
        <Text style={styles.blockTitle}>Nova reserva - {tabText}</Text>
        <View style={styles.formRow}>
          <View style={styles.flex}><AppInput label="Data (AAAA-MM-DD)" value={date} onChangeText={setDate} /></View>
          <View style={styles.small}><AppInput label="Convidados" value={guestCount} onChangeText={setGuestCount} keyboardType="number-pad" /></View>
        </View>
        <AppButton title="Reservar" onPress={createReservation} loading={loading} />
      </AppCard>

      {list.map((item) => (
        <AppCard key={item.id}>
          <Text style={styles.itemTitle}>#{item.id} - {formatDate(item.reservation_date)}</Text>
          <Text style={styles.itemSub}>Convidados: {item.guest_count ?? 0}</Text>
          <View style={styles.actions}>
            <AppButton title="+ convidado" variant="ghost" onPress={() => increaseGuests(item)} style={styles.actionBtn} />
            <AppButton title="Excluir" variant="danger" onPress={() => removeReservation(item.id)} style={styles.actionBtn} />
          </View>
        </AppCard>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    backgroundColor: '#EAF0EC',
    borderRadius: 12,
    flexDirection: 'row',
    padding: 4
  },
  tabBtn: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: 'center'
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF'
  },
  tabText: {
    color: colors.textMuted,
    fontWeight: '600'
  },
  tabTextActive: {
    color: colors.primary
  },
  blockTitle: {
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12
  },
  formRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  flex: { flex: 1 },
  small: { width: 110 },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary
  },
  itemSub: {
    color: colors.textMuted,
    marginVertical: 6
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4
  },
  actionBtn: {
    flex: 1
  }
});
