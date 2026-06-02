import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen } from '../components/AppScreen';
import { colors } from '../theme/colors';
import { listUsers } from '../api/users';
import type { User, UserRole } from '../types/domain';
import type { RootStackParamList } from '../navigation/types';

type FilterKey = 'all' | UserRole;

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  RESIDENT: 'Morador',
  EMPLOYEE: 'Funcionario'
};

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

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'RESIDENT', label: 'Moradores' },
  { key: 'ADMIN', label: 'Administradores' },
  { key: 'EMPLOYEE', label: 'Funcionarios' }
];

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function getApartmentLabel(u: User): string | null {
  const apt = u.apartment?.trim();
  if (!apt) return null;
  const block = u.block?.trim();
  return block ? `Apto ${apt}/${block}` : `Apto ${apt}`;
}

type UsersNav = NativeStackNavigationProp<RootStackParamList, 'Users'>;
type UsersRouteProp = RouteProp<RootStackParamList, 'Users'>;

export function UsersScreen() {
  const navigation = useNavigation<UsersNav>();
  const route = useRoute<UsersRouteProp>();
  const initialFilter: FilterKey = route.params?.initialRole ?? 'all';

  const [users, setUsers] = useState<User[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>(initialFilter);
  const [search, setSearch] = useState('');

  const loadUsers = useCallback(async () => {
    setRefreshing(true);
    try {
      const list = await listUsers();
      setUsers(list);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers])
  );

  const counts = useMemo(() => {
    const acc: Record<FilterKey, number> = {
      all: users.length,
      ADMIN: 0,
      RESIDENT: 0,
      EMPLOYEE: 0
    };
    users.forEach((u) => {
      acc[u.role] = (acc[u.role] ?? 0) + 1;
    });
    return acc;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => (filter === 'all' ? true : u.role === filter))
      .filter((u) => {
        if (!q) return true;
        const name = (u.full_name ?? '').toLowerCase();
        const apt = getApartmentLabel(u)?.toLowerCase() ?? '';
        return (
          name.includes(q) ||
          u.username.toLowerCase().includes(q) ||
          (u.email ?? '').toLowerCase().includes(q) ||
          apt.includes(q)
        );
      })
      .sort((a, b) =>
        (a.full_name ?? a.username).localeCompare(b.full_name ?? b.username, 'pt-BR')
      );
  }, [users, filter, search]);

  function handleBack() {
    if (navigation.canGoBack()) navigation.goBack();
  }

  function openUser(user: User) {
    navigation.navigate('UserDetails', { userId: user.id });
  }

  return (
    <AppScreen onRefresh={loadUsers} refreshing={refreshing}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerSide} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Usuarios</Text>
        <View style={styles.headerSide} />
      </View>

      <View style={styles.searchField}>
        <Ionicons name="search" size={16} color="#8D93A1" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome, apto ou e-mail"
          placeholderTextColor="#B6BAC3"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {search.length > 0 ? (
          <Pressable hitSlop={8} onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#B6BAC3" />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = counts[f.key];
          return (
            <Pressable
              key={f.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setFilter(f.key)}
              hitSlop={4}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {f.label}
              </Text>
              <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                <Text
                  style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}
                >
                  {count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {filteredUsers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="people-outline" size={26} color="#B6BAC3" />
          <Text style={styles.emptyText}>
            {users.length === 0
              ? 'Nenhum usuario cadastrado.'
              : 'Nenhum usuario encontrado.'}
          </Text>
        </View>
      ) : (
        <View style={styles.listWrap}>
          {filteredUsers.map((u, idx) => {
            const roleStyle = ROLE_STYLES[u.role];
            const apt = getApartmentLabel(u);
            const name = u.full_name?.trim() || u.username;
            const isLast = idx === filteredUsers.length - 1;
            return (
              <Pressable
                key={u.id}
                style={[styles.userRow, !isLast && styles.userRowDivider]}
                onPress={() => openUser(u)}
              >
                {u.photo ? (
                  <Image source={{ uri: u.photo }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(name)}</Text>
                  </View>
                )}
                <View style={styles.rowCopy}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {name}
                  </Text>
                  <View style={styles.rowMetaLine}>
                    <View
                      style={[styles.rolePill, { backgroundColor: roleStyle.bg }]}
                    >
                      <Text
                        style={[styles.rolePillText, { color: roleStyle.color }]}
                      >
                        {roleStyle.label}
                      </Text>
                    </View>
                    {apt ? (
                      <Text style={styles.rowMetaText} numberOfLines={1}>
                        {apt}
                      </Text>
                    ) : (
                      <Text style={styles.rowMetaText} numberOfLines={1}>
                        @{u.username}
                      </Text>
                    )}
                  </View>
                  {u.is_active === false ? (
                    <View style={styles.inactivePill}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={11}
                        color={colors.warning}
                      />
                      <Text style={styles.inactiveText}>Inativo</Text>
                    </View>
                  ) : null}
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>
            );
          })}
        </View>
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
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    shadowColor: '#132016',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingVertical: 0
  },
  tabsRow: {
    gap: 8,
    paddingVertical: 2,
    paddingHorizontal: 2
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E8E6'
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  tabLabel: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700'
  },
  tabLabelActive: {
    color: '#FFFFFF'
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: '#F1F4F2',
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)'
  },
  tabBadgeText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '800'
  },
  tabBadgeTextActive: {
    color: '#FFFFFF'
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
  listWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 4,
    shadowColor: '#132016',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  userRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F1'
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EAF5EF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 13
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EAF5EF'
  },
  rowCopy: {
    flex: 1,
    gap: 4
  },
  rowName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800'
  },
  rowMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap'
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  rowMetaText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1
  },
  inactivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#FFF1D6'
  },
  inactiveText: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  }
});
