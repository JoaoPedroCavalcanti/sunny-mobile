import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { AppScreen } from '../components/AppScreen';
import { colors } from '../theme/colors';
import { getMe, patchMe } from '../api/users';
import { extractErrorMessage } from '../utils/extractError';

type ProfileNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Perfil'>,
  NativeStackNavigationProp<RootStackParamList>
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

  const [editorOpen, setEditorOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

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

  function openEditor() {
    setFirstName(user?.first_name ?? '');
    setLastName(user?.last_name ?? '');
    setEmail(user?.email ?? '');
    setUsername(user?.username ?? '');
    setPassword('');
    setEditorOpen(true);
  }

  async function submitProfile() {
    const payload: Record<string, string> = {};
    if (firstName.trim() && firstName.trim() !== (user?.first_name ?? '')) {
      payload.first_name = firstName.trim();
    }
    if (lastName.trim() && lastName.trim() !== (user?.last_name ?? '')) {
      payload.last_name = lastName.trim();
    }
    if (email.trim() && email.trim() !== (user?.email ?? '')) {
      payload.email = email.trim();
    }
    if (username.trim() && username.trim() !== (user?.username ?? '')) {
      payload.username = username.trim();
    }
    if (password.trim()) {
      payload.password = password.trim();
    }

    if (Object.keys(payload).length === 0) {
      setEditorOpen(false);
      return;
    }

    try {
      setSubmitting(true);
      const updated = await patchMe(payload);
      setUser(updated);
      setEditorOpen(false);
      Alert.alert('Perfil atualizado', 'Suas informacoes foram salvas com sucesso.');
    } catch (error) {
      Alert.alert('Falha ao atualizar perfil', extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const menuItems: MenuItem[] = [
    {
      key: 'meus-dados',
      icon: 'person-outline',
      label: 'Meus dados',
      onPress: openEditor
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
          <Text style={styles.profileSub}>{user?.email || 'Sem email cadastrado'}</Text>
          <Pressable onPress={openEditor} hitSlop={6} style={styles.editButton}>
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

      <Modal
        visible={editorOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setEditorOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.sheetWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.sheetBackdrop} onPress={() => setEditorOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>Meus dados</Text>
              <Pressable
                onPress={() => setEditorOpen(false)}
                hitSlop={8}
                style={styles.sheetClose}
              >
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.sheetBody}
              contentContainerStyle={styles.sheetBodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <FormField label="Nome" value={firstName} onChangeText={setFirstName} />
              <FormField label="Sobrenome" value={lastName} onChangeText={setLastName} />
              <FormField
                label="E-mail"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <FormField
                label="Usuario"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
              <FormField
                label="Nova senha (opcional)"
                value={password}
                onChangeText={setPassword}
                placeholder="Deixe em branco para manter"
                secureTextEntry
                autoCapitalize="none"
              />
            </ScrollView>

            <View style={styles.sheetActions}>
              <Pressable
                style={[styles.sheetButton, styles.sheetCancel]}
                onPress={() => setEditorOpen(false)}
                disabled={submitting}
              >
                <Text style={styles.sheetCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.sheetButton, styles.sheetSubmit]}
                onPress={submitProfile}
                disabled={submitting}
              >
                <Text style={styles.sheetSubmitText}>
                  {submitting ? 'Salvando...' : 'Salvar'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </AppScreen>
  );
}

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
};

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  secureTextEntry
}: FormFieldProps) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#B6BAC3"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        style={styles.formInput}
      />
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
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 28, 19, 0.45)'
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 14,
    minHeight: 480
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D8DCDA',
    marginBottom: 6
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800'
  },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4F6F5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sheetBody: {
    flexGrow: 0
  },
  sheetBodyContent: {
    gap: 12,
    paddingBottom: 4
  },
  formField: {
    gap: 6
  },
  formLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600'
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E8E6',
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 46,
    color: colors.textPrimary,
    fontSize: 14
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10
  },
  sheetButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sheetCancel: {
    backgroundColor: '#F4F6F5'
  },
  sheetCancelText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14
  },
  sheetSubmit: {
    backgroundColor: colors.primaryDark
  },
  sheetSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14
  }
});
