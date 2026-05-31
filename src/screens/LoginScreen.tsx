import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  ImageBackground,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { login } from '../api/auth';
import { getMe } from '../api/users';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';
import { extractErrorMessage } from '../utils/extractError';
import type { RootStackParamList } from '../navigation/types';

type LoginNav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export function LoginScreen() {
  const { setTokens, setUser } = useAuthStore();
  const navigation = useNavigation<LoginNav>();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const motion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(motion, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true
    }).start();
  }, [motion]);

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

  function goToSignup() {
    navigation.navigate('Signup');
  }

  const cardStyle = {
    opacity: motion,
    transform: [
      {
        translateY: motion.interpolate({
          inputRange: [0, 1],
          outputRange: [28, 0]
        })
      }
    ]
  };

  return (
    <ImageBackground
      source={require('../../assets/login-bg.png')}
      style={styles.root}
      resizeMode="cover"
    >
      <LinearGradient colors={['rgba(7, 28, 18, 0.74)', 'rgba(5, 22, 14, 0.86)', 'rgba(5, 16, 11, 0.96)']} style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.select({ ios: 'padding', android: undefined })}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={[styles.hero, { opacity: motion }]}>
              <View style={styles.logoRing}>
                <Ionicons name="leaf-outline" size={34} color="#D3E8AE" />
                <View style={styles.logoStem} />
              </View>
              <Text style={styles.wordmark}>SUNNYVALE</Text>
              <Text style={styles.wordmarkSub}>CONNECT</Text>
              <Text style={styles.title}>Bem-vindo(a)</Text>
              <Text style={styles.subtitle}>
                Faca login para acessar seu condominio
              </Text>
            </Animated.View>

            <Animated.View style={[styles.card, cardStyle]}>
              <FieldRow
                icon="person-outline"
                value={username}
                onChangeText={setUsername}
                placeholder="E-mail, CPF ou telefone"
                autoCapitalize="none"
              />
              <FieldRow
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                placeholder="Senha"
                secureTextEntry={!showPassword}
                rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onRightIconPress={() => setShowPassword((v) => !v)}
              />

              <Pressable onPress={() => Alert.alert('Em breve', 'Recuperacao de senha em breve.')}>
                <Text style={styles.forgotPassword}>Esqueceu sua senha?</Text>
              </Pressable>

              <Pressable
                onPress={onLogin}
                disabled={loading}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
              >
                <LinearGradient
                  colors={['#0F8A4B', '#076736']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButtonGradient}
                >
                  <Text style={styles.primaryButtonLabel}>
                    {loading ? 'Carregando...' : 'Entrar'}
                  </Text>
                </LinearGradient>
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                onPress={() => Alert.alert('Em breve', 'Login com biometria em breve.')}
                style={({ pressed }) => [styles.biometricsButton, pressed && styles.buttonPressed]}
              >
                <Ionicons name="finger-print-outline" size={22} color={colors.primary} />
                <Text style={styles.biometricsLabel}>Entrar com biometria</Text>
              </Pressable>

              <Pressable onPress={goToSignup} style={styles.switchRow}>
                <Text style={styles.switchLabel}>Criar conta</Text>
              </Pressable>
            </Animated.View>

            <Text style={styles.version}>Versao 1.0.0</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </ImageBackground>
  );
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type FieldRowProps = {
  icon: IconName;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad';
  rightIcon?: IconName;
  onRightIconPress?: () => void;
};

function FieldRow({
  icon,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
  rightIcon,
  onRightIconPress
}: FieldRowProps) {
  return (
    <View style={styles.fieldRow}>
      <Ionicons name={icon} size={22} color="#8B9199" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8B9199"
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        style={styles.fieldInput}
      />
      {rightIcon ? (
        <Pressable onPress={onRightIconPress} hitSlop={10}>
          <Ionicons name={rightIcon} size={22} color="#8B9199" />
        </Pressable>
      ) : (
        <View style={styles.fieldRightSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  overlay: {
    flex: 1
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32
  },
  scrollContent: {
    minHeight: '100%',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingBottom: 28
  },
  hero: {
    alignItems: 'center',
    gap: 6,
    marginTop: 18
  },
  logoRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 2,
    borderColor: '#D3E8AE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  logoStem: {
    position: 'absolute',
    width: 3,
    height: 18,
    backgroundColor: '#D3E8AE',
    bottom: -10,
    borderRadius: 4
  },
  wordmark: {
    color: '#F1F7F2',
    fontSize: 24,
    letterSpacing: 4.5,
    fontWeight: '300'
  },
  wordmarkSub: {
    color: '#C5DEA2',
    fontSize: 12,
    letterSpacing: 4,
    fontWeight: '500',
    marginBottom: 8
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 33,
    fontWeight: '700'
  },
  subtitle: {
    color: '#E4ECE6',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16
  },
  card: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E8EA',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E3E6EB',
    minHeight: 54,
    gap: 12
  },
  fieldInput: {
    flex: 1,
    color: '#2A3037',
    fontSize: 15,
    height: 42
  },
  fieldRightSpacer: {
    width: 22
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    color: '#0A7B43',
    fontWeight: '700',
    fontSize: 14,
    marginTop: 8
  },
  primaryButton: {
    marginTop: 10
  },
  primaryButtonGradient: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryButtonLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.4
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 10
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E4E8EC'
  },
  dividerText: {
    color: '#5A616A',
    fontWeight: '600',
    fontSize: 14
  },
  biometricsButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D5DAE0',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 6
  },
  biometricsLabel: {
    color: '#5F6670',
    fontSize: 16,
    fontWeight: '500'
  },
  switchRow: {
    alignItems: 'center',
    marginTop: 8
  },
  switchLabel: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 14
  },
  version: {
    color: '#D0D8D2',
    textAlign: 'center',
    fontSize: 13,
    marginTop: 14
  },
  buttonPressed: {
    opacity: 0.85
  }
});
