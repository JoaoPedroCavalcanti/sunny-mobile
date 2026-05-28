import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { SectionHeader } from '../components/SectionHeader';
import { AppCard } from '../components/AppCard';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import {
  createNews,
  deleteNews,
  listNews,
  patchNews
} from '../api/news';
import {
  getDeliveryNotification,
  listDeliveryNotifications,
  sendDeliveryNotification
} from '../api/deliveryNotifications';
import type { News, DeliveryNotification } from '../types/domain';
import { formatDateTime } from '../utils/date';
import { colors } from '../theme/colors';
import { extractErrorMessage } from '../utils/extractError';

export function NewsScreen() {
  const [newsList, setNewsList] = useState<News[]>([]);
  const [deliveryList, setDeliveryList] = useState<DeliveryNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [newsTitle, setNewsTitle] = useState('');
  const [newsDescription, setNewsDescription] = useState('');
  const [newsAuthor, setNewsAuthor] = useState('');

  const [deliveryUserId, setDeliveryUserId] = useState('');
  const [deliveryTitle, setDeliveryTitle] = useState('');
  const [deliveryFrom, setDeliveryFrom] = useState('');

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [n, d] = await Promise.allSettled([listNews(), listDeliveryNotifications()]);

      if (n.status === 'fulfilled') setNewsList(n.value);
      if (d.status === 'fulfilled') setDeliveryList(d.value);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function onCreateNews() {
    try {
      await createNews({
        title: newsTitle,
        description: newsDescription,
        author: newsAuthor,
        priority_level: 'medium'
      });
      setNewsTitle('');
      setNewsDescription('');
      setNewsAuthor('');
      await loadData();
    } catch (error) {
      Alert.alert('Falha ao criar comunicado', extractErrorMessage(error));
    }
  }

  async function onPatchNews(item: News) {
    try {
      await patchNews(item.id, { title: `${item.title} (Atualizado)` });
      await loadData();
    } catch (error) {
      Alert.alert('Falha ao editar comunicado', extractErrorMessage(error));
    }
  }

  async function onDeleteNews(id: number) {
    try {
      await deleteNews(id);
      await loadData();
    } catch (error) {
      Alert.alert('Falha ao excluir comunicado', extractErrorMessage(error));
    }
  }

  async function onSendDelivery() {
    try {
      const created = await sendDeliveryNotification({
        user_to_delivery: Number(deliveryUserId),
        title: deliveryTitle,
        description: '',
        delivery_platform: 'ifood',
        delivery_from: deliveryFrom,
        delivery_to: '',
        priority_level: 'medium'
      });

      const detail = await getDeliveryNotification(created.id);
      Alert.alert('Notificacao enviada', `Entrega para usuario #${detail.user_to_delivery}`);
      setDeliveryUserId('');
      setDeliveryTitle('');
      setDeliveryFrom('');
      await loadData();
    } catch (error) {
      Alert.alert('Falha ao enviar notificacao', extractErrorMessage(error));
    }
  }

  return (
    <AppScreen onRefresh={loadData} refreshing={refreshing}>
      <SectionHeader title="Comunicados" subtitle="Noticias do condominio e notificacoes de entrega" />

      <AppCard>
        <Text style={styles.blockTitle}>Novo comunicado</Text>
        <AppInput label="Titulo" value={newsTitle} onChangeText={setNewsTitle} />
        <AppInput label="Descricao" value={newsDescription} onChangeText={setNewsDescription} />
        <AppInput label="Autor" value={newsAuthor} onChangeText={setNewsAuthor} />
        <AppButton title="Publicar" onPress={onCreateNews} />
      </AppCard>

      {newsList.map((item) => (
        <AppCard key={`news-${item.id}`}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemMeta}>{item.author}</Text>
          <Text style={styles.itemBody}>{item.description}</Text>
          <View style={styles.row}>
            <AppButton title="Editar" variant="ghost" onPress={() => onPatchNews(item)} style={styles.action} />
            <AppButton title="Excluir" variant="danger" onPress={() => onDeleteNews(item.id)} style={styles.action} />
          </View>
        </AppCard>
      ))}

      <AppCard>
        <Text style={styles.blockTitle}>Notificar entrega (admin)</Text>
        <AppInput label="ID do usuario" value={deliveryUserId} onChangeText={setDeliveryUserId} keyboardType="number-pad" />
        <AppInput label="Titulo" value={deliveryTitle} onChangeText={setDeliveryTitle} />
        <AppInput label="Entrega de" value={deliveryFrom} onChangeText={setDeliveryFrom} />
        <AppButton title="Enviar notificacao" onPress={onSendDelivery} />
      </AppCard>

      {deliveryList.map((item) => (
        <AppCard key={`delivery-${item.id}`}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemMeta}>Usuario #{item.user_to_delivery}</Text>
          <Text style={styles.itemMeta}>{formatDateTime(item.created_at)}</Text>
        </AppCard>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
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
  itemBody: {
    color: colors.textPrimary,
    marginTop: 6
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
