import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  title: string;
  subtitle?: string;
};

export function SectionHeader({ title, subtitle }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 4 },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800'
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14
  }
});
