import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { AppText as Text } from '@city-market/mobile-ui';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react-native';
import { DeliveryService } from '../services/api/deliveryService';
import { theme } from '../theme';
import QueryError from '../components/common/QueryError';

const Stars = ({ value, size = 14 }: { value: number | null | undefined; size?: number }) => (
  <View style={styles.stars}>
    {[1, 2, 3, 4, 5].map(n => (
      <Star
        key={n}
        size={size}
        color={theme.colors.warning}
        fill={value != null && n <= Math.round(value) ? theme.colors.warning : 'transparent'}
      />
    ))}
  </View>
);

// How customers rated this courier's deliveries
const MyRatingsScreen = () => {
  const { t, i18n } = useTranslation();
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['myRatings'],
    queryFn: () => DeliveryService.getMyRatings(),
  });
  const summary = data?.summary;
  const total = summary?.totalRatings ?? 0;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.container}>
        <QueryError error={error} onRetry={refetch} retrying={isRefetching} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}>
      <View style={styles.card}>
        <View style={styles.summaryRow}>
          <View style={styles.average}>
            <Text style={styles.averageValue}>{summary?.averageRating != null ? summary.averageRating.toFixed(1) : '—'}</Text>
            <Stars value={summary?.averageRating} size={16} />
            <Text style={styles.muted}>{t('ratings.count', { count: total })}</Text>
          </View>
          <View style={styles.bars}>
            {[5, 4, 3, 2, 1].map(s => {
              const n = summary?.distribution?.[s] ?? 0;
              return (
                <View key={s} style={styles.barRow}>
                  <Text style={styles.barLabel}>{s}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: total ? `${(n / total) * 100}%` : 0 }]} />
                  </View>
                  <Text style={styles.barCount}>{n}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <Text style={styles.section}>{t('ratings.latest_reviews')}</Text>
      <View style={styles.card}>
        {!data?.items.length ? (
          <Text style={styles.muted}>{t('ratings.no_reviews')}</Text>
        ) : (
          data.items.map(r => (
            <View key={r.id} style={styles.review}>
              <View style={styles.reviewTop}>
                <Text style={styles.orderId}>#{r.customerOrderId.slice(-6)}</Text>
                <Stars value={r.stars} />
              </View>
              {!!r.comment && <Text style={styles.comment}>{r.comment}</Text>}
              <Text style={styles.muted}>
                {new Date(r.createdAt).toLocaleString(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: theme.colors.white, borderRadius: theme.radius.md, padding: 16, ...theme.shadows.soft },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  average: { alignItems: 'center' },
  averageValue: { fontSize: 36, fontWeight: 'bold', color: theme.colors.text },
  bars: { flex: 1, gap: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLabel: { width: 12, fontSize: 12, color: theme.colors.textMuted },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: theme.colors.background },
  barFill: { height: 8, borderRadius: 4, backgroundColor: theme.colors.warning },
  barCount: { width: 28, textAlign: 'right', fontSize: 12, color: theme.colors.textMuted },
  stars: { flexDirection: 'row', gap: 2 },
  section: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginTop: 20, marginBottom: 8 },
  review: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontWeight: '600', color: theme.colors.text },
  comment: { color: theme.colors.text, marginTop: 4 },
  muted: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
});

export default MyRatingsScreen;
