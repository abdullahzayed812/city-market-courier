import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  BackHandler,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';

interface Props {
  onAccept: () => void;
}

const TermsAndConditionsScreen: React.FC<Props> = ({ onAccept }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const scrollViewRef = useRef<ScrollView>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleDecline = () => {
    Alert.alert(t('terms.declineTitle'), t('terms.declineMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('terms.exitApp'),
        style: 'destructive',
        onPress: () => BackHandler.exitApp(),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        backgroundColor={theme.colors.primary}
        barStyle="light-content"
      />

      <View style={styles.header}>
        <Text style={styles.appName}>CityMarket Courier</Text>
        <Text style={styles.title}>{t('terms.title')}</Text>
        <Text style={styles.lastUpdated}>{t('terms.lastUpdated')}</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        showsVerticalScrollIndicator
      >
        <Text style={[styles.intro]}>{t('terms.intro')}</Text>

        {(t('terms.sections', { returnObjects: true }) as any[]).map(
          (section: { heading: string; body: string }, index: number) => (
            <View key={index} style={styles.section}>
              <Text style={[styles.sectionHeading]}>
                {index + 1}. {section.heading}
              </Text>
              <Text style={[styles.sectionBody]}>{section.body}</Text>
            </View>
          ),
        )}

        <Text style={[styles.closing]}>{t('terms.closing')}</Text>
      </ScrollView>

      {!hasScrolledToBottom && (
        <Text style={styles.scrollHint}>{t('terms.scrollHint')}</Text>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.acceptButton,
            !hasScrolledToBottom && styles.acceptButtonDisabled,
          ]}
          onPress={onAccept}
          disabled={!hasScrolledToBottom}
        >
          <Text style={styles.acceptButtonText}>{t('terms.accept')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.declineButton} onPress={handleDecline}>
          <Text style={styles.declineButtonText}>{t('terms.decline')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.white,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.white,
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 8,
  },
  intro: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  sectionBody: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  closing: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  rtlText: {
    textAlign: 'right',
  },
  scrollHint: {
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.textMuted,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  footer: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  acceptButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    backgroundColor: theme.colors.textMuted,
  },
  acceptButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  declineButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  declineButtonText: {
    color: theme.colors.error,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default TermsAndConditionsScreen;
