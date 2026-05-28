import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { AppScreen } from '../components/AppScreen';
import { SectionHeader } from '../components/SectionHeader';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { AppInput } from '../components/AppInput';
import { getMe, listUsers, patchMe, deleteUser } from '../api/users';
import type { User } from '../types/domain';
import { colors } from '../theme/colors';
import { extractErrorMessage } from '../utils/extractError';

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, setUser, logout } = useAuthStore();
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    setFirstName(user?.first_name ?? '');
    setLastName(user?.last_name ?? '');
    setEmail(user?.email ?? '');
  }, [user]);

  async function refreshMe() {
    try {
      const me = await getMe();
      setUser(me);
    } catch (error) {
      Alert.alert('Falha ao atualizar perfil', extractErrorMessage(error));
    }
  }

  async function saveProfile() {
    try {
      const me = await patchMe({ first_name: firstName, last_name: lastName, email });
      setUser(me);
      Alert.alert('Perfil atualizado');
    } catch (error) {
      Alert.alert('Falha ao salvar perfil', extractErrorMessage(error));
    }
  }

  async function loadUsers() {
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (error) {
      Alert.alert('Falha ao listar usuarios', extractErrorMessage(error));
    }
  }

  async function removeUser(id: number) {
    try {
      await deleteUser(id);
      await loadUsers();
    } catch (error) {
      Alert.alert('Falha ao excluir usuario', extractErrorMessage(error));
    }
  }

  return (
    <AppScreen>
      <SectionHeader title="Perfil" subtitle="Dados do morador e atalhos" />

      <AppCard>
        <Text style={styles.name}>{user?.first_name} {user?.last_name}</Text>
        <Text style={styles.user}>@{user?.username}</Text>
      </AppCard>

      <AppCard>
        <Text style={styles.blockTitle}>Editar meus dados</Text>
        <AppInput label="Nome" value={firstName} onChangeText={setFirstName} />
        <AppInput label="Sobrenome" value={lastName} onChangeText={setLastName} />
        <AppInput label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <View style={styles.row}>
          <AppButton title="Atualizar" onPress={saveProfile} style={styles.action} />
          <AppButton title="Recarregar" variant="ghost" onPress={refreshMe} style={styles.action} />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.blockTitle}>Acoes rapidas</Text>
        <View style={styles.row}>
          <AppButton title="Visitantes" onPress={() => navigation.navigate('Visitors')} style={styles.action} />
          <AppButton title="Solicitacoes" onPress={() => navigation.navigate('ServiceRequests')} style={styles.action} />
        </View>
        <AppButton title="Check-in por link" variant="ghost" onPress={() => navigation.navigate('VisitorCheckin')} />
      </AppCard>

      <AppCard>
        <Text style={styles.blockTitle}>Usuarios (rota /user/)</Text>
        <AppButton title="Carregar usuarios" variant="ghost" onPress={loadUsers} />
        {users.map((u) => (
          <View key={u.id} style={styles.userRow}>
            <View>
              <Text style={styles.userName}>{u.first_name} {u.last_name}</Text>
              <Text style={styles.userEmail}>{u.email}</Text>
            </View>
            <AppButton title="Excluir" variant="danger" onPress={() => removeUser(u.id)} />
          </View>
        ))}
      </AppCard>

      <AppButton title="Sair" variant="danger" onPress={logout} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  name: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800'
  },
  user: {
    color: colors.textMuted,
    marginTop: 2
  },
  blockTitle: {
    marginBottom: 10,
    fontWeight: '700',
    color: colors.textPrimary
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6
  },
  action: {
    flex: 1
  },
  userRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 8
  },
  userName: {
    fontWeight: '700',
    color: colors.textPrimary
  },
  userEmail: {
    color: colors.textMuted
  }
});
