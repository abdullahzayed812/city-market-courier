import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, StatusBar, RefreshControl } from 'react-native';
import { Chip, EmptyState, LoadingState, ScreenHeader, palette, space } from '@city-market/mobile-ui';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Navigation, History } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EventType } from '@city-market/shared';

import { DeliveryService } from '../services/api/deliveryService';
import { useSocket } from '../app/SocketContext';
import QueryError from '../components/common/QueryError';
import { DeliveryRow } from '../components/deliveries/DeliveryRow';
import { isActiveDelivery } from '../features/deliveries/deliveryHelpers';

type Tab = 'active' | 'history';

const DeliveriesScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [tab, setTab] = useState<Tab>('active');

  const { data, isLoading, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
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

  const historyCount = all.length - activeCount;
  const openDelivery = useCallback((id: string) => navigation.navigate('DeliveryDetails', { deliveryId: id }), [navigation]);

  let body: React.ReactNode;
  if (isLoading) {
    body = <LoadingState />;
  } else if (error && all.length === 0) {
    body = <QueryError error={error} onRetry={refetch} retrying={isRefetching} />;
  } else {
    body = (
      <FlatList
        data={deliveries}
        renderItem={({ item }) => <DeliveryRow item={item} onPress={openDelivery} />}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={palette.primary} colors={[palette.primary]} />}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={palette.primary} /> : null}
        ListEmptyComponent={
          <EmptyState
            icon={tab === 'active' ? Navigation : History}
            title={t(tab === 'active' ? 'deliveries.no_active' : 'deliveries.no_delivery_history')}
          />
        }
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.surface} />
      <ScreenHeader title={t('deliveries.all_deliveries')} />
      <View style={styles.tabs}>
        <Chip label={t('deliveries.tab_active')} count={activeCount} selected={tab === 'active'} onPress={() => setTab('active')} />
        <Chip label={t('deliveries.tab_history')} count={historyCount} selected={tab === 'history'} onPress={() => setTab('history')} />
      </View>
      {body}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  tabs: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    backgroundColor: palette.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  list: { padding: space.lg, gap: space.md, flexGrow: 1 },
  footer: { paddingVertical: space.lg },
});

export default DeliveriesScreen;
