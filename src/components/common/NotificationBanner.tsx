import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Bell } from 'lucide-react-native';
import { theme } from '../../theme';

interface NotificationBannerProps {
  text1?: string;
  text2?: string;
  onPress?: () => void;
}

/**
 * WhatsApp-style notification banner for in-app (foreground) notifications.
 * Uses consistent theme and smooth slide animation (handled by react-native-toast-message).
 */
export const NotificationBanner = ({ text1, text2, onPress }: NotificationBannerProps) => {
  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={onPress} 
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Bell size={20} color={theme.colors.white} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>{text1}</Text>
          <Text style={styles.body} numberOfLines={2}>{text2}</Text>
        </View>
        <View style={styles.handle} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '94%',
    marginTop: Platform.OS === 'ios' ? 0 : 10,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    ...theme.shadows.medium,
    alignSelf: 'center',
    borderWidth: 1,
    borderLeftWidth: 5,
    borderLeftColor: theme.colors.primary,
    borderColor: theme.colors.border,
  },
  content: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  handle: {
    width: 30,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
  }
});
