import React, { useCallback, useEffect, useState } from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppScreen } from '../components/AppScreen';
import { listNews } from '../api/news';
import { listCondoPayments } from '../api/payments';
import { listVisitors } from '../api/visitors';
import { listServiceRequests } from '../api/serviceRequests';
import { formatDateTime } from '../utils/date';
import { colors } from '../theme/colors';
import { useAuthStore } from '../store/authStore';
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

export function HomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const user = useAuthStore((state) => state.user);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard>({
    latestNewsTitle: 'Carregando...',
    latestNewsDescription: 'Estamos preparando as novidades do condominio para voce.',
    openRequests: 0,
    pendingPayments: 0
  });

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [news, visitors, requests, payments] = await Promise.all([
        listNews(),
        listVisitors(),
        listServiceRequests(),
        listCondoPayments()
      ]);

      const firstVisitor = [...visitors]
        .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
        .find((v) => v.status !== 'Checked-out');

      setDashboard({
        latestNewsTitle: news[0]?.title || 'Nenhum comunicado recente',
        latestNewsDescription:
          news[0]?.description ||
          'Acompanhe avisos importantes, reservas e atualizacoes do condominio por aqui.',
        nextVisitor: firstVisitor?.visitor_name,
        nextVisitorTime: firstVisitor?.scheduled_date,
        openRequests: requests.filter((r) => r.status === 'requested').length,
        pendingPayments: payments.filter((p) => p.status === 'pending').length
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const residentName =
    user?.first_name?.trim() || user?.username?.trim() || 'morador(a)';

  const quickActions = [
    {
      label: 'Comunicados',
      icon: 'megaphone-outline' as const,
      onPress: () => navigation.navigate('Comunicados')
    },
    {
      label: 'Churrasqueira',
      icon: 'flame-outline' as const,
      onPress: () => navigation.navigate('Reservas')
    },
    {
      label: 'Salao de festas',
      icon: 'business-outline' as const,
      onPress: () => navigation.navigate('Reservas')
    },
    {
      label: 'Visitantes',
      icon: 'people-outline' as const,
      onPress: () => navigation.navigate('Visitors')
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

      <ImageBackground
        source={require('../../assets/login-bg.png')}
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
            <Ionicons name="leaf-outline" size={36} color="#9CC85F" />
          </View>
          <Text style={styles.heroTitle}>Bem-vinda ao{'\n'}Sunnyvale Connect</Text>
          <Text style={styles.heroText}>Tudo do seu condominio, {'\n'}na palma da sua mao.</Text>

          <View style={styles.heroDots}>
            <View style={[styles.heroDot, styles.heroDotActive]} />
            <View style={styles.heroDot} />
            <View style={styles.heroDot} />
          </View>
        </LinearGradient>
      </ImageBackground>

      <Text style={styles.sectionTitle}>Acesso rapido</Text>
      <View style={styles.quickGrid}>
        {quickActions.map((item) => (
          <Pressable key={item.label} style={styles.quickCard} onPress={item.onPress}>
            <View style={styles.quickIconWrap}>
              <Ionicons name={item.icon} size={34} color={colors.primary} />
            </View>
            <Pressable style={styles.quickArrow} onPress={item.onPress}>
              <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.quickText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.noticeCard} onPress={() => navigation.navigate('Comunicados')}>
        <View style={styles.noticeIconWrap}>
          <Ionicons name="megaphone-outline" size={34} color={colors.primary} />
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
        <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
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
  heroCard: {
    minHeight: 250,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#152217',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 9
  },
  heroImage: {
    borderRadius: 30
  },
  heroOverlay: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 28,
    paddingBottom: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 26
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
    fontSize: 20,
    fontWeight: '800',
    marginTop: 18,
    marginBottom: 4
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  quickCard: {
    width: '47.8%',
    minHeight: 164,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 18,
    shadowColor: '#112016',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6
  },
  quickIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#F1F7F1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  quickArrow: {
    position: 'absolute',
    right: 18,
    top: 74,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F7F8FA',
    alignItems: 'center',
    justifyContent: 'center'
  },
  quickText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 34,
    maxWidth: '72%'
  },
  noticeCard: {
    marginTop: 14,
    borderRadius: 28,
    backgroundColor: '#F7F8F8',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#132115',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4
  },
  noticeIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#EDF5EE',
    alignItems: 'center',
    justifyContent: 'center'
  },
  noticeCopy: {
    flex: 1,
    gap: 4
  },
  noticeTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800'
  },
  noticeBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22
  },
  noticeMeta: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2
  }
});
