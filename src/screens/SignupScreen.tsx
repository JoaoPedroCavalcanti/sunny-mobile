import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { createUser } from '../api/users';
import { extractErrorMessage } from '../utils/extractError';
import type { RootStackParamList } from '../navigation/types';

type SignupNav = NativeStackNavigationProp<RootStackParamList, 'Signup'>;

type IconName = keyof typeof Ionicons.glyphMap;

const DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function formatDateMask(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length >= 3) parts[1] = digits.slice(2, 4);
  if (digits.length >= 5) parts[2] = digits.slice(4, 8);
  return parts.filter(Boolean).join('/');
}

function formatCpfMask(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 3));
  if (digits.length >= 4) parts.push(digits.slice(3, 6));
  if (digits.length >= 7) parts.push(digits.slice(6, 9));
  let formatted = parts.join('.');
  if (digits.length >= 10) formatted += '-' + digits.slice(9, 11);
  return formatted;
}

function formatPhoneMask(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function birthDateToApi(value: string): string | null {
  const match = value.match(DATE_REGEX);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return null;
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) return null;
  return `${yyyy}-${mm}-${dd}`;
}

export function SignupScreen() {
  const navigation = useNavigation<SignupNav>();
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [apartment, setApartment] = useState('');
  const [block, setBlock] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleBack() {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Login');
  }

  function goToLogin() {
    navigation.navigate('Login');
  }

  async function handleSubmit() {
    if (
      !username.trim() ||
      !password.trim() ||
      !fullName.trim() ||
      !birthDate.trim() ||
      !cpf.trim() ||
      !phone.trim() ||
      !email.trim() ||
      !apartment.trim()
    ) {
      Alert.alert('Dados incompletos', 'Preencha todos os campos obrigatorios.');
      return;
    }

    const apiBirthDate = birthDateToApi(birthDate);
    if (!apiBirthDate) {
      Alert.alert(
        'Data invalida',
        'Informe a data de nascimento no formato DD/MM/AAAA.'
      );
      return;
    }

    try {
      setSubmitting(true);
      await createUser({
        username: username.trim(),
        password,
        full_name: fullName.trim(),
        birth_date: apiBirthDate,
        cpf: cpf.trim(),
        phone: phone.trim(),
        email: email.trim(),
        apartment: apartment.trim(),
        block: block.trim() || undefined
      });
      Alert.alert('Conta criada', 'Voce ja pode fazer login com suas credenciais.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error) {
      Alert.alert('Falha ao criar conta', extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.headerSide} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Cadastro de usuario</Text>
          <View style={styles.headerSide} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 28 + insets.bottom }
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            Preencha os dados abaixo para criar sua conta.
          </Text>

          <Field
            icon="person-outline"
            label="Nome de usuario"
            value={username}
            onChangeText={setUsername}
            placeholder="Digite seu nome de usuario"
            autoCapitalize="none"
          />

          <Field
            icon="lock-closed-outline"
            label="Senha"
            value={password}
            onChangeText={setPassword}
            placeholder="Digite sua senha"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShowPassword((v) => !v)}
          />

          <Field
            icon="person-outline"
            label="Nome completo"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Digite seu nome completo"
            autoCapitalize="words"
          />

          <Field
            icon="calendar-outline"
            label="Data de nascimento"
            value={birthDate}
            onChangeText={(value) => setBirthDate(formatDateMask(value))}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
            maxLength={10}
            rightIcon="calendar-outline"
          />

          <Field
            icon="card-outline"
            label="CPF"
            value={cpf}
            onChangeText={(value) => setCpf(formatCpfMask(value))}
            placeholder="000.000.000-00"
            keyboardType="number-pad"
            maxLength={14}
          />

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Field
                icon="call-outline"
                label="Telefone"
                value={phone}
                onChangeText={(value) => setPhone(formatPhoneMask(value))}
                placeholder="(00) 00000-0000"
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>
            <View style={styles.flex1}>
              <Field
                icon="mail-outline"
                label="E-mail"
                value={email}
                onChangeText={setEmail}
                placeholder="seu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <Field
            icon="business-outline"
            label="Apartamento/Unidade"
            value={apartment}
            onChangeText={setApartment}
            placeholder="Ex.: 101, 102, 201..."
          />

          <Field
            icon="business-outline"
            label="Bloco/Torre"
            optional
            value={block}
            onChangeText={setBlock}
            placeholder="Ex.: A, B, Torre 1..."
          />

          <View style={styles.photoBlock}>
            <View style={styles.fieldHeader}>
              <Ionicons name="camera-outline" size={20} color={colors.primary} />
              <Text style={styles.fieldLabel}>
                Foto do perfil <Text style={styles.optional}>(opcional)</Text>
              </Text>
            </View>
            <Pressable
              style={styles.photoCard}
              onPress={() =>
                Alert.alert(
                  'Em breve',
                  'Upload de foto sera disponibilizado em breve.'
                )
              }
            >
              <View style={styles.photoCircle}>
                <Ionicons name="camera-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.photoLabel}>Adicionar foto</Text>
              <Text style={styles.photoHint}>PNG ou JPG. Max. 5MB</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              submitting && styles.primaryButtonDisabled
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Cadastrar</Text>
            )}
          </Pressable>

          <Pressable onPress={goToLogin} style={styles.loginLink} hitSlop={6}>
            <Text style={styles.loginLinkText}>
              Ja tem uma conta? <Text style={styles.loginLinkAction}>Entrar</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

type FieldProps = {
  icon: IconName;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  optional?: boolean;
  maxLength?: number;
};

function Field({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  rightIcon,
  onRightIconPress,
  optional,
  maxLength
}: FieldProps) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Ionicons name={icon} size={20} color={colors.primary} />
        <Text style={styles.fieldLabel}>
          {label}
          {optional ? <Text style={styles.optional}> (opcional)</Text> : null}
        </Text>
      </View>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#B6BAC3"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
          style={styles.input}
        />
        {rightIcon ? (
          <Pressable
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            hitSlop={8}
            style={styles.rightIcon}
          >
            <Ionicons name={rightIcon} size={20} color="#9AA0AE" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  flex: {
    flex: 1
  },
  flex1: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6
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
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 14
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 6
  },
  field: {
    gap: 6
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700'
  },
  optional: {
    color: colors.textMuted,
    fontWeight: '500'
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E8E6',
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingVertical: 0
  },
  rightIcon: {
    paddingLeft: 8,
    height: 24,
    justifyContent: 'center'
  },
  row: {
    flexDirection: 'row',
    gap: 10
  },
  photoBlock: {
    gap: 8
  },
  photoCard: {
    borderWidth: 1.5,
    borderColor: '#D2DBD3',
    borderStyle: 'dashed',
    borderRadius: 14,
    backgroundColor: '#F8FBF9',
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  photoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCEBDF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  photoLabel: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4
  },
  photoHint: {
    color: colors.textMuted,
    fontSize: 11
  },
  primaryButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6
  },
  primaryButtonPressed: {
    opacity: 0.9
  },
  primaryButtonDisabled: {
    opacity: 0.7
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 6
  },
  loginLinkText: {
    color: colors.textMuted,
    fontSize: 13
  },
  loginLinkAction: {
    color: colors.primary,
    fontWeight: '700'
  }
});
