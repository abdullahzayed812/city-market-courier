import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl } from 'react-native';
import { AppText as Text } from '@city-market/mobile-ui';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Store, ChevronRight, Navigation } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Delivery, DeliveryStatus, EventType } from '@city-market/shared';

import { DeliveryService } from '../services/api/deliveryService';
import { useSocket } from '../app/SocketContext';
import { PickupCountdownBadge } from '../components/deliveries/PickupCountdownBadge';
import { isActiveDelivery, shortOrderId, statusColor, statusLabelKey } from '../features/deliveries/deliveryHelpers';
import { theme } from '../theme';

type Tab = 'active' | 'history';

// Compact list; everything else (items, customer, actions) lives on DeliveryDetailsScreen.
const DeliveriesScreen = ({ navigation }: any) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [tab, setTab] = useState<Tab>('active');

  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['myDeliveries'],
    queryFn: ({ pageParam }) => DeliveryService.getMyDeliveries(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _all, lastPageParam) => (lastPage.hasNextPage ? lastPageParam + 1 : undefined),
  });

  useEffect(() => {
    if (!socket) return;
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['myDeliveries'] });
    const events = [
      EventType.COURIER_ASSIGNED,
      EventType.ORDER_PICKED_UP,
      EventType.ORDER_DELIVERED,
      EventType.SLA_TIMER_STARTED,
      EventType.SLA_COURIER_PICKUP_EXPIRED,
    ];
    events.forEach(e => socket.on(e, refresh));
    return () => events.forEach(e => socket.off(e, refresh));
  }, [socket, queryClient]);

  const all = useMemo(() => data?.pages.flatMap(p => p.items ?? []) ?? [], [data]);
  const deliveries = useMemo(() => all.filter(d => (tab === 'active' ? isActiveDelivery(d) : !isActiveDelivery(d))), [all, tab]);
  const activeCount = useMemo(() => all.filter(isActiveDelivery).length, [all]);

  const renderItem = ({ item }: { item: Delivery }) => {
    const color = statusColor(item.status);
    const stores = item.pickupLocations ?? [];
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('DeliveryDetails', { deliveryId: item.id })}
      >
        <View style={styles.cardTop}>
          <Text style={styles.orderId}>{shortOrderId(item)}</Text>
          <View style={[styles.badge, { backgroundColor: color + '18' }]}>
            <Text style={[styles.badgeText, { color }]}>{t(statusLabelKey(item.status))}</Text>
          </View>
        </View>

        <View style={styles.line}>
          <Store size={15} color={theme.colors.warning} />
          <Text style={styles.lineText} numberOfLines={1}>
            {stores.length > 1 ? t('deliveries.stores_count', { count: stores.length }) : stores[0]?.address ?? '—'}
          </Text>
        </View>
        <View style={styles.line}>
          <MapPin size={15} color={theme.colors.error} />
          <Text style={styles.lineText} numberOfLines={1}>
            {item.deliveryAddress}
          </Text>
        </View>

        <View style={styles.cardBottom}>
          {item.status === DeliveryStatus.ASSIGNED ? (
            <PickupCountdownBadge deadline={item.pickupDeadline} />
          ) : (
            <Text style={styles.time}>
              {new Date(item.deliveredAt ?? item.assignedAt ?? item.createdAt).toLocaleString(i18n.language, {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          )}
          <View style={styles.feeRow}>
            {item.deliveryFee != null && (
              <Text style={styles.fee}>
                {Number(item.deliveryFee).toFixed(2)} {t('common.currency')}
              </Text>
            )}
            <ChevronRight size={18} color={theme.colors.textMuted} style={isRTL && { transform: [{ rotate: '180deg' }] }} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.white} />
      <Text style={styles.title}>{t('deliveries.all_deliveries')}</Text>

      <View style={styles.tabs}>
        {(['active', 'history'] as Tab[]).map(key => (
          <TouchableOpacity key={key} style={[styles.tab, tab === key && styles.tabSelected]} onPress={() => setTab(key)}>
            <Text style={[styles.tabText, tab === key && styles.tabTextSelected]}>
              {key === 'active' ? `${t('deliveries.tab_active')} (${activeCount})` : t('deliveries.tab_history')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={deliveries}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.colors.primary} />}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={theme.colors.primary} /> : null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Navigation size={56} color={theme.colors.border} />
            <Text style={styles.emptyText}>{t(tab === 'active' ? 'deliveries.no_active' : 'deliveries.no_delivery_history')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text, paddingHorizontal: 20, paddingTop: 16 },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: theme.radius.md },
  tabSelected: { backgroundColor: theme.colors.primary },
  tabText: { fontWeight: '600', color: theme.colors.textMuted },
  tabTextSelected: { color: theme.colors.white },
  list: { padding: 16, flexGrow: 1 },
  footer: { paddingVertical: 16 },
  card: { backgroundColor: theme.colors.white, borderRadius: theme.radius.md, padding: 14, marginBottom: 12, ...theme.shadows.soft },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  orderId: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  lineText: { flex: 1, color: theme.colors.text },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  time: { fontSize: 12, color: theme.colors.textMuted },
  feeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fee: { fontWeight: 'bold', color: theme.colors.success },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: theme.colors.textMuted, marginTop: 12 },
});

export default DeliveriesScreen;
