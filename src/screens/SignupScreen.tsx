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
import { createUser, type HouseholdRequest } from '../api/users';
import { searchHouseholds } from '../api/households';
import { extractErrorMessage } from '../utils/extractError';
import { brDateToIso, maskBrDate } from '../utils/date';
import type { Household } from '../types/domain';
import type { RootStackParamList } from '../navigation/types';

type SignupNav = NativeStackNavigationProp<RootStackParamList, 'Signup'>;

type IconName = keyof typeof Ionicons.glyphMap;

type HouseholdMode = 'new' | 'existing';


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


function householdLabel(h: Household): string {
  return h.block ? `Apto ${h.apartment} • Bloco ${h.block}` : `Apto ${h.apartment}`;
}

export function SignupScreen() {
  const navigation = useNavigation<SignupNav>();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<1 | 2>(1);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [householdMode, setHouseholdMode] = useState<HouseholdMode>('new');

  const [newApartment, setNewApartment] = useState('');
  const [newBlock, setNewBlock] = useState('');

  const [searchApartment, setSearchApartment] = useState('');
  const [searchBlock, setSearchBlock] = useState('');
  const [searchResults, setSearchResults] = useState<Household[] | null>(null);
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [searching, setSearching] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  function handleBack() {
    if (step === 2) {
      setStep(1);
      return;
    }
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Login');
  }

  function goToLogin() {
    navigation.navigate('Login');
  }

  function goNextFromStep1() {
    if (
      !username.trim() ||
      !password.trim() ||
      !fullName.trim() ||
      !birthDate.trim() ||
      !cpf.trim() ||
      !phone.trim() ||
      !email.trim()
    ) {
      Alert.alert('Dados incompletos', 'Preencha todos os campos obrigatorios.');
      return;
    }
    if (!brDateToIso(birthDate)) {
      Alert.alert(
        'Data invalida',
        'Informe a data de nascimento no formato DD-MM-AAAA.'
      );
      return;
    }
    setStep(2);
  }

  function switchMode(mode: HouseholdMode) {
    setHouseholdMode(mode);
    setSearchResults(null);
    setSelectedHousehold(null);
  }

  async function handleSearch() {
    if (!searchApartment.trim()) {
      Alert.alert('Informe o apartamento', 'Digite o numero do apartamento para buscar.');
      return;
    }
    try {
      setSearching(true);
      setSelectedHousehold(null);
      const results = await searchHouseholds({
        apartment: searchApartment.trim(),
        block: searchBlock.trim() || undefined
      });
      setSearchResults(results);
    } catch (error) {
      Alert.alert('Falha na busca', extractErrorMessage(error));
    } finally {
      setSearching(false);
    }
  }

  function buildHouseholdRequest(): HouseholdRequest | null {
    if (householdMode === 'new') {
      const apt = newApartment.trim();
      if (!apt) {
        Alert.alert('Apartamento obrigatorio', 'Informe o numero do apartamento.');
        return null;
      }
      const blk = newBlock.trim();
      return blk ? { apartment: apt, block: blk } : { apartment: apt };
    }
    if (!selectedHousehold) {
      Alert.alert(
        'Selecione o apartamento',
        'Busque pelo apartamento e selecione o resultado correto.'
      );
      return null;
    }
    return { household_id: selectedHousehold.id };
  }

  async function handleSubmit() {
    const apiBirthDate = brDateToIso(birthDate);
    if (!apiBirthDate) {
      Alert.alert(
        'Data invalida',
        'Informe a data de nascimento no formato DD-MM-AAAA.'
      );
      setStep(1);
      return;
    }

    const household_request = buildHouseholdRequest();
    if (!household_request) return;

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
        household_request
      });
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'SignupPending',
            params: { username: username.trim(), email: email.trim() }
          }
        ]
      });
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

        <View style={styles.stepperRow}>
          <StepDot active={step === 1} done={step > 1} label="1" />
          <View style={[styles.stepperLine, step > 1 && styles.stepperLineActive]} />
          <StepDot active={step === 2} label="2" />
        </View>
        <Text style={styles.stepperCaption}>
          Passo {step} de 2 — {step === 1 ? 'Dados pessoais' : 'Apartamento'}
        </Text>

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
          {step === 1 ? (
            <Step1
              username={username}
              setUsername={setUsername}
              password={password}
              setPassword={setPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              fullName={fullName}
              setFullName={setFullName}
              birthDate={birthDate}
              setBirthDate={setBirthDate}
              cpf={cpf}
              setCpf={setCpf}
              phone={phone}
              setPhone={setPhone}
              email={email}
              setEmail={setEmail}
              onNext={goNextFromStep1}
              onGoToLogin={goToLogin}
            />
          ) : (
            <Step2
              mode={householdMode}
              onModeChange={switchMode}
              newApartment={newApartment}
              setNewApartment={setNewApartment}
              newBlock={newBlock}
              setNewBlock={setNewBlock}
              searchApartment={searchApartment}
              setSearchApartment={setSearchApartment}
              searchBlock={searchBlock}
              setSearchBlock={setSearchBlock}
              searching={searching}
              onSearch={handleSearch}
              searchResults={searchResults}
              selectedHousehold={selectedHousehold}
              onSelectHousehold={setSelectedHousehold}
              submitting={submitting}
              onSubmit={handleSubmit}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

type Step1Props = {
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (fn: (v: boolean) => boolean) => void;
  fullName: string;
  setFullName: (v: string) => void;
  birthDate: string;
  setBirthDate: (v: string) => void;
  cpf: string;
  setCpf: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  onNext: () => void;
  onGoToLogin: () => void;
};

function Step1({
  username,
  setUsername,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  fullName,
  setFullName,
  birthDate,
  setBirthDate,
  cpf,
  setCpf,
  phone,
  setPhone,
  email,
  setEmail,
  onNext,
  onGoToLogin
}: Step1Props) {
  return (
    <>
      <Text style={styles.subtitle}>Preencha seus dados pessoais.</Text>

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
        onChangeText={(value) => setBirthDate(maskBrDate(value))}
        placeholder="DD-MM-AAAA"
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

      <Pressable
        onPress={onNext}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryButtonPressed
        ]}
      >
        <Text style={styles.primaryButtonText}>Continuar</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </Pressable>

      <Pressable onPress={onGoToLogin} style={styles.loginLink} hitSlop={6}>
        <Text style={styles.loginLinkText}>
          Ja tem uma conta? <Text style={styles.loginLinkAction}>Entrar</Text>
        </Text>
      </Pressable>
    </>
  );
}

type Step2Props = {
  mode: HouseholdMode;
  onModeChange: (m: HouseholdMode) => void;
  newApartment: string;
  setNewApartment: (v: string) => void;
  newBlock: string;
  setNewBlock: (v: string) => void;
  searchApartment: string;
  setSearchApartment: (v: string) => void;
  searchBlock: string;
  setSearchBlock: (v: string) => void;
  searching: boolean;
  onSearch: () => void;
  searchResults: Household[] | null;
  selectedHousehold: Household | null;
  onSelectHousehold: (h: Household) => void;
  submitting: boolean;
  onSubmit: () => void;
};

function Step2({
  mode,
  onModeChange,
  newApartment,
  setNewApartment,
  newBlock,
  setNewBlock,
  searchApartment,
  setSearchApartment,
  searchBlock,
  setSearchBlock,
  searching,
  onSearch,
  searchResults,
  selectedHousehold,
  onSelectHousehold,
  submitting,
  onSubmit
}: Step2Props) {
  return (
    <>
      <Text style={styles.subtitle}>Qual e o seu apartamento?</Text>

      <View style={styles.optionList}>
        <OptionCard
          icon="home-outline"
          title="Vou cadastrar um novo"
          description="Voce sera o titular do apartamento. Aguarda aprovacao do administrador."
          selected={mode === 'new'}
          onPress={() => onModeChange('new')}
        />
        <OptionCard
          icon="people-outline"
          title="Ja existe, quero entrar como morador"
          description="Busque o apartamento existente. O titular precisa aprovar sua entrada."
          selected={mode === 'existing'}
          onPress={() => onModeChange('existing')}
        />
      </View>

      {mode === 'new' ? (
        <>
          <Field
            icon="business-outline"
            label="Apartamento/Unidade"
            value={newApartment}
            onChangeText={setNewApartment}
            placeholder="Ex.: 101, 302..."
          />
          <Field
            icon="business-outline"
            label="Bloco/Torre"
            optional
            value={newBlock}
            onChangeText={setNewBlock}
            placeholder="Ex.: A, B, Torre 1..."
          />
        </>
      ) : (
        <>
          <View style={styles.row}>
            <View style={styles.flex2}>
              <Field
                icon="business-outline"
                label="Apartamento"
                value={searchApartment}
                onChangeText={setSearchApartment}
                placeholder="Ex.: 302"
              />
            </View>
            <View style={styles.flex1}>
              <Field
                icon="business-outline"
                label="Bloco"
                optional
                value={searchBlock}
                onChangeText={setSearchBlock}
                placeholder="A"
              />
            </View>
          </View>

          <Pressable
            onPress={onSearch}
            disabled={searching}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.primaryButtonPressed,
              searching && styles.primaryButtonDisabled
            ]}
          >
            {searching ? (
              <ActivityIndicator color={colors.primaryDark} />
            ) : (
              <>
                <Ionicons name="search-outline" size={18} color={colors.primaryDark} />
                <Text style={styles.secondaryButtonText}>Buscar apartamentos</Text>
              </>
            )}
          </Pressable>

          {searchResults !== null ? (
            searchResults.length === 0 ? (
              <View style={styles.emptyResults}>
                <Ionicons name="alert-circle-outline" size={20} color={colors.textMuted} />
                <Text style={styles.emptyResultsText}>
                  Nenhum apartamento encontrado com esses filtros.
                </Text>
              </View>
            ) : (
              <View style={styles.resultsCard}>
                <Text style={styles.resultsTitle}>
                  {searchResults.length}{' '}
                  {searchResults.length === 1 ? 'resultado' : 'resultados'} encontrado
                  {searchResults.length === 1 ? '' : 's'}
                </Text>
                {searchResults.map((h, idx) => {
                  const selected = selectedHousehold?.id === h.id;
                  return (
                    <Pressable
                      key={h.id}
                      onPress={() => onSelectHousehold(h)}
                      style={[
                        styles.resultRow,
                        idx !== searchResults.length - 1 && styles.resultRowDivider,
                        selected && styles.resultRowSelected
                      ]}
                    >
                      <View
                        style={[
                          styles.radio,
                          selected && styles.radioSelected
                        ]}
                      >
                        {selected ? <View style={styles.radioDot} /> : null}
                      </View>
                      <View style={styles.resultCopy}>
                        <Text style={styles.resultTitle}>{householdLabel(h)}</Text>
                        <View style={styles.resultMetaRow}>
                          <StatusPill status={h.status} />
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )
          ) : null}
        </>
      )}

      <Pressable
        onPress={onSubmit}
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
    </>
  );
}

type StepDotProps = { active: boolean; done?: boolean; label: string };

function StepDot({ active, done, label }: StepDotProps) {
  return (
    <View
      style={[
        styles.stepDot,
        active && styles.stepDotActive,
        done && styles.stepDotDone
      ]}
    >
      {done ? (
        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
      ) : (
        <Text style={[styles.stepDotText, active && styles.stepDotTextActive]}>
          {label}
        </Text>
      )}
    </View>
  );
}

type OptionCardProps = {
  icon: IconName;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
};

function OptionCard({ icon, title, description, selected, onPress }: OptionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.optionCard, selected && styles.optionCardSelected]}
    >
      <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
        <Ionicons
          name={icon}
          size={20}
          color={selected ? '#FFFFFF' : colors.primaryDark}
        />
      </View>
      <View style={styles.optionCopy}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <View
        style={[styles.radio, selected && styles.radioSelected]}
      >
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

type StatusPillProps = { status: Household['status'] };

function StatusPill({ status }: StatusPillProps) {
  const map: Record<Household['status'], { label: string; bg: string; color: string }> = {
    ACTIVE: { label: 'Ativo', bg: '#DCEBDF', color: colors.primaryDark },
    PENDING_ADMIN: { label: 'Pendente', bg: '#FFF1D6', color: colors.warning },
    ARCHIVED: { label: 'Arquivado', bg: '#EAECEE', color: colors.textMuted }
  };
  const cfg = map[status];
  return (
    <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
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
  flex2: {
    flex: 2
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
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: 4,
    gap: 8
  },
  stepperLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E4E8E6',
    borderRadius: 2,
    maxWidth: 80
  },
  stepperLineActive: {
    backgroundColor: colors.primary
  },
  stepperCaption: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
    marginBottom: 4,
    fontWeight: '600'
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F0F2F1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepDotActive: {
    backgroundColor: colors.primary
  },
  stepDotDone: {
    backgroundColor: colors.primaryDark
  },
  stepDotText: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 12
  },
  stepDotTextActive: {
    color: '#FFFFFF'
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
  optionList: {
    gap: 10,
    marginBottom: 4
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E4E8E6',
    backgroundColor: '#FFFFFF'
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F4FAF6'
  },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCEBDF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  optionIconSelected: {
    backgroundColor: colors.primary
  },
  optionCopy: {
    flex: 1,
    gap: 2
  },
  optionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  },
  optionDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D2DBD3',
    alignItems: 'center',
    justifyContent: 'center'
  },
  radioSelected: {
    borderColor: colors.primary
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary
  },
  secondaryButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EAF5EF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8
  },
  secondaryButtonText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '700'
  },
  emptyResults: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F6F7F8',
    padding: 14,
    borderRadius: 12
  },
  emptyResultsText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13
  },
  resultsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4E8E6',
    overflow: 'hidden'
  },
  resultsTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    padding: 12,
    paddingBottom: 6
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14
  },
  resultRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1EF'
  },
  resultRowSelected: {
    backgroundColor: '#F4FAF6'
  },
  resultCopy: {
    flex: 1,
    gap: 6
  },
  resultTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  },
  resultMetaRow: {
    flexDirection: 'row',
    gap: 6
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700'
  },
  primaryButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
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
