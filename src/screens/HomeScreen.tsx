import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  ImageBackground,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppScreen } from '../components/AppScreen';
import { listNews } from '../api/news';
import { listCondoPayments } from '../api/payments';
import { listVisitorGroupVisits, listVisitors } from '../api/visitors';
import { listServiceRequests } from '../api/serviceRequests';
import { formatDateTime } from '../utils/date';
import { colors } from '../theme/colors';
import { useAuthStore } from '../store/authStore';
import { usePermissions } from '../hooks/usePermissions';
import { AdminHomeScreen } from './AdminHomeScreen';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Dashboard = {
  latestNewsTitle: string;
  latestNewsDescription: string;
  nextVisitor?: string;
  nextVisitorTime?: string;
  openRequests: number;
  pendingPayments: number;
};

type HeroSlide = {
  key: string;
  image: ReturnType<typeof require>;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
};

const HERO_SLIDES: HeroSlide[] = [
  {
    key: 'welcome',
    image: require('../../assets/login-bg.png'),
    icon: 'leaf-outline',
    title: 'Bem-vinda ao\nSunnyvale Connect',
    text: 'Tudo do seu condominio,\nna palma da sua mao.'
  },
  {
    key: 'reservas',
    image: require('../../assets/hero-reservas.png'),
    icon: 'calendar-outline',
    title: 'Reserve areas\ncomuns em segundos',
    text: 'Churrasqueira, salao e mais\nsem precisar ligar na portaria.'
  },
  {
    key: 'avisos',
    image: require('../../assets/hero-avisos.png'),
    icon: 'notifications-outline',
    title: 'Fique por dentro\ndo condominio',
    text: 'Comunicados, financeiro e\nvisitantes em um so lugar.'
  }
];

const HERO_AUTOPLAY_MS = 8000;

export function HomeScreen() {
  const { isAdmin } = usePermissions();
  if (isAdmin) {
    return <AdminHomeScreen />;
  }
  return <ResidentHomeScreen />;
}

function ResidentHomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const user = useAuthStore((state) => state.user);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard>({
    latestNewsTitle: 'Carregando...',
    latestNewsDescription: 'Estamos preparando as novidades do condominio para voce.',
    openRequests: 0,
    pendingPayments: 0
  });

  const heroListRef = useRef<FlatList<HeroSlide>>(null);
  const [heroWidth, setHeroWidth] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroInteractionTick, setHeroInteractionTick] = useState(0);

  const handleHeroLayout = useCallback((event: LayoutChangeEvent) => {
    setHeroWidth(event.nativeEvent.layout.width);
  }, []);

  const handleHeroScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!heroWidth) return;
      const offsetX = event.nativeEvent.contentOffset.x;
      const next = Math.round(offsetX / heroWidth);
      setHeroIndex(Math.max(0, Math.min(HERO_SLIDES.length - 1, next)));
      setHeroInteractionTick((t) => t + 1);
    },
    [heroWidth]
  );

  useEffect(() => {
    if (!heroWidth) return;
    const id = setInterval(() => {
      setHeroIndex((current) => {
        const next = (current + 1) % HERO_SLIDES.length;
        heroListRef.current?.scrollToOffset({ offset: next * heroWidth, animated: true });
        return next;
      });
    }, HERO_AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [heroWidth, heroInteractionTick]);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [news, soloVisitors, groupVisits, requests, payments] = await Promise.all([
        listNews(),
        listVisitors({ period: 'future' }).catch(() => []),
        listVisitorGroupVisits({ period: 'future' }).catch(() => []),
        listServiceRequests(),
        listCondoPayments()
      ]);

      const firstVisitor = [...soloVisitors, ...groupVisits]
        .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
        .find((v) => v.status !== 'Checked-out' && v.status !== 'CHECKED_OUT');

      setDashboard({
        latestNewsTitle: news[0]?.title || 'Nenhum comunicado recente',
        latestNewsDescription:
          news[0]?.description ||
          'Acompanhe avisos importantes, reservas e atualizacoes do condominio por aqui.',
        nextVisitor: firstVisitor?.visitor_name,
        nextVisitorTime: firstVisitor?.scheduled_date,
        openRequests: requests.filter((r) => r.status === 'PENDING').length,
        pendingPayments: payments.filter((p) => p.status === 'pending').length
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const residentName =
    user?.first_name?.trim() || user?.username?.trim() || 'morador(a)';

  const heroActions: Record<string, (() => void) | undefined> = {
    welcome: undefined,
    reservas: () => navigation.navigate('Reservas'),
    avisos: () => navigation.navigate('News')
  };

  const quickActions = [
    {
      label: 'Comunicados',
      icon: 'megaphone-outline' as const,
      onPress: () => navigation.navigate('News')
    },
    {
      label: 'Reservas',
      icon: 'calendar-outline' as const,
      onPress: () => navigation.navigate('Reservas')
    },
    {
      label: 'Solicitacoes',
      icon: 'construct-outline' as const,
      onPress: () => navigation.navigate('ServiceRequests')
    },
    {
      label: 'Visitantes',
      icon: 'people-outline' as const,
      onPress: () => navigation.navigate('Visitantes')
    }
  ];

  return (
    <AppScreen onRefresh={loadData} refreshing={refreshing}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.greeting}>Ola, {residentName} {'\uD83D\uDC4B'}</Text>
          <Text style={styles.subtitle}>Que bom te ver por aqui!</Text>
        </View>
        <Pressable style={styles.bellButton}>
          <Ionicons name="notifications-outline" size={26} color={colors.textPrimary} />
          <View style={styles.bellDot} />
        </Pressable>
      </View>

      <View style={styles.heroCarousel} onLayout={handleHeroLayout}>
        {heroWidth > 0 && (
          <FlatList
            ref={heroListRef}
            data={HERO_SLIDES}
            keyExtractor={(item) => item.key}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleHeroScroll}
            renderItem={({ item }) => {
              const onPress = heroActions[item.key];
              return (
                <Pressable
                  onPress={onPress}
                  disabled={!onPress}
                  style={{ width: heroWidth }}
                >
                  <ImageBackground
                    source={item.image}
                    resizeMode="cover"
                    imageStyle={styles.heroImage}
                    style={styles.heroCard}
                  >
                    <LinearGradient
                      colors={['rgba(21, 29, 22, 0.78)', 'rgba(21, 29, 22, 0.44)', 'rgba(21, 29, 22, 0.12)']}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.heroOverlay}
                    >
                      <View style={styles.heroIconWrap}>
                        <Ionicons name={item.icon} size={36} color="#9CC85F" />
                      </View>
                      <Text style={styles.heroTitle}>{item.title}</Text>
                      <Text style={styles.heroText}>{item.text}</Text>
                    </LinearGradient>
                  </ImageBackground>
                </Pressable>
              );
            }}
          />
        )}

        <View style={styles.heroDots} pointerEvents="none">
          {HERO_SLIDES.map((slide, index) => (
            <View
              key={slide.key}
              style={[styles.heroDot, index === heroIndex && styles.heroDotActive]}
            />
          ))}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Acesso rapido</Text>
      <View style={styles.quickGrid}>
        {quickActions.map((item) => (
          <Pressable key={item.label} style={styles.quickCard} onPress={item.onPress}>
            <View style={styles.quickIconWrap}>
              <Ionicons name={item.icon} size={24} color={colors.primary} />
            </View>
            <Pressable style={styles.quickArrow} onPress={item.onPress}>
              <Ionicons name="chevron-forward" size={16} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.quickText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.noticeCard} onPress={() => navigation.navigate('News')}>
        <View style={styles.noticeIconWrap}>
          <Ionicons name="megaphone-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.noticeCopy}>
          <Text style={styles.noticeTitle}>{dashboard.latestNewsTitle}</Text>
          <Text style={styles.noticeBody} numberOfLines={2}>
            {dashboard.latestNewsDescription}
          </Text>
          {dashboard.nextVisitorTime ? (
            <Text style={styles.noticeMeta}>
              Proxima visita: {dashboard.nextVisitor || 'Agendada'} em {formatDateTime(dashboard.nextVisitorTime)}
            </Text>
          ) : (
            <Text style={styles.noticeMeta}>
              {dashboard.openRequests} solicitacoes abertas e {dashboard.pendingPayments} pagamentos pendentes
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 10
  },
  headerCopy: {
    gap: 6
  },
  greeting: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800'
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16
  },
  bellButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A1A10',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6
  },
  bellDot: {
    position: 'absolute',
    top: 16,
    right: 17,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.primary
  },
  heroCarousel: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#152217',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 9
  },
  heroCard: {
    minHeight: 250
  },
  heroImage: {
    borderRadius: 30
  },
  heroOverlay: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 28,
    paddingBottom: 52,
    justifyContent: 'flex-end'
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 34
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 27,
    lineHeight: 35,
    fontWeight: '800'
  },
  heroText: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 16,
    lineHeight: 22,
    marginTop: 14
  },
  heroDots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  heroDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.88)'
  },
  heroDotActive: {
    width: 30,
    backgroundColor: '#8BC569'
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 2
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  quickCard: {
    width: '48.3%',
    minHeight: 116,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: '#112016',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  quickIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F7F1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  quickArrow: {
    position: 'absolute',
    right: 14,
    top: 54,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F4F6F8',
    alignItems: 'center',
    justifyContent: 'center'
  },
  quickText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 22,
    maxWidth: '74%'
  },
  noticeCard: {
    marginTop: 10,
    borderRadius: 20,
    backgroundColor: '#F7F8F8',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#132115',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  noticeIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#EDF5EE',
    alignItems: 'center',
    justifyContent: 'center'
  },
  noticeCopy: {
    flex: 1,
    gap: 2
  },
  noticeTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800'
  },
  noticeBody: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18
  },
  noticeMeta: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2
  }
});
