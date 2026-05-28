import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { login } from '../api/auth';
import { createUser, getMe } from '../api/users';
import { useAuthStore } from '../store/authStore';
import { AppButton } from '../components/AppButton';
import { AppInput } from '../components/AppInput';
import { colors } from '../theme/colors';
import { extractErrorMessage } from '../utils/extractError';

export function LoginScreen() {
  const { setTokens, setUser } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [signupMode, setSignupMode] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onLogin() {
    try {
      setLoading(true);
      const tokens = await login(username, password);
      setTokens({ accessToken: tokens.access, refreshToken: tokens.refresh });
      const me = await getMe();
      setUser(me);
    } catch (error) {
      Alert.alert('Falha no login', extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function onSignup() {
    try {
      setLoading(true);
      await createUser({
        username,
        password,
        first_name: firstName,
        last_name: lastName,
        email
      });
      Alert.alert('Conta criada', 'Agora voce ja pode entrar.');
      setSignupMode(false);
    } catch (error) {
      Alert.alert('Falha ao criar conta', extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={['#0A251A', '#184A35', '#DCE6E1']} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <View style={styles.hero}>
          <Text style={styles.brand}>SUNNYVALE CONNECT</Text>
          <Text style={styles.title}>{signupMode ? 'Criar conta' : 'Bem-vindo(a)'}</Text>
          <Text style={styles.subtitle}>
            {signupMode
              ? 'Cadastro rapido para acessar o condominio'
              : 'Entre para acessar seu condominio'}
          </Text>
        </View>

        <View style={styles.card}>
          {signupMode ? (
            <>
              <AppInput label="Nome" value={firstName} onChangeText={setFirstName} />
              <AppInput label="Sobrenome" value={lastName} onChangeText={setLastName} />
              <AppInput
                label="E-mail"
                value={email}
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={setEmail}
              />
            </>
          ) : null}

          <AppInput label="Usuario" value={username} onChangeText={setUsername} autoCapitalize="none" />
          <AppInput label="Senha" value={password} onChangeText={setPassword} secureTextEntry />

          <AppButton
            title={signupMode ? 'Criar conta' : 'Entrar'}
            onPress={signupMode ? onSignup : onLogin}
            loading={loading}
          />
          <AppButton
            title={signupMode ? 'Ja tenho conta' : 'Criar conta'}
            onPress={() => setSignupMode((v) => !v)}
            variant="ghost"
          />
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 14
  },
  hero: {
    gap: 6
  },
  brand: {
    color: '#DCE6E1',
    letterSpacing: 2,
    fontSize: 13,
    fontWeight: '700'
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800'
  },
  subtitle: {
    color: '#DCE6E1',
    fontSize: 15
  },
  card: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D3DCD7',
    padding: 16,
    gap: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8
  }
});
