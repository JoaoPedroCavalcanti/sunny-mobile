import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen } from '../components/AppScreen';
import { colors } from '../theme/colors';
import type { CasaStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<CasaStackParamList, 'RegisterMemberHelp'>;

export function RegisterMemberHelpScreen() {
  const navigation = useNavigation<Nav>();

  function handleBack() {
    if (navigation.canGoBack()) navigation.goBack();
  }

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerSide} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Cadastrar morador</Text>
        <View style={styles.headerSide} />
      </View>

      <Text style={styles.subtitle}>
        Veja como adicionar um novo morador a sua unidade em 4 passos.
      </Text>

      <View style={styles.intro}>
        <View style={styles.introIcon}>
          <Ionicons name="information-circle" size={20} color={colors.primaryDark} />
        </View>
        <Text style={styles.introText}>
          O proprio morador novo precisa criar a conta e solicitar entrada na
          sua unidade. Voce so precisa aprovar a solicitacao.
        </Text>
      </View>

      <StepCard
        index={1}
        title="O morador cria a conta no app"
        description='Peca para o novo morador abrir o Sunnyvale Connect e tocar em "Criar conta", logo abaixo do botao Entrar.'
        preview={<LoginPreview />}
      />

      <StepCard
        index={2}
        title="Ele entra na sua unidade existente"
        description='No passo 2 do cadastro, ele escolhe "Ja existe, quero entrar como morador", digita o numero do apartamento (e bloco, se houver) e seleciona o resultado.'
        preview={<SignupPreview />}
      />

      <StepCard
        index={3}
        title="Voce recebe a solicitacao em Minha unidade"
        description='Quando o pedido chega, aparece um badge com a quantidade em "Convites pendentes" dentro de Minha unidade.'
        preview={<MinhaUnidadePreview />}
      />

      <StepCard
        index={4}
        title="Aprove a entrada do novo morador"
        description='Abra "Convites pendentes", confira os dados do solicitante e toque em Aprovar. Pronto, ele ja faz parte da unidade.'
        preview={<PendingPreview />}
        isLast
      />

      <View style={styles.tipBox}>
        <Ionicons name="bulb-outline" size={18} color={colors.primaryDark} />
        <View style={{ flex: 1 }}>
          <Text style={styles.tipTitle}>Dica</Text>
          <Text style={styles.tipText}>
            Voce pode recusar uma solicitacao se nao reconhecer a pessoa.
            Somente moradores aprovados conseguem usar reservas, visitantes e
            demais servicos.
          </Text>
        </View>
      </View>

      <Pressable
        onPress={handleBack}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryButtonPressed
        ]}
      >
        <Text style={styles.primaryButtonText}>Entendi</Text>
      </Pressable>
    </AppScreen>
  );
}

type StepCardProps = {
  index: number;
  title: string;
  description: string;
  preview: React.ReactNode;
  isLast?: boolean;
};

function StepCard({ index, title, description, preview, isLast }: StepCardProps) {
  return (
    <View style={styles.stepWrap}>
      <View style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{index}</Text>
          </View>
          <Text style={styles.stepTitle}>{title}</Text>
        </View>
        <View style={styles.stepBody}>
          <View style={styles.previewWrap}>{preview}</View>
          <Text style={styles.stepDescription}>{description}</Text>
        </View>
      </View>
      {!isLast ? (
        <View style={styles.connector}>
          <Ionicons name="chevron-down" size={18} color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <View style={phone.frame}>
      <View style={phone.notch} />
      <View style={phone.screen}>{children}</View>
    </View>
  );
}

function LoginPreview() {
  return (
    <PhoneFrame>
      <View style={login.hero}>
        <View style={login.logo}>
          <Ionicons name="leaf-outline" size={14} color="#FFFFFF" />
        </View>
        <Text style={login.brand}>SUNNYVALE</Text>
        <Text style={login.welcome}>Bem-vindo(a)</Text>
      </View>
      <View style={login.card}>
        <View style={login.input} />
        <View style={login.input} />
        <View style={login.button}>
          <Text style={login.buttonText}>Entrar</Text>
        </View>
        <View style={login.divider} />
        <View style={login.outlineBtn} />
        <View style={login.linkRow}>
          <Text style={login.linkText}>Criar conta</Text>
        </View>
      </View>
      <Highlight style={login.highlight} label='Toque em "Criar conta"' />
    </PhoneFrame>
  );
}

function SignupPreview() {
  return (
    <PhoneFrame>
      <View style={signup.headerRow}>
        <Ionicons name="arrow-back" size={10} color={colors.textPrimary} />
        <Text style={signup.headerTitle}>Cadastro</Text>
        <View style={{ width: 10 }} />
      </View>
      <View style={signup.steps}>
        <View style={[signup.stepDot, signup.stepDone]}>
          <Ionicons name="checkmark" size={6} color="#FFFFFF" />
        </View>
        <View style={signup.stepLine} />
        <View style={[signup.stepDot, signup.stepCurrent]}>
          <Text style={signup.stepDotText}>2</Text>
        </View>
      </View>
      <Text style={signup.passoLabel}>Passo 2 — Apartamento</Text>

      <View style={signup.optionCard}>
        <View style={signup.optionIcon}>
          <Ionicons name="home-outline" size={9} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={signup.optionTitle}>Vou cadastrar um novo</Text>
        </View>
        <View style={signup.radio} />
      </View>

      <View style={[signup.optionCard, signup.optionCardSelected]}>
        <View style={[signup.optionIcon, signup.optionIconSelected]}>
          <Ionicons name="people-outline" size={9} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={signup.optionTitleSelected}>Ja existe, quero entrar</Text>
        </View>
        <View style={[signup.radio, signup.radioSelected]}>
          <View style={signup.radioInner} />
        </View>
      </View>

      <View style={signup.resultCard}>
        <View style={[signup.radio, signup.radioSelected, { marginRight: 4 }]}>
          <View style={signup.radioInner} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={signup.resultTitle}>Apto 1101 · Bloco A</Text>
          <View style={signup.activeChip}>
            <Text style={signup.activeChipText}>Ativo</Text>
          </View>
        </View>
      </View>

      <View style={signup.cadastrarBtn}>
        <Text style={signup.cadastrarText}>Cadastrar</Text>
      </View>
      <Highlight
        style={signup.highlight}
        label='Selecione o seu apartamento'
      />
    </PhoneFrame>
  );
}

function MinhaUnidadePreview() {
  return (
    <PhoneFrame>
      <View style={signup.headerRow}>
        <Ionicons name="arrow-back" size={10} color={colors.textPrimary} />
        <Text style={signup.headerTitle}>Minha unidade</Text>
        <View style={{ width: 10 }} />
      </View>

      <View style={mu.unitCard}>
        <View style={mu.unitIcon}>
          <Ionicons name="business" size={10} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={mu.unitTitle}>Apto 1101</Text>
          <Text style={mu.unitSub}>Bloco A</Text>
        </View>
      </View>

      <View style={mu.menuCard}>
        <MenuRow icon="people-outline" label="Moradores" />
        <View style={mu.divider} />
        <MenuRow
          icon="mail-outline"
          label="Convites pendentes"
          badge="1"
          highlighted
        />
        <View style={mu.divider} />
        <MenuRow icon="calendar-outline" label="Reservas" />
        <View style={mu.divider} />
        <MenuRow icon="exit-outline" label="Sair da unidade" danger />
      </View>

      <Highlight
        style={mu.highlight}
        label="Abra Convites pendentes"
      />
    </PhoneFrame>
  );
}

type MenuRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: string;
  highlighted?: boolean;
  danger?: boolean;
};

function MenuRow({ icon, label, badge, highlighted, danger }: MenuRowProps) {
  return (
    <View style={[mu.row, highlighted && mu.rowHighlighted]}>
      <View
        style={[
          mu.rowIcon,
          danger && mu.rowIconDanger,
          highlighted && mu.rowIconHighlighted
        ]}
      >
        <Ionicons
          name={icon}
          size={9}
          color={danger ? colors.danger : colors.primary}
        />
      </View>
      <Text style={[mu.rowLabel, danger && mu.rowLabelDanger]} numberOfLines={1}>
        {label}
      </Text>
      {badge ? (
        <View style={mu.badge}>
          <Text style={mu.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={9} color="#B6BAC3" />
    </View>
  );
}

function PendingPreview() {
  return (
    <PhoneFrame>
      <View style={signup.headerRow}>
        <Ionicons name="arrow-back" size={10} color={colors.textPrimary} />
        <Text style={signup.headerTitle}>Moradores pendentes</Text>
        <Ionicons name="information-circle-outline" size={10} color={colors.textPrimary} />
      </View>

      <View style={pending.tabs}>
        <View style={[pending.tab, pending.tabActive]}>
          <Text style={pending.tabActiveText}>Pendentes</Text>
          <View style={pending.tabBadge}>
            <Text style={pending.tabBadgeText}>1</Text>
          </View>
        </View>
        <Text style={pending.tabText}>Historico</Text>
      </View>

      <View style={pending.card}>
        <View style={pending.cardTop}>
          <View style={pending.avatar}>
            <Text style={pending.avatarText}>MN</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={pending.nameRow}>
              <Text style={pending.name}>Morador Novo</Text>
              <View style={pending.statusChip}>
                <Text style={pending.statusChipText}>Aguardando</Text>
              </View>
            </View>
            <Text style={pending.email}>moradornovo@email.com</Text>
            <Text style={pending.meta}>Solicitado em 10/06</Text>
          </View>
        </View>
        <View style={pending.actions}>
          <View style={[pending.actionBtn, pending.approveBtn]}>
            <Ionicons name="checkmark-circle-outline" size={10} color={colors.primary} />
            <Text style={pending.approveText}>Aprovar</Text>
          </View>
          <View style={pending.actionDivider} />
          <View style={[pending.actionBtn, pending.rejectBtn]}>
            <Ionicons name="close-circle-outline" size={10} color={colors.danger} />
            <Text style={pending.rejectText}>Recusar</Text>
          </View>
        </View>
      </View>

      <Highlight
        style={pending.highlight}
        label='Toque em "Aprovar"'
      />
    </PhoneFrame>
  );
}

function Highlight({
  style,
  label
}: {
  style?: any;
  label: string;
}) {
  return (
    <View style={[styles.highlightBase, style]}>
      <Ionicons name="arrow-forward" size={12} color={colors.primaryDark} />
      <Text style={styles.highlightText}>{label}</Text>
    </View>
  );
}

const PHONE_WIDTH = 150;
const PHONE_HEIGHT = 300;

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
    paddingHorizontal: 16,
    marginTop: -4
  },
  intro: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: '#EFF6F1',
    borderRadius: 14,
    padding: 12
  },
  introIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCEBDF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  introText: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: 12.5,
    lineHeight: 17
  },
  stepWrap: {
    alignItems: 'center'
  },
  stepCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#132016',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    gap: 10
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14
  },
  stepTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800'
  },
  stepBody: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start'
  },
  previewWrap: {
    width: PHONE_WIDTH
  },
  stepDescription: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
    paddingTop: 4
  },
  connector: {
    paddingVertical: 4
  },
  highlightBase: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF6CC',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#F2D866',
    shadowColor: '#132016',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  highlightText: {
    flexShrink: 1,
    color: colors.primaryDark,
    fontSize: 9,
    fontWeight: '800'
  },
  tipBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E1',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F4E0A1'
  },
  tipTitle: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2
  },
  tipText: {
    color: colors.textPrimary,
    fontSize: 12.5,
    lineHeight: 17
  },
  primaryButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4
  },
  primaryButtonPressed: {
    opacity: 0.9
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  }
});

const phone = StyleSheet.create({
  frame: {
    width: PHONE_WIDTH,
    height: PHONE_HEIGHT,
    borderRadius: 20,
    backgroundColor: '#1B1F1D',
    padding: 4,
    shadowColor: '#132016',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4
  },
  notch: {
    position: 'absolute',
    top: 6,
    left: '50%',
    marginLeft: -16,
    width: 32,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#0B0D0C',
    zIndex: 2
  },
  screen: {
    flex: 1,
    backgroundColor: '#F4F6F5',
    borderRadius: 16,
    paddingTop: 14,
    paddingHorizontal: 8,
    paddingBottom: 8,
    overflow: 'hidden'
  }
});

const login = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4
  },
  logo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#9FCBAF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary
  },
  brand: {
    color: '#0B0D0C',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.5
  },
  welcome: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    gap: 6
  },
  input: {
    height: 14,
    borderRadius: 6,
    backgroundColor: '#EFF2F0'
  },
  button: {
    height: 16,
    borderRadius: 6,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800'
  },
  divider: {
    height: 1,
    backgroundColor: '#E3E8E5',
    marginVertical: 2
  },
  outlineBtn: {
    height: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E3E8E5'
  },
  linkRow: {
    alignItems: 'center',
    paddingTop: 2
  },
  linkText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800'
  },
  highlight: {
    bottom: 14,
    left: 6,
    right: 6
  }
});

const signup = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 9,
    fontWeight: '800'
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginVertical: 4
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepDone: {
    backgroundColor: colors.primary
  },
  stepCurrent: {
    backgroundColor: colors.primary
  },
  stepDotText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '800'
  },
  stepLine: {
    width: 24,
    height: 1,
    backgroundColor: '#D9DDDB'
  },
  passoLabel: {
    color: colors.textMuted,
    fontSize: 7,
    textAlign: 'center',
    marginBottom: 6
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E3E8E5',
    marginBottom: 4
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F4FAF6'
  },
  optionIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EAF5EF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  optionIconSelected: {
    backgroundColor: colors.primary
  },
  optionTitle: {
    color: colors.textPrimary,
    fontSize: 7,
    fontWeight: '700'
  },
  optionTitleSelected: {
    color: colors.primaryDark,
    fontSize: 7,
    fontWeight: '800'
  },
  radio: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#B6BAC3',
    alignItems: 'center',
    justifyContent: 'center'
  },
  radioSelected: {
    borderColor: colors.primary
  },
  radioInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F4FAF6',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 6
  },
  resultTitle: {
    color: colors.textPrimary,
    fontSize: 7,
    fontWeight: '800',
    marginBottom: 2
  },
  activeChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCEBDF',
    paddingHorizontal: 4,
    borderRadius: 999
  },
  activeChipText: {
    color: colors.primaryDark,
    fontSize: 6,
    fontWeight: '800'
  },
  cadastrarBtn: {
    height: 18,
    borderRadius: 6,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cadastrarText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800'
  },
  highlight: {
    top: 100,
    right: -14
  }
});

const mu = StyleSheet.create({
  unitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 6,
    marginBottom: 6
  },
  unitIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EAF5EF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  unitTitle: {
    color: colors.textPrimary,
    fontSize: 8,
    fontWeight: '800'
  },
  unitSub: {
    color: colors.textMuted,
    fontSize: 7
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 6
  },
  rowHighlighted: {
    backgroundColor: '#FFF6CC'
  },
  divider: {
    height: 1,
    backgroundColor: '#EEF1EF'
  },
  rowIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EAF5EF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  rowIconDanger: {
    backgroundColor: '#FBE3E3'
  },
  rowIconHighlighted: {
    backgroundColor: '#DCEBDF'
  },
  rowLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 7,
    fontWeight: '700'
  },
  rowLabelDanger: {
    color: colors.danger
  },
  badge: {
    minWidth: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '800'
  },
  highlight: {
    top: 110,
    right: -14
  }
});

const pending = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E8E5'
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 4
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary
  },
  tabActiveText: {
    color: colors.primaryDark,
    fontSize: 8,
    fontWeight: '800'
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '700'
  },
  tabBadge: {
    minWidth: 12,
    height: 12,
    borderRadius: 6,
    paddingHorizontal: 3,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '800'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 6,
    gap: 4
  },
  cardTop: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start'
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EAF5EF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: colors.primaryDark,
    fontSize: 8,
    fontWeight: '800'
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap'
  },
  name: {
    color: colors.textPrimary,
    fontSize: 7.5,
    fontWeight: '800'
  },
  statusChip: {
    backgroundColor: '#EAF1FB',
    paddingHorizontal: 3,
    borderRadius: 999
  },
  statusChipText: {
    color: '#1F5AA8',
    fontSize: 6,
    fontWeight: '800'
  },
  email: {
    color: colors.textMuted,
    fontSize: 6.5
  },
  meta: {
    color: colors.textMuted,
    fontSize: 6.5
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E3E8E5',
    marginTop: 2
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 4
  },
  approveBtn: {},
  rejectBtn: {},
  actionDivider: {
    width: 1,
    backgroundColor: '#E3E8E5'
  },
  approveText: {
    color: colors.primary,
    fontSize: 7,
    fontWeight: '800'
  },
  rejectText: {
    color: colors.danger,
    fontSize: 7,
    fontWeight: '800'
  },
  highlight: {
    bottom: 60,
    left: -14
  }
});
