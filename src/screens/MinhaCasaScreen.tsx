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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen } from '../components/AppScreen';
import { colors } from '../theme/colors';
import { listHouseholds } from '../api/households';
import { extractErrorMessage } from '../utils/extractError';
import type { Household, HouseholdStatus } from '../types/domain';
import type { CasaStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<CasaStackParamList, 'CasaMenu'>;

type IconName = keyof typeof Ionicons.glyphMap;

type MenuItem = {
  key: string;
  icon: IconName;
  label: string;
  description?: string;
  badge?: string;
  onPress: () => void;
  disabled?: boolean;
};

type StatusConfig = { label: string; color: string; bg: string };

function statusConfig(status: HouseholdStatus): StatusConfig {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Ativo', color: colors.primaryDark, bg: '#DCEBDF' };
    case 'PENDING_ADMIN':
      return { label: 'Aguardando aprovacao', color: colors.warning, bg: '#FFF1D6' };
    case 'ARCHIVED':
    default:
      return { label: 'Arquivado', color: colors.textMuted, bg: '#EAECEE' };
  }
}

export function MinhaCasaScreen() {
  const navigation = useNavigation<Nav>();
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const results = await listHouseholds();
        const active =
          results.find((h) => h.status === 'ACTIVE') ?? results[0] ?? null;
        setHousehold(active);
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

  const activeMembersCount =
    household?.members?.filter((m) => m.status === 'ACTIVE').length ?? 0;

  function openMembers() {
    navigation.navigate('Members');
  }

  function comingSoon(title: string) {
    return () => Alert.alert(title, 'Funcionalidade em desenvolvimento. Em breve!');
  }

  const menuItems: MenuItem[] = [
    {
      key: 'moradores',
      icon: 'people-outline',
      label: 'Moradores',
      description: 'Veja quem mora com voce, papeis e datas de entrada.',
      badge: activeMembersCount > 0 ? String(activeMembersCount) : undefined,
      onPress: openMembers
    },
    {
      key: 'dependentes',
      icon: 'happy-outline',
      label: 'Dependentes',
      description: 'Filhos e familiares sem conta no app.',
      onPress: comingSoon('Dependentes'),
      disabled: true
    },
    {
      key: 'convites',
      icon: 'mail-open-outline',
      label: 'Convites pendentes',
      description: 'Solicitacoes de entrada na unidade.',
      onPress: comingSoon('Convites pendentes'),
      disabled: true
    },
    {
      key: 'sair-unidade',
      icon: 'log-out-outline',
      label: 'Sair da unidade',
      description: 'Encerra o seu vinculo com esse apartamento.',
      onPress: comingSoon('Sair da unidade'),
      disabled: true
    }
  ];

  return (
    <AppScreen onRefresh={() => load('refresh')} refreshing={refreshing}>
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <Text style={styles.headerTitle}>Minha casa</Text>
        <View style={styles.headerSide} />
      </View>

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
            <Ionicons name="home-outline" size={26} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Sem apartamento ativo</Text>
          <Text style={styles.emptyMessage}>
            Voce ainda nao esta vinculado(a) a um apartamento.
          </Text>
        </View>
      ) : (
        <>
          <HeroCard household={household} membersCount={activeMembersCount} />

          <View style={styles.menuCard}>
            {menuItems.map((item, idx) => (
              <Pressable
                key={item.key}
                onPress={item.onPress}
                style={[
                  styles.menuItem,
                  idx !== menuItems.length - 1 && styles.menuItemDivider
                ]}
              >
                <View
                  style={[
                    styles.menuIconWrap,
                    item.disabled && styles.menuIconWrapDisabled
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={item.disabled ? colors.textMuted : colors.primary}
                  />
                </View>
                <View style={styles.menuCopy}>
                  <View style={styles.menuLabelRow}>
                    <Text
                      style={[
                        styles.menuLabel,
                        item.disabled && styles.menuLabelDisabled
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.badge ? (
                      <View style={styles.menuBadge}>
                        <Text style={styles.menuBadgeText}>{item.badge}</Text>
                      </View>
                    ) : null}
                    {item.disabled ? (
                      <View style={styles.soonBadge}>
                        <Text style={styles.soonBadgeText}>Em breve</Text>
                      </View>
                    ) : null}
                  </View>
                  {item.description ? (
                    <Text style={styles.menuDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color="#B6BAC3" />
              </Pressable>
            ))}
          </View>
        </>
      )}
    </AppScreen>
  );
}

type HeroCardProps = {
  household: Household;
  membersCount: number;
};

function HeroCard({ household, membersCount }: HeroCardProps) {
  const status = statusConfig(household.status);
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroIconWrap}>
        <Ionicons name="home" size={28} color={colors.primaryDark} />
      </View>
      <View style={styles.heroCopy}>
        <Text style={styles.heroTitle}>
          Apto {household.apartment}
          {household.block ? ` • Bloco ${household.block}` : ''}
        </Text>
        <View style={styles.heroMetaRow}>
          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusPillText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
          <View style={styles.heroMetaItem}>
            <Ionicons name="people-outline" size={14} color={colors.textMuted} />
            <Text style={styles.heroMetaText}>
              {membersCount}{' '}
              {membersCount === 1 ? 'morador ativo' : 'moradores ativos'}
            </Text>
          </View>
        </View>
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
    height: 36
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800'
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
  heroCard: {
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
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EAF5EF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  heroCopy: {
    flex: 1,
    gap: 6
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800'
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap'
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700'
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  heroMetaText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600'
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EAF5EF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  menuIconWrapDisabled: {
    backgroundColor: '#F0F2F1'
  },
  menuCopy: {
    flex: 1,
    gap: 2
  },
  menuLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap'
  },
  menuLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  },
  menuLabelDisabled: {
    color: colors.textMuted
  },
  menuDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16
  },
  menuBadge: {
    minWidth: 22,
    paddingHorizontal: 8,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  menuBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800'
  },
  soonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#F0F2F1'
  },
  soonBadgeText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700'
  }
});
