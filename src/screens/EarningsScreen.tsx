import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Wallet, TrendingUp, Calendar } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeliveryService } from '../services/api/deliveryService';
import { theme } from '../theme';

const useAuthCourierId = () => {
  const { data: profile } = useQuery({
    queryKey: ['courierProfile'],
    queryFn: DeliveryService.getProfile,
  });
  return profile?.id ?? null;
};

const StatusBadge = ({ status }: { status: string }) => (
  <View style={[styles.badge, status === 'PAID' ? styles.badgePaid : styles.badgePending]}>
    <Text style={[styles.badgeText, status === 'PAID' ? styles.badgeTextPaid : styles.badgeTextPending]}>
      {status}
    </Text>
  </View>
);

const EarningsScreen = () => {
  const { t } = useTranslation();
  const courierId = useAuthCourierId();

  const { data: pendingData, isLoading: isPendingLoading } = useQuery({
    queryKey: ['courierPendingEarnings', courierId],
    queryFn: () => DeliveryService.getCourierPendingEarnings(courierId!),
    enabled: !!courierId,
  });

  const { data: settlements, isLoading: isSettlementsLoading } = useQuery({
    queryKey: ['courierSettlements', courierId],
    queryFn: () => DeliveryService.getCourierSettlements(courierId!),
    enabled: !!courierId,
  });

  const isLoading = isPendingLoading || isSettlementsLoading || !courierId;

  const renderSettlementItem = ({ item }: { item: any }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyInfo}>
        <View style={styles.iconCircle}>
          <TrendingUp size={18} color={theme.colors.success} />
        </View>
        <View>
          <Text style={styles.cardTitle}>
            {new Date(item.periodStart).toLocaleDateString()} – {new Date(item.periodEnd).toLocaleDateString()}
          </Text>
          <View style={styles.dateRow}>
            <Calendar size={12} color={theme.colors.textMuted} />
            <Text style={styles.dateText}>{item.deliveryCount} {t('earnings.deliveries', 'deliveries')}</Text>
          </View>
        </View>
      </View>
      <View style={styles.amountContainer}>
        <Text style={styles.amountText}>EGP {Number(item.netPayout).toLocaleString()}</Text>
        <StatusBadge status={item.status} />
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      <View style={styles.container}>
        <View style={styles.mainHeader}>
          <Text style={styles.headerTitle}>{t('earnings.title', 'Earnings')}</Text>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>{t('earnings.pending_payout', 'Pending Payout')}</Text>
            <Text style={styles.totalValue}>EGP {(pendingData?.netPayout || 0).toLocaleString()}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t('earnings.unsettled', 'Unsettled')}</Text>
                <Text style={styles.statValue}>{pendingData?.unsettledDeliveries || 0}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t('earnings.delivery_fees', 'Fees')}</Text>
                <Text style={styles.statValue}>EGP {(pendingData?.totalDeliveryFees || 0).toLocaleString()}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>{t('earnings.settlement_history', 'Settlement History')}</Text>
          <FlatList
            data={settlements}
            renderItem={renderSettlementItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Wallet size={56} color={theme.colors.surface} />
                <Text style={styles.emptyText}>{t('earnings.no_earnings_history', 'No settlements yet')}</Text>
                <Text style={styles.emptySubText}>{t('earnings.complete_deliveries_hint', 'Complete deliveries to earn')}</Text>
              </View>
            }
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.primary },
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  mainHeader: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: theme.colors.white, marginBottom: 16, textAlign: 'center' },
  totalCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    padding: 22,
    alignItems: 'center',
    ...theme.shadows.heavy,
  },
  totalLabel: { fontSize: 12, color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  totalValue: { fontSize: 36, fontWeight: 'bold', color: theme.colors.primary, marginVertical: 8 },
  statsRow: { flexDirection: 'row', width: '100%', justifyContent: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.background },
  statItem: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, backgroundColor: theme.colors.background },
  statLabel: { fontSize: 10, color: theme.colors.textMuted, textTransform: 'uppercase' },
  statValue: { fontSize: 14, fontWeight: 'bold', color: theme.colors.secondary, marginTop: 3 },
  content: { flex: 1, padding: theme.spacing.lg, marginTop: -20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.primary, marginBottom: 14 },
  listContent: { paddingBottom: 20 },
  historyCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    ...theme.shadows.soft,
  },
  historyInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginEnd: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: theme.colors.primary },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  dateText: { fontSize: 12, color: theme.colors.textMuted, marginStart: 4 },
  amountContainer: { alignItems: 'flex-end' },
  amountText: { fontSize: 15, fontWeight: 'bold', color: theme.colors.success },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, marginTop: 4 },
  badgePaid: { backgroundColor: '#d1fae5' },
  badgePending: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase' },
  badgeTextPaid: { color: '#065f46' },
  badgeTextPending: { color: '#92400e' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
  emptyText: { marginTop: 14, fontSize: 15, fontWeight: 'bold', color: theme.colors.primary },
  emptySubText: { marginTop: 4, fontSize: 12, color: theme.colors.textMuted, textAlign: 'center' },
});

export default EarningsScreen;
