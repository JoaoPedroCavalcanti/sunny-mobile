import React, { useEffect } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type {
  MainTabParamList,
  ProfileStackParamList,
  RootStackParamList
} from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { useProfileExtrasStore } from '../store/profileExtraStore';
import { AppScreen } from '../components/AppScreen';
import { colors } from '../theme/colors';
import { getMe } from '../api/users';

type ProfileNav = CompositeNavigationProp<
  NativeStackNavigationProp<ProfileStackParamList, 'ProfileMenu'>,
  CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'Perfil'>,
    NativeStackNavigationProp<RootStackParamList>
  >
>;

type MenuItem = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNav>();
  const { user, logout, setUser } = useAuthStore();
  const apartmentExtra = useProfileExtrasStore((state) => state.extras.apartment);

  useEffect(() => {
    let mounted = true;
    if (!user) {
      getMe()
        .then((me) => {
          if (mounted) setUser(me);
        })
        .catch(() => undefined);
    }
    return () => {
      mounted = false;
    };
  }, [user, setUser]);

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  const displayName = fullName || user?.username || 'Morador';
  const initials = getInitials(displayName) || 'M';

  function comingSoon(title: string) {
    return () => Alert.alert(title, 'Funcionalidade em desenvolvimento. Em breve!');
  }

  function handleBack() {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Home');
  }

  function handleLogout() {
    Alert.alert('Sair da conta', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout }
    ]);
  }

  function openMyData() {
    navigation.navigate('MyData');
  }

  const menuItems: MenuItem[] = [
    {
      key: 'meus-dados',
      icon: 'person-outline',
      label: 'Meus dados',
      onPress: openMyData
    },
    {
      key: 'unidades',
      icon: 'business-outline',
      label: 'Unidades vinculadas',
      onPress: comingSoon('Unidades vinculadas')
    },
    {
      key: 'notificacoes',
      icon: 'notifications-outline',
      label: 'Notificacoes',
      onPress: comingSoon('Notificacoes')
    },
    {
      key: 'ajuda',
      icon: 'help-circle-outline',
      label: 'Ajuda e suporte',
      onPress: comingSoon('Ajuda e suporte')
    },
    {
      key: 'sobre',
      icon: 'information-circle-outline',
      label: 'Sobre o app',
      onPress: comingSoon('Sobre o app')
    }
  ];

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerSide} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Perfil</Text>
        <View style={styles.headerSide} />
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.profileName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.profileSub}>
            {apartmentExtra || user?.email || 'Sem informacoes cadastradas'}
          </Text>
          <Pressable onPress={openMyData} hitSlop={6} style={styles.editButton}>
            <Text style={styles.editButtonText}>Editar perfil</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        </View>
      </View>

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
            <View style={styles.menuIconWrap}>
              <Ionicons name={item.icon} size={20} color={colors.primary} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color="#B6BAC3" />
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </Pressable>
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#132016',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EAF5EF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 22
  },
  profileCopy: {
    flex: 1
  },
  profileName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800'
  },
  profileSub: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 8
  },
  editButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700'
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    shadowColor: '#132016',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    overflow: 'hidden'
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
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  menuLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600'
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F2D5D5'
  },
  logoutText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700'
  }
});
