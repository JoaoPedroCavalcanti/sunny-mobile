import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen } from '../components/AppScreen';
import { colors } from '../theme/colors';
import { getUser } from '../api/users';
import { parseDateInput } from '../utils/date';
import type { User, UserRole } from '../types/domain';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'UserDetails'>;
type RouteProps = RouteProp<RootStackParamList, 'UserDetails'>;

type IconName = keyof typeof Ionicons.glyphMap;

type RoleStyle = {
  label: string;
  bg: string;
  color: string;
};

const ROLE_STYLES: Record<UserRole, RoleStyle> = {
  ADMIN: { label: 'Administrador', bg: '#EFE7FB', color: '#6E3FD0' },
  RESIDENT: { label: 'Morador', bg: '#EAF5EF', color: '#0F7A43' },
  EMPLOYEE: { label: 'Funcionario', bg: '#E5EEF9', color: '#2E5FA8' }
};

function getInitials(name: string | null | undefined, fallback: string): string {
  const source = (name && name.trim()) || fallback;
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function formatPhone(value?: string | null): string {
  if (!value) return '—';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return value;
}

function formatCpf(value?: string | null): string {
  if (!value) return '—';
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return value;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatBirthDate(value?: string | null): string {
  if (!value) return '—';
  const d = parseDateInput(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d);
}

function buildApartmentLabel(u: User): string {
  const apt = u.apartment?.trim();
  if (!apt) return '—';
  const block = u.block?.trim();
  return block ? `${apt} / ${block}` : apt;
}

export function UserDetailsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { userId } = route.params;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUser(userId);
      setUser(data);
    } catch {
      setError('Nao foi possivel carregar este usuario.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [loadUser])
  );

  function handleBack() {
    if (navigation.canGoBack()) navigation.goBack();
  }

  if (loading) {
    return (
      <AppScreen scroll={false}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.headerSide} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Detalhes do usuario</Text>
          <View style={styles.headerSide} />
        </View>
        <View style={styles.centeredFill}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </AppScreen>
    );
  }

  if (error || !user) {
    return (
      <AppScreen scroll={false}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.headerSide} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Detalhes do usuario</Text>
          <View style={styles.headerSide} />
        </View>
        <View style={styles.centeredFill}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
          <Text style={styles.errorText}>
            {error ?? 'Usuario nao encontrado.'}
          </Text>
          <Pressable style={styles.retryButton} onPress={loadUser}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </Pressable>
        </View>
      </AppScreen>
    );
  }

  const roleStyle = ROLE_STYLES[user.role];
  const name = user.full_name?.trim() || user.username;
  const isInactive = user.is_active === false;

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerSide} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Detalhes do usuario</Text>
        <View style={styles.headerSide} />
      </View>

      <View style={styles.heroCard}>
        {user.photo ? (
          <Image source={{ uri: user.photo }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(user.full_name, user.username)}
            </Text>
          </View>
        )}
        <View style={styles.heroCopy}>
          <Text style={styles.heroName} numberOfLines={2}>
            {name}
          </Text>
          <View style={styles.heroPills}>
            <View style={[styles.rolePill, { backgroundColor: roleStyle.bg }]}>
              <Text style={[styles.rolePillText, { color: roleStyle.color }]}>
                {roleStyle.label}
              </Text>
            </View>
            <View
              style={[
                styles.statusPill,
                isInactive ? styles.statusInactive : styles.statusActive
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isInactive ? colors.warning : colors.primary
                  }
                ]}
              />
              <Text
                style={[
                  styles.statusPillText,
                  { color: isInactive ? colors.warning : colors.primaryDark }
                ]}
              >
                {isInactive ? 'Inativo' : 'Ativo'}
              </Text>
            </View>
          </View>
          <View style={styles.heroMetaRow}>
            <Ionicons name="at-outline" size={14} color={colors.textMuted} />
            <Text style={styles.heroMeta} numberOfLines={1}>
              @{user.username}
            </Text>
          </View>
        </View>
      </View>

      <Section title="Informacoes pessoais">
        <InfoRow icon="mail-outline" label="E-mail" value={user.email || '—'} />
        <InfoRow
          icon="call-outline"
          label="Telefone"
          value={formatPhone(user.phone)}
        />
        <InfoRow
          icon="card-outline"
          label="CPF"
          value={formatCpf(user.cpf)}
        />
        <InfoRow
          icon="calendar-outline"
          label="Data de nascimento"
          value={formatBirthDate(user.birth_date)}
          isLast
        />
      </Section>

      {user.role === 'RESIDENT' ? (
        <Section title="Unidade">
          <InfoRow
            icon="home-outline"
            label="Apartamento / Bloco"
            value={buildApartmentLabel(user)}
            isLast
          />
        </Section>
      ) : null}

      <Section title="Conta">
        <InfoRow icon="person-outline" label="Usuario" value={user.username} />
        <InfoRow
          icon="shield-checkmark-outline"
          label="Permissao"
          value={roleStyle.label}
          isLast
        />
      </Section>
    </AppScreen>
  );
}

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

type InfoRowProps = {
  icon: IconName;
  label: string;
  value: string;
  isLast?: boolean;
};

function InfoRow({ icon, label, value, isLast }: InfoRowProps) {
  return (
    <View style={[styles.row, !isLast && styles.rowDivider]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} selectable>
          {value}
        </Text>
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
    height: 36,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800'
  },
  centeredFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24
  },
  errorText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center'
  },
  retryButton: {
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primary
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#132016',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#EAF5EF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 26
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#EAF5EF'
  },
  heroCopy: {
    flex: 1,
    gap: 8
  },
  heroName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800'
  },
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999
  },
  statusActive: {
    backgroundColor: '#DCEBDF'
  },
  statusInactive: {
    backgroundColor: '#FFF1D6'
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  heroMeta: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600'
  },
  sectionWrap: {
    gap: 8
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 4
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#132016',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1EF'
  },
  rowIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  rowCopy: {
    flex: 1,
    gap: 2
  },
  rowLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600'
  },
  rowValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  }
});
