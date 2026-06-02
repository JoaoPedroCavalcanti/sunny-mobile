import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { AppScreen } from '../components/AppScreen';
import { colors } from '../theme/colors';
import { useAuthStore } from '../store/authStore';
import { parseDateInput } from '../utils/date';
import type {
  HouseholdMembershipRole,
  HouseholdMembershipStatus
} from '../types/domain';
import type { CasaStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<CasaStackParamList, 'MemberDetails'>;
type RouteProps = RouteProp<CasaStackParamList, 'MemberDetails'>;

type IconName = keyof typeof Ionicons.glyphMap;

function getInitials(name: string | null | undefined, fallback: string): string {
  const source = (name && name.trim()) || fallback;
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function formatPhone(value: string | null): string {
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

function formatCpf(value: string | null): string {
  if (!value) return '—';
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return value;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatDateTimeBR(value: string | null): string {
  if (!value) return '—';
  const d = parseDateInput(value);
  if (Number.isNaN(d.getTime())) return value;
  const date = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d);
  const time = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
  return `${date} às ${time}`;
}

function roleLabel(role: HouseholdMembershipRole): string {
  return role === 'HOLDER' ? 'Titular' : 'Morador';
}

type StatusConfig = {
  label: string;
  bg: string;
  color: string;
  dot: string;
};

function statusConfig(status: HouseholdMembershipStatus): StatusConfig {
  switch (status) {
    case 'ACTIVE':
      return {
        label: 'Ativo',
        bg: '#DCEBDF',
        color: colors.primaryDark,
        dot: colors.primary
      };
    case 'PENDING_HOLDER':
      return {
        label: 'Aguardando titular',
        bg: '#FFF1D6',
        color: colors.warning,
        dot: colors.warning
      };
    case 'PENDING_ADMIN':
      return {
        label: 'Aguardando administrador',
        bg: '#FFF1D6',
        color: colors.warning,
        dot: colors.warning
      };
    case 'LEFT':
    default:
      return {
        label: 'Saiu',
        bg: '#EAECEE',
        color: colors.textMuted,
        dot: colors.textMuted
      };
  }
}

export function MemberDetailsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const me = useAuthStore((state) => state.user);
  const membership = route.params.membership;
  const { user } = membership;

  const isMe = me?.id === user.id;
  const isHolder = membership.role === 'HOLDER';
  const isActive = membership.status === 'ACTIVE';

  const status = statusConfig(membership.status);
  const name = user.full_name || user.username;

  function handleBack() {
    if (navigation.canGoBack()) navigation.goBack();
  }

  function handleMenu() {
    Alert.alert('Acoes', 'Mais acoes em breve.');
  }

  function handleRemove() {
    if (isMe) {
      Alert.alert(
        'Sair da unidade',
        'Voce quer sair do apartamento? Essa acao precisa de aprovacao do titular.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sair',
            style: 'destructive',
            onPress: () =>
              Alert.alert('Em breve', 'Funcionalidade em desenvolvimento.')
          }
        ]
      );
      return;
    }

    Alert.alert(
      'Remover morador',
      `Deseja remover ${name} do apartamento? Essa acao nao pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Em breve', 'Funcionalidade em desenvolvimento.')
        }
      ]
    );
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerSide} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Detalhes do morador</Text>
        <Pressable onPress={handleMenu} style={styles.headerSide} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getInitials(user.full_name, user.username)}
          </Text>
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroName} numberOfLines={2}>
            {name}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
            <Text style={[styles.statusPillText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
          <View style={styles.heroRoleRow}>
            <Ionicons name="person-outline" size={14} color={colors.textMuted} />
            <Text style={styles.heroRole}>{roleLabel(membership.role)}</Text>
            {isMe ? (
              <View style={styles.meBadge}>
                <Text style={styles.meBadgeText}>Voce</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <Section title="Informacoes pessoais">
        <InfoRow icon="mail-outline" label="E-mail" value={user.email || '—'} />
        <InfoRow
          icon="call-outline"
          label="Telefone"
          value={formatPhone(user.phone)}
          isLast={!user.cpf}
        />
        {user.cpf ? (
          <InfoRow
            icon="card-outline"
            label="CPF"
            value={formatCpf(user.cpf)}
            isLast
          />
        ) : null}
      </Section>

      <Section title="Informacoes do vinculo">
        <InfoRow
          icon="person-outline"
          label="Cargo/Tipo"
          value={roleLabel(membership.role)}
        />
        <InfoRow
          icon="at-outline"
          label="Usuario"
          value={user.username}
        />
        <InfoRow
          icon="calendar-outline"
          label="Data de entrada"
          value={formatDateTimeBR(membership.joined_at)}
        />
        <InfoRow
          icon="calendar-outline"
          label="Data de saida"
          value={formatDateTimeBR(membership.left_at)}
          isLast
        />
      </Section>

      {isActive ? (
        <Pressable
          onPress={handleRemove}
          style={({ pressed }) => [
            styles.removeButton,
            pressed && styles.removeButtonPressed
          ]}
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={styles.removeButtonText}>
            {isMe ? 'Sair da unidade' : isHolder ? 'Remover titular' : 'Remover morador'}
          </Text>
        </Pressable>
      ) : null}
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
        <Text style={styles.rowValue}>{value}</Text>
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
  heroCopy: {
    flex: 1,
    gap: 6
  },
  heroName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800'
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start'
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700'
  },
  heroRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  heroRole: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600'
  },
  meBadge: {
    backgroundColor: '#EAF1FB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginLeft: 4
  },
  meBadgeText: {
    color: '#1F5AA8',
    fontSize: 11,
    fontWeight: '700'
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
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F2D5D5',
    marginTop: 8
  },
  removeButtonPressed: {
    opacity: 0.85
  },
  removeButtonText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700'
  }
});
