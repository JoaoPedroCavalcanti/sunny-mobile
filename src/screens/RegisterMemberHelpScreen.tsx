import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
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
        preview={
          <ImagePreview
            source={require('../../assets/tutorial-step-1.png')}
            aspectRatio={576 / 1024}
          />
        }
      />

      <StepCard
        index={2}
        title="Ele entra na sua unidade existente"
        description='No passo 2 do cadastro, ele escolhe "Ja existe, quero entrar como morador", digita o numero do apartamento (e bloco, se houver) e seleciona o resultado.'
        preview={
          <ImagePreview
            source={require('../../assets/tutorial-step-2.png')}
            aspectRatio={473 / 1024}
          />
        }
      />

      <StepCard
        index={3}
        title="Voce recebe a solicitacao em Minha unidade"
        description='Quando o pedido chega, aparece um badge com a quantidade em "Convites pendentes" dentro de Minha unidade.'
        preview={
          <ImagePreview
            source={require('../../assets/tutorial-step-3.png')}
            aspectRatio={470 / 1024}
          />
        }
      />

      <StepCard
        index={4}
        title="Aprove a entrada do novo morador"
        description='Abra "Convites pendentes", confira os dados do solicitante e toque em Aprovar. Pronto, ele ja faz parte da unidade.'
        preview={
          <ImagePreview
            source={require('../../assets/tutorial-step-4.png')}
            aspectRatio={473 / 1024}
          />
        }
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

function ImagePreview({
  source,
  aspectRatio
}: {
  source: number;
  aspectRatio: number;
}) {
  return (
    <View style={[imagePreview.wrap, { aspectRatio }]}>
      <Image source={source} style={imagePreview.image} resizeMode="contain" />
    </View>
  );
}

const PHONE_WIDTH = 150;

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

const imagePreview = StyleSheet.create({
  wrap: {
    width: PHONE_WIDTH,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#132016',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4
  },
  image: {
    width: '100%',
    height: '100%'
  }
});

