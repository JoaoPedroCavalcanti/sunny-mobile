import React, { PropsWithChildren } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

type Props = PropsWithChildren<{
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}>;

export function AppScreen({ children, scroll = true, refreshing, onRefresh }: Props) {
  const insets = useSafeAreaInsets();

  if (!scroll) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 12 }]}>{children}</View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: 12 }]}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg
  },
  scroll: {
    flex: 1
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 14
  }
});
