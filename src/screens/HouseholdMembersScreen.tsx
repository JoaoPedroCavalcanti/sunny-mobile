import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useAuthStore } from '../store/authStore';
import { extractErrorMessage } from '../utils/extractError';
import type {
  Household,
  HouseholdMembership,
  HouseholdMembershipRole
} from '../types/domain';
import type { CasaStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<CasaStackParamList, 'Members'>;

function getInitials(name: string | null | undefined, fallback: string): string {
  const source = (name && name.trim()) || fallback;
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function householdHeaderLabel(h: Household): string {
  return h.block ? `Apto ${h.apartment} • Bloco ${h.block}` : `Apto ${h.apartment}`;
}

function roleSubtitle(role: HouseholdMembershipRole): string {
  return role === 'HOLDER' ? 'Titular da unidade' : 'Morador';
}

function sortMembers(a: HouseholdMembership, b: HouseholdMembership) {
  if (a.role !== b.role) return a.role === 'HOLDER' ? -1 : 1;
  const an = (a.user.full_name || a.user.username || '').toLowerCase();
  const bn = (b.user.full_name || b.user.username || '').toLowerCase();
  return an.localeCompare(bn);
}

export function HouseholdMembersScreen() {
  const navigation = useNavigation<Nav>();
  const me = useAuthStore((state) => state.user);

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

  const members = useMemo<HouseholdMembership[]>(() => {
    const list = household?.members ?? [];
    return [...list].sort(sortMembers);
  }, [household]);

  function handleBack() {
    if (navigation.canGoBack()) navigation.goBack();
  }

  function handleAddMember() {
    Alert.alert(
      'Cadastrar morador',
      'Funcionalidade em desenvolvimento. Em breve!'
    );
  }

  function handleMemberPress(membership: HouseholdMembership) {
    navigation.navigate('MemberDetails', { membership });
  }

  return (
    <AppScreen scroll refreshing={refreshing} onRefresh={() => load('refresh')}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerSide} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Moradores</Text>
        <View style={styles.headerSide} />
      </View>

      <Text style={styles.subtitle}>
        Gerencie os moradores da sua unidade. Aqui voce pode visualizar, adicionar
        e editar os moradores.
      </Text>

      {household ? (
        <View style={styles.unitChip}>
          <Ionicons name="home-outline" size={14} color={colors.primaryDark} />
          <Text style={styles.unitChipText}>{householdHeaderLabel(household)}</Text>
        </View>
      ) : null}

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
        <EmptyState
          icon="home-outline"
          title="Sem apartamento ativo"
          message="Voce ainda nao esta vinculado(a) a um apartamento."
        />
      ) : members.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Nenhum morador ativo"
          message="Quando outros moradores entrarem, eles aparecem aqui."
        />
      ) : (
        <View style={styles.list}>
          {members.map((m) => {
            const isMe = me?.id === m.user.id;
            const name = m.user.full_name || m.user.username;
            return (
              <Pressable
                key={m.id}
                onPress={() => handleMemberPress(m)}
                style={({ pressed }) => [
                  styles.memberCard,
                  pressed && styles.memberCardPressed
                ]}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {getInitials(m.user.full_name, m.user.username)}
                  </Text>
                </View>
                <View style={styles.memberCopy}>
                  <View style={styles.memberNameRow}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {name}
                    </Text>
                    {m.role === 'HOLDER' ? (
                      <View style={styles.holderBadge}>
                        <Text style={styles.holderBadgeText}>Titular</Text>
                      </View>
                    ) : null}
                    {isMe ? (
                      <View style={styles.meBadge}>
                        <Text style={styles.meBadgeText}>Voce</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.memberRole}>{roleSubtitle(m.role)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#B6BAC3" />
              </Pressable>
            );
          })}
        </View>
      )}

      <Pressable
        onPress={handleAddMember}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryButtonPressed
        ]}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.primaryButtonText}>Cadastrar morador</Text>
      </Pressable>
    </AppScreen>
  );
}

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
};

function EmptyState({ icon, title, message }: EmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
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
  unitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: colors.chipBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  unitChipText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700'
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
    gap: 8,
    shadowColor: '#132016',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
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
  list: {
    gap: 10
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#132016',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  memberCardPressed: {
    opacity: 0.85
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EAF5EF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 18
  },
  memberCopy: {
    flex: 1,
    gap: 2
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap'
  },
  memberName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 1
  },
  memberRole: {
    color: colors.textMuted,
    fontSize: 13
  },
  holderBadge: {
    backgroundColor: '#DCEBDF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999
  },
  holderBadgeText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '700'
  },
  meBadge: {
    backgroundColor: '#EAF1FB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999
  },
  meBadgeText: {
    color: '#1F5AA8',
    fontSize: 11,
    fontWeight: '700'
  },
  primaryButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  primaryButtonPressed: {
    opacity: 0.9
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  }
});
