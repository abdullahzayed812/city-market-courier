import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, StatusBar } from 'react-native';
import {
  AppText as Text,
  Card,
  ScreenHeader,
  SectionHeader,
  StatusBadge,
  SummaryRow,
  Divider,
  EmptyState,
  LoadingState,
  palette,
  space,
} from '@city-market/mobile-ui';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Wallet, CircleCheck, Hourglass, CalendarRange, Info } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeliveryService } from '../services/api/deliveryService';
import { useFormat } from '../hooks/useFormat';
import QueryError from '../components/common/QueryError';

const formatDate = (d: string | Date | null | undefined) => (d ? new Date(d).toLocaleDateString() : '—');

// All amounts are the server's figures; nothing is recomputed here.
const EarningsScreen = () => {
  const { t } = useTranslation();
  const { money } = useFormat();

  const profileQuery = useQuery({ queryKey: ['courierProfile'], queryFn: DeliveryService.getProfile });
  const courierId = profileQuery.data?.id ?? null;

  const pendingQuery = useQuery({
    queryKey: ['courierPendingEarnings', courierId],
    queryFn: () => DeliveryService.getCourierPendingEarnings(courierId!),
    enabled: !!courierId,
  });
  const historyQuery = useQuery({
    queryKey: ['courierSettlements', courierId],
    queryFn: () => DeliveryService.getCourierSettlements(courierId!),
    enabled: !!courierId,
  });

  const refreshing = pendingQuery.isRefetching || historyQuery.isRefetching || profileQuery.isRefetching;
  const refresh = () => {
    if (!courierId) profileQuery.refetch();
    pendingQuery.refetch();
    historyQuery.refetch();
  };

  const header = <ScreenHeader title={t('earnings.title')} />;
  const error = profileQuery.error ?? pendingQuery.error ?? historyQuery.error;
  const loading = profileQuery.isLoading || (!!courierId && (pendingQuery.isLoading || historyQuery.isLoading));

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {header}
        <LoadingState />
      </SafeAreaView>
    );
  }
  if (error && !pendingQuery.data && !historyQuery.data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {header}
        <QueryError error={error} onRetry={refresh} retrying={refreshing} />
      </SafeAreaView>
    );
  }

  const pending = pendingQuery.data;
  const settlements: any[] = historyQuery.data ?? [];
  const net = Number(pending?.netPayout ?? 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.surface} />
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.primary} colors={[palette.primary]} />}
      >
        <Card style={styles.highlight}>
          <View style={styles.highlightHead}>
            <View style={styles.highlightIcon}>
              <Wallet size={22} color={palette.primary} />
            </View>
            <View style={styles.flex}>
              <Text variant="subheading" color={palette.text}>{t('earnings.pending_title')}</Text>
              <Text variant="caption" color={palette.textMuted}>{t('earnings.pending_hint')}</Text>
            </View>
          </View>
          <SummaryRow label={t('earnings.unsettled')} value={String(pending?.unsettledDeliveries ?? 0)} />
          <SummaryRow label={t('earnings.delivery_fees')} value={money(pending?.totalDeliveryFees ?? 0)} />
          {pending?.totalCashCollected ? (
            <SummaryRow label={t('earnings.cash_collected')} value={money(pending.totalCashCollected)} emphasis="muted" />
          ) : null}
          <Divider />
          <SummaryRow label={t('earnings.net_payout')} value={money(net)} emphasis={net < 0 ? 'negative' : 'total'} />
          {net < 0 ? (
            <View style={styles.note}>
              <Info size={14} color={palette.textMuted} />
              <Text variant="caption" color={palette.textMuted} style={styles.flex}>{t('earnings.negative_net_hint')}</Text>
            </View>
          ) : null}
        </Card>

        <SectionHeader title={t('earnings.settlement_history')} style={styles.sectionGap} />
        {settlements.length === 0 ? (
          <Card>
            <EmptyState icon={Wallet} title={t('earnings.no_earnings_history')} message={t('earnings.complete_deliveries_hint')} compact />
          </Card>
        ) : (
          settlements.map(item => {
            const paid = item.status === 'PAID';
            return (
              <Card key={item.id} style={styles.settlement}>
                <View style={styles.rowBetween}>
                  <View style={styles.inline}>
                    <CalendarRange size={16} color={palette.textMuted} />
                    <Text variant="label" color={palette.text} style={styles.flexShrink}>
                      {formatDate(item.periodStart)} – {formatDate(item.periodEnd)}
                    </Text>
                  </View>
                  <StatusBadge
                    size="sm"
                    tone={paid ? 'success' : 'warning'}
                    icon={paid ? CircleCheck : Hourglass}
                    label={paid ? t('earnings.status_paid') : t('earnings.status_pending')}
                  />
                </View>
                <View style={styles.rowBetween}>
                  <Text variant="caption" color={palette.textMuted}>{t('earnings.deliveries_count', { count: item.deliveryCount })}</Text>
                  <Text variant="heading" color={palette.text} style={styles.tabular}>{money(item.netPayout)}</Text>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.huge },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexShrink: 1 },
  sectionGap: { marginTop: space.md, marginBottom: 0 },
  highlight: { borderWidth: 1, borderColor: palette.primaryMuted },
  highlightHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md },
  highlightIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
  },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginTop: space.sm },
  settlement: { gap: space.sm },
});

export default EarningsScreen;
