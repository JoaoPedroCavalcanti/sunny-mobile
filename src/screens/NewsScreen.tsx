import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen } from '../components/AppScreen';
import { listNews } from '../api/news';
import type { News } from '../types/domain';
import { colors } from '../theme/colors';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type Category = 'aviso' | 'manutencao' | 'evento';
type FilterKey = 'all' | Category;

type CategoryStyle = {
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
};

const CATEGORY_STYLES: Record<Category, CategoryStyle> = {
  aviso: {
    label: 'Aviso',
    iconName: 'clipboard-outline',
    color: '#0F7A43',
    bg: '#EAF5EF'
  },
  manutencao: {
    label: 'Manutencao',
    iconName: 'megaphone-outline',
    color: '#CD3131',
    bg: '#FBE3E3'
  },
  evento: {
    label: 'Evento',
    iconName: 'calendar-outline',
    color: '#3B7AC9',
    bg: '#E5EEF9'
  }
};

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'aviso', label: 'Avisos' },
  { key: 'manutencao', label: 'Manutencoes' },
  { key: 'evento', label: 'Eventos' }
];

function categoryFor(item: News): Category {
  switch (item.priority_level) {
    case 'high':
      return 'manutencao';
    case 'low':
      return 'evento';
    default:
      return 'aviso';
  }
}

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

type NewsNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Comunicados'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function NewsScreen() {
  const navigation = useNavigation<NewsNav>();
  const [items, setItems] = useState<News[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');

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
    return sorted.filter((item) => categoryFor(item) === filter);
  }, [items, filter]);

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  }

  return (
    <AppScreen onRefresh={loadData} refreshing={refreshing}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Comunicados</Text>
        <View style={styles.backButton} />
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
          const cat = categoryFor(item);
          const style = CATEGORY_STYLES[cat];
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
                  <Text style={[styles.cardCategory, { color: style.color }]}>
                    {style.label}
                  </Text>
                  <Text style={styles.cardDate}>{formatNewsDate(item.created_at)}</Text>
                </View>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.cardBody} numberOfLines={2}>
                  {item.description}
                </Text>
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
  }
});
