import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  CompositeNavigationProp,
  useFocusEffect,
  useNavigation
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AppScreen } from '../components/AppScreen';
import { colors } from '../theme/colors';
import {
  leaveHousehold,
  listHouseholds,
  listPendingApprovals
} from '../api/households';
import { extractErrorMessage } from '../utils/extractError';
import type { Household } from '../types/domain';
import type {
  CasaStackParamList,
  MainTabParamList
} from '../navigation/types';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<CasaStackParamList, 'CasaMenu'>,
  BottomTabNavigationProp<MainTabParamList, 'Casa'>
>;

type IconName = keyof typeof Ionicons.glyphMap;

type MenuItem = {
  key: string;
  icon: IconName;
  label: string;
  description: string;
  badge?: string;
  destructive?: boolean;
  onPress: () => void;
};

export function MinhaCasaScreen() {
  const navigation = useNavigation<Nav>();
  const [household, setHousehold] = useState<Household | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const [houseResults, pendingResults] = await Promise.all([
          listHouseholds(),
          listPendingApprovals().catch(() => [])
        ]);
        const active =
          houseResults.find((h) => h.status === 'ACTIVE') ??
          houseResults[0] ??
          null;
        setHousehold(active);
        setPendingCount(pendingResults.length);
      } catch (e) {
        setError(extractErrorMessage(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load('refresh');
    }, [load])
  );

  function handleBack() {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Home');
  }

  function openDetails() {
    Alert.alert('Detalhes da unidade', 'Funcionalidade em desenvolvimento. Em breve!');
  }

  function openMembers() {
    navigation.navigate('Members');
  }

  function openPendingApprovals() {
    navigation.navigate('PendingApprovals');
  }

  function openReservations() {
    navigation.navigate('Reservas');
  }

  async function confirmLeave() {
    if (!household) return;
    Alert.alert(
      'Sair da unidade',
      'Tem certeza que deseja sair desta unidade? Voce perdera o acesso aos servicos do condominio.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              setLeaving(true);
              await leaveHousehold(household.id);
              setHousehold(null);
              setPendingCount(0);
            } catch (e) {
              Alert.alert('Falha ao sair', extractErrorMessage(e));
            } finally {
              setLeaving(false);
            }
          }
        }
      ]
    );
  }

  const menuItems: MenuItem[] = household
    ? [
        {
          key: 'moradores',
          icon: 'people-outline',
          label: 'Moradores',
          description: 'Veja e gerencie os moradores da sua unidade.',
          onPress: openMembers
        },
        {
          key: 'pendentes',
          icon: 'mail-outline',
          label: 'Convites pendentes',
          description: 'Aprove ou recuse solicitacoes para fazer parte da unidade.',
          badge: pendingCount > 0 ? String(pendingCount) : undefined,
          onPress: openPendingApprovals
        },
        {
          key: 'reservas',
          icon: 'calendar-outline',
          label: 'Reservas',
          description: 'Acompanhe e gerencie suas reservas das areas comuns.',
          onPress: openReservations
        },
        {
          key: 'sair',
          icon: 'exit-outline',
          label: 'Sair da unidade',
          description: 'Remover voce desta unidade.',
          destructive: true,
          onPress: confirmLeave
        }
      ]
    : [];

  return (
    <AppScreen onRefresh={() => load('refresh')} refreshing={refreshing}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerSide} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Minha unidade</Text>
        <View style={styles.headerSide} />
      </View>

      <Text style={styles.subtitle}>Gerencie sua unidade e quem tem acesso a ela.</Text>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => load('initial')} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : !household ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="business-outline" size={26} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Sem unidade ativa</Text>
          <Text style={styles.emptyMessage}>
            Voce ainda nao esta vinculado(a) a uma unidade.
          </Text>
        </View>
      ) : (
        <>
          <Pressable style={styles.unitCard} onPress={openDetails}>
            <View style={styles.unitIcon}>
              <Ionicons name="business" size={28} color={colors.primary} />
            </View>
            <View style={styles.unitCopy}>
              <Text style={styles.unitTitle}>
                Apartamento {household.apartment}
              </Text>
              {household.block ? (
                <Text style={styles.unitSubtitle}>Bloco {household.block}</Text>
              ) : null}
              <View style={styles.unitLinkRow}>
                <Text style={styles.unitLink}>Ver detalhes da unidade</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </View>
            </View>
          </Pressable>

          <View style={styles.menuCard}>
            {menuItems.map((item, idx) => (
              <Pressable
                key={item.key}
                onPress={item.onPress}
                disabled={leaving && item.destructive}
                style={[
                  styles.menuItem,
                  idx !== menuItems.length - 1 && styles.menuItemDivider
                ]}
              >
                <View
                  style={[
                    styles.menuIconWrap,
                    item.destructive && styles.menuIconWrapDanger
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={item.destructive ? colors.danger : colors.primary}
                  />
                </View>
                <View style={styles.menuCopy}>
                  <Text
                    style={[
                      styles.menuLabel,
                      item.destructive && styles.menuLabelDanger
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text style={styles.menuDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                </View>
                {item.badge ? (
                  <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>{item.badge}</Text>
                  </View>
                ) : null}
                {leaving && item.destructive ? (
                  <ActivityIndicator color={colors.danger} />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={item.destructive ? colors.danger : '#B6BAC3'}
                  />
                )}
              </Pressable>
            ))}
          </View>

          <View style={styles.noticeBox}>
            <View style={styles.noticeIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={colors.primaryDark}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>Seguranca em primeiro lugar</Text>
              <Text style={styles.noticeText}>
                Somente moradores aprovados tem acesso aos servicos e areas do
                condominio.
              </Text>
            </View>
          </View>
        </>
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
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 16,
    marginTop: -4
  },
  centerState: {
    paddingVertical: 32,
    alignItems: 'center'
  },
  errorBox: {
    backgroundColor: '#FBECEC',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 8
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center'
  },
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F2D5D5'
  },
  retryBtnText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700'
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EAF5EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800'
  },
  emptyMessage: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18
  },
  unitCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  unitIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EAF5EF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  unitCopy: {
    flex: 1,
    gap: 2
  },
  unitTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800'
  },
  unitSubtitle: {
    color: colors.textMuted,
    fontSize: 13
  },
  unitLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 6
  },
  unitLink: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700'
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#132016',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  menuItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1EF'
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAF5EF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  menuIconWrapDanger: {
    backgroundColor: '#FBE3E3'
  },
  menuCopy: {
    flex: 1,
    gap: 2
  },
  menuLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800'
  },
  menuLabelDanger: {
    color: colors.danger
  },
  menuDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16
  },
  menuBadge: {
    minWidth: 24,
    paddingHorizontal: 8,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#DCEBDF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  menuBadgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800'
  },
  noticeBox: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: '#EFF6F1',
    borderRadius: 14,
    padding: 14,
    marginTop: 4
  },
  noticeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCEBDF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  noticeTitle: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2
  },
  noticeText: {
    color: colors.primaryDark,
    fontSize: 12,
    lineHeight: 16
  }
});
