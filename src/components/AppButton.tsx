import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  style?: ViewStyle;
};

export function AppButton({ title, onPress, loading, variant = 'primary', style }: Props) {
  const isGhost = variant === 'ghost';
  const isDanger = variant === 'danger';

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={[
        styles.button,
        isGhost && styles.ghost,
        isDanger && styles.danger,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isGhost ? colors.primary : '#FFFFFF'} />
      ) : (
        <Text style={[styles.label, isGhost && styles.ghostLabel]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center'
  },
  ghost: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  danger: {
    backgroundColor: colors.danger
  },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  ghostLabel: {
    color: colors.primary
  }
});
