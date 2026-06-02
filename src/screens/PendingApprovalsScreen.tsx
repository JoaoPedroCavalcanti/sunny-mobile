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
import {
  approvePendingApproval,
  listHouseholdDecisions,
  listHouseholds,
  listPendingApprovals,
  rejectPendingApproval
} from '../api/households';
import { extractErrorMessage } from '../utils/extractError';
import { parseDateInput } from '../utils/date';
import type {
  Household,
  HouseholdMembershipRole,
  MembershipDecision,
  PendingApproval
} from '../types/domain';
import type { CasaStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<CasaStackParamList, 'PendingApprovals'>;
type TabKey = 'pending' | 'history';

function getInitials(name: string | null | undefined, fallback: string): string {
  const source = (name && name.trim()) || fallback;
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function formatRequestDate(value: string): string {
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

function partyName(party: { full_name?: string | null; username?: string | null } | null | undefined): string {
  if (!party) return 'Usuario removido';
  return party.full_name?.trim() || party.username?.trim() || 'Usuario removido';
}

export function PendingApprovalsScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<PendingApproval[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [decisions, setDecisions] = useState<MembershipDecision[]>([]);
  const [decisionsLoaded, setDecisionsLoaded] = useState(false);
  const [loadingDecisions, setLoadingDecisions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [tab, setTab] = useState<TabKey>('pending');

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const [pending, houseResults] = await Promise.all([
          listPendingApprovals(),
          listHouseholds().catch(() => [])
        ]);
        setItems(pending);
        const active =
          houseResults.find((h) => h.status === 'ACTIVE') ??
          houseResults[0] ??
          null;
        setHousehold(active);
        setDecisionsLoaded(false);
      } catch (e) {
        setError(extractErrorMessage(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  const loadDecisions = useCallback(async () => {
    if (!household) {
      setDecisions([]);
      setDecisionsLoaded(true);
      return;
    }
    setLoadingDecisions(true);
    try {
      const data = await listHouseholdDecisions(household.id);
      const sorted = [...data].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setDecisions(sorted);
      setDecisionsLoaded(true);
    } catch (e) {
      Alert.alert('Falha ao carregar historico', extractErrorMessage(e));
    } finally {
      setLoadingDecisions(false);
    }
  }, [household]);

  useEffect(() => {
    load('initial');
  }, [load]);

  useEffect(() => {
    if (tab === 'history' && !decisionsLoaded && !loadingDecisions) {
      loadDecisions();
    }
  }, [tab, decisionsLoaded, loadingDecisions, loadDecisions]);

  const pendingItems = useMemo(() => items, [items]);
  const pendingCount = pendingItems.length;
  const historyCount = decisionsLoaded ? decisions.length : null;

  function handleBack() {
    if (navigation.canGoBack()) navigation.goBack();
  }

  function handleInfo() {
    Alert.alert(
      'Sobre as aprovacoes',
      'Solicitacoes de moradores aguardam aprovacao do titular ou do administrador. Apos aprovado, o usuario passa a ter acesso ao app e aos servicos do condominio.'
    );
  }

  function handleRefresh() {
    load('refresh');
    if (tab === 'history') {
      setDecisionsLoaded(false);
    }
  }

  async function performAction(
    item: PendingApproval,
    action: 'approve' | 'reject'
  ) {
    try {
      setActingId(item.id);
      if (action === 'approve') {
        await approvePendingApproval(item);
      } else {
        await rejectPendingApproval(item);
      }
      setItems((prev) => prev.filter((p) => p.id !== item.id));
      setDecisionsLoaded(false);
    } catch (e) {
      Alert.alert(
        action === 'approve' ? 'Falha ao aprovar' : 'Falha ao recusar',
        extractErrorMessage(e)
      );
    } finally {
      setActingId(null);
    }
  }

  function confirmAction(item: PendingApproval, action: 'approve' | 'reject') {
    const name = item.user.full_name || item.user.username;
    if (action === 'approve') {
      Alert.alert(
        'Aprovar morador',
        `Confirma a aprovacao de ${name}? Ele(a) tera acesso ao app.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Aprovar', onPress: () => performAction(item, 'approve') }
        ]
      );
      return;
    }
    Alert.alert(
      'Recusar morador',
      `Tem certeza que deseja recusar ${name}? Essa acao nao pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Recusar',
          style: 'destructive',
          onPress: () => performAction(item, 'reject')
        }
      ]
    );
  }

  return (
    <AppScreen onRefresh={handleRefresh} refreshing={refreshing}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerSide} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Moradores pendentes</Text>
        <Pressable onPress={handleInfo} style={styles.headerSide} hitSlop={8}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color={colors.textPrimary}
          />
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Estes usuarios solicitaram acesso a sua unidade e aguardam aprovacao.
      </Text>

      <View style={styles.tabsRow}>
        <TabButton
          label="Pendentes"
          count={pendingCount}
          active={tab === 'pending'}
          activeColor={colors.primary}
          onPress={() => setTab('pending')}
        />
        <TabButton
          label="Historico"
          count={historyCount}
          active={tab === 'history'}
          activeColor={colors.primary}
          onPress={() => setTab('history')}
        />
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
      ) : tab === 'history' ? (
        loadingDecisions ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : !household ? (
          <EmptyState
            icon="home-outline"
            title="Sem unidade ativa"
            message="O historico fica disponivel apos voce estar vinculado a uma unidade."
          />
        ) : decisions.length === 0 ? (
          <EmptyState
            icon="time-outline"
            title="Sem decisoes ainda"
            message="As aprovacoes e recusas feitas no seu apartamento aparecem aqui."
          />
        ) : (
          <View style={styles.list}>
            {decisions.map((d) => (
              <DecisionCard key={d.id} decision={d} />
            ))}
          </View>
        )
      ) : pendingItems.length === 0 ? (
        <EmptyState
          icon="checkmark-done-outline"
          title="Nenhum pedido pendente"
          message="Quando algum morador solicitar acesso a sua unidade, ele aparece aqui."
        />
      ) : (
        <>
          {pendingItems.map((item) => {
            const acting = actingId === item.id;
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardBody}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {getInitials(item.user.full_name, item.user.username)}
                    </Text>
                  </View>
                  <View style={styles.bodyCopy}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.user.full_name || item.user.username}
                      </Text>
                      <View style={styles.statusPill}>
                        <Text style={styles.statusPillText}>Aguardando</Text>
                      </View>
                    </View>
                    {item.user.email ? (
                      <Text style={styles.meta} numberOfLines={1}>
                        {item.user.email}
                      </Text>
                    ) : null}
                    <Text style={styles.meta}>
                      Solicitado em {formatRequestDate(item.joined_at)}
                    </Text>
                    <View style={styles.roleRow}>
                      <Ionicons
                        name="person-outline"
                        size={14}
                        color={colors.textMuted}
                      />
                      <Text style={styles.roleText}>{roleLabel(item.role)}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.actionsRow}>
                  {acting ? (
                    <View style={styles.actionLoading}>
                      <ActivityIndicator color={colors.primary} />
                    </View>
                  ) : (
                    <>
                      <Pressable
                        onPress={() => confirmAction(item, 'approve')}
                        style={({ pressed }) => [
                          styles.actionButton,
                          pressed && styles.actionButtonPressed
                        ]}
                      >
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={18}
                          color={colors.primary}
                        />
                        <Text style={[styles.actionText, styles.approveText]}>
                          Aprovar
                        </Text>
                      </Pressable>
                      <View style={styles.actionDivider} />
                      <Pressable
                        onPress={() => confirmAction(item, 'reject')}
                        style={({ pressed }) => [
                          styles.actionButton,
                          pressed && styles.actionButtonPressed
                        ]}
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={18}
                          color={colors.danger}
                        />
                        <Text style={[styles.actionText, styles.rejectText]}>
                          Recusar
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            );
          })}

          <View style={styles.tipBox}>
            <View style={styles.tipIcon}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Apos a aprovacao</Text>
              <Text style={styles.tipText}>
                O morador recebera acesso ao app e podera utilizar os servicos do
                condominio.
              </Text>
            </View>
          </View>
        </>
      )}
    </AppScreen>
  );
}

type TabButtonProps = {
  label: string;
  count: number | null;
  active: boolean;
  activeColor: string;
  onPress: () => void;
};

function TabButton({ label, count, active, activeColor, onPress }: TabButtonProps) {
  return (
    <Pressable style={styles.tabButton} onPress={onPress} hitSlop={6}>
      <View style={styles.tabLabelRow}>
        <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
          {label}
        </Text>
        {count !== null ? (
          <View
            style={[
              styles.tabBadge,
              active && { backgroundColor: activeColor }
            ]}
          >
            <Text
              style={[
                styles.tabBadgeText,
                active && styles.tabBadgeTextActive
              ]}
            >
              {count}
            </Text>
          </View>
        ) : null}
      </View>
      <View
        style={[styles.tabUnderline, active && { backgroundColor: activeColor }]}
      />
    </Pressable>
  );
}

type DecisionCardProps = {
  decision: MembershipDecision;
};

function DecisionCard({ decision }: DecisionCardProps) {
  const targetName = partyName(decision.target);
  const actorName = partyName(decision.actor);
  const isApproved = decision.action === 'APPROVED';
  return (
    <View style={styles.decisionCard}>
      <View style={styles.cardBody}>
        <View
          style={[
            styles.avatar,
            isApproved ? styles.avatarApproved : styles.avatarRejected
          ]}
        >
          <Text
            style={[
              styles.avatarText,
              isApproved ? styles.avatarTextApproved : styles.avatarTextRejected
            ]}
          >
            {getInitials(
              typeof decision.target.full_name === 'string'
                ? decision.target.full_name
                : null,
              typeof decision.target.username === 'string'
                ? decision.target.username
                : '?'
            )}
          </Text>
        </View>
        <View style={styles.bodyCopy}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {targetName}
            </Text>
            <View
              style={[
                styles.statusPill,
                isApproved ? styles.pillApproved : styles.pillRejected
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  isApproved
                    ? styles.pillTextApproved
                    : styles.pillTextRejected
                ]}
              >
                {isApproved ? 'Aprovado' : 'Recusado'}
              </Text>
            </View>
          </View>
          <Text style={styles.meta}>por {actorName}</Text>
          <Text style={styles.meta}>{formatRequestDate(decision.created_at)}</Text>
          {decision.reason ? (
            <View style={styles.reasonBox}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={14}
                color={colors.textMuted}
              />
              <Text style={styles.reasonText}>{decision.reason}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
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
    paddingHorizontal: 12,
    marginTop: -4
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1EF',
    marginTop: 4
  },
  tabButton: {
    flex: 1,
    alignItems: 'center'
  },
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10
  },
  tabLabel: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600'
  },
  tabLabelActive: {
    color: colors.textPrimary,
    fontWeight: '800'
  },
  tabBadge: {
    minWidth: 22,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F0F2F1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabBadgeText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800'
  },
  tabBadgeTextActive: {
    color: '#FFFFFF'
  },
  tabUnderline: {
    height: 3,
    width: '70%',
    borderRadius: 2,
    backgroundColor: 'transparent'
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#132016',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  decisionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#132016',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  cardBody: {
    flexDirection: 'row',
    gap: 14,
    padding: 14
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EAF5EF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 20
  },
  avatarApproved: {
    backgroundColor: '#DCEBDF'
  },
  avatarRejected: {
    backgroundColor: '#FBE3E3'
  },
  avatarTextApproved: {
    color: colors.primaryDark
  },
  avatarTextRejected: {
    color: colors.danger
  },
  pillApproved: {
    backgroundColor: '#DCEBDF'
  },
  pillRejected: {
    backgroundColor: '#FBE3E3'
  },
  pillTextApproved: {
    color: colors.primaryDark
  },
  pillTextRejected: {
    color: colors.danger
  },
  reasonBox: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F4F6F5',
    borderRadius: 10
  },
  reasonText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16
  },
  bodyCopy: {
    flex: 1,
    gap: 4
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap'
  },
  name: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 1
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#EAF1FB'
  },
  statusPillText: {
    color: '#1F5AA8',
    fontSize: 11,
    fontWeight: '700'
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2
  },
  roleText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600'
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderTopWidth: 1,
    borderTopColor: '#EEF1EF'
  },
  actionLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: '100%'
  },
  actionButtonPressed: {
    opacity: 0.7
  },
  actionDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#EEF1EF'
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700'
  },
  approveText: {
    color: colors.primary
  },
  rejectText: {
    color: colors.danger
  },
  tipBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: '#EFF6F1',
    borderRadius: 14,
    padding: 12
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCEBDF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  tipTitle: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2
  },
  tipText: {
    color: colors.primaryDark,
    fontSize: 12,
    lineHeight: 16
  }
});
