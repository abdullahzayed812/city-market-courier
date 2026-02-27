import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  MapPin,
  ChevronRight,
  Navigation,
  CheckCircle2,
  Clock,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeliveryService } from '../services/api/deliveryService';
import { useSocket } from '../app/SocketContext';
import { theme } from '../theme';
import { Delivery, DeliveryStatus, EventType } from '@city-market/shared'; // Import shared types

const DeliveriesScreen = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isRTL = i18n.language === 'ar';

  const { data: myDeliveries, isLoading: myLoading } = useQuery<
    Delivery[] | undefined
  >({
    // Use Delivery[]
    queryKey: ['myDeliveries'],
    queryFn: DeliveryService.getMyDeliveries,
  });

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['myDeliveries'] });
    };

    const events = [EventType.COURIER_ASSIGNED];
    events.forEach(event => socket.on(event, handleUpdate));

    return () => {
      events.forEach(event => socket.off(event, handleUpdate));
    };
  }, [socket, queryClient]);

  const statusMutation = useMutation({
    mutationFn: (
      {
        id,
        status,
        vendorOrderId,
      }: { id: string; status: DeliveryStatus; vendorOrderId: string }, // Use DeliveryStatus and vendorOrderId
    ) => DeliveryService.updateStatus(id, { status, vendorOrderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDeliveries'] });
      queryClient.invalidateQueries({ queryKey: ['activeDeliveries'] });
    },
  });

  const handleUpdateStatus = (
    id: string,
    currentStatus: DeliveryStatus,
    vendorOrderId: string,
  ) => {
    // Use DeliveryStatus
    let nextStatus: DeliveryStatus | undefined;
    if (currentStatus === DeliveryStatus.ASSIGNED)
      nextStatus = DeliveryStatus.PICKED_UP;
    else if (currentStatus === DeliveryStatus.PICKED_UP)
      nextStatus = DeliveryStatus.ON_THE_WAY;
    else if (currentStatus === DeliveryStatus.ON_THE_WAY)
      nextStatus = DeliveryStatus.DELIVERED;

    if (nextStatus) {
      statusMutation.mutate({ id, status: nextStatus, vendorOrderId });
    }
  };

  const getStatusConfig = (status: DeliveryStatus) => {
    // Use DeliveryStatus
    switch (status) {
      case DeliveryStatus.ASSIGNED:
        return {
          color: theme.colors.primary,
          label: t('deliveries.status_assigned'),
        };
      case DeliveryStatus.PICKED_UP:
        return {
          color: theme.colors.warning,
          label: t('deliveries.status_picked_up'),
        };
      case DeliveryStatus.ON_THE_WAY:
        return {
          color: theme.colors.info,
          label: t('deliveries.status_on_the_way'),
        };
      case DeliveryStatus.DELIVERED:
        return {
          color: theme.colors.success,
          label: t('deliveries.status_delivered'),
        };
      default:
        return {
          color: theme.colors.textMuted,
          label: t(`deliveries.status_${status.toLowerCase()}`, status),
        };
    }
  };

  const renderDeliveryItem = ({ item }: { item: Delivery }) => {
    // Use Delivery
    const statusConfig = getStatusConfig(item.status);
    const isCompleted = item.status === DeliveryStatus.DELIVERED;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.orderIdGroup}>
            <Package size={20} color={theme.colors.primary} />
            <Text style={styles.orderIdText}>
              Order #{item.customerOrderId?.slice(-6)}
            </Text>{' '}
            {/* Use customerOrderId */}
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusConfig.color + '15' },
            ]}
          >
            <Text
              style={[styles.statusBadgeText, { color: statusConfig.color }]}
            >
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.routeContainer}>
          <View style={styles.routeStep}>
            <View style={styles.iconContainer}>
              <View
                style={[styles.dot, { backgroundColor: theme.colors.warning }]}
              />
              <View style={styles.line} />
            </View>
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>
                {t('deliveries.pickup_location')}
              </Text>
              {item?.pickupLocations?.map(pl => (
                <Text key={pl.id} style={styles.routeText} numberOfLines={2}>
                  {pl?.address}
                </Text>
              ))}
              {/* Use pickupLocations */}
            </View>
          </View>

          <View style={styles.routeStep}>
            <View style={styles.iconContainer}>
              <MapPin size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>
                {t('deliveries.delivery_destination')}
              </Text>
              <Text style={styles.routeText} numberOfLines={2}>
                {item.deliveryAddress}
              </Text>
            </View>
          </View>
        </View>

        {!isCompleted && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              statusMutation.isPending && styles.disabledButton,
            ]}
            onPress={() =>
              handleUpdateStatus(item.id, item.status, item.vendorOrderId || '')
            } // Pass vendorOrderId
            disabled={statusMutation.isPending}
          >
            {statusMutation.isPending ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <>
                <Text style={styles.actionButtonText}>
                  {getNextStatusLabel(item.status, t)}
                </Text>
                <ChevronRight
                  size={20}
                  color={theme.colors.white}
                  style={isRTL && { transform: [{ rotate: '180deg' }] }}
                />
              </>
            )}
          </TouchableOpacity>
        )}

        {isCompleted && (
          <View style={styles.completedBox}>
            <CheckCircle2 size={20} color={theme.colors.success} />
            <Text style={styles.completedText}>
              {t('deliveries.delivery_successful')}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (myLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.white} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('deliveries.all_deliveries')}</Text>
          <TouchableOpacity style={styles.filterButton}>
            <Clock size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={[...(myDeliveries || [])]}
          renderItem={renderDeliveryItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Navigation size={64} color={theme.colors.surface} />
              <Text style={styles.emptyText}>
                {t('deliveries.no_delivery_history')}
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

const getNextStatusLabel = (status: DeliveryStatus, t: any) => {
  // Use DeliveryStatus
  switch (status) {
    case DeliveryStatus.ASSIGNED:
      return t('deliveries.confirm_pickup');
    case DeliveryStatus.PICKED_UP:
      return t('deliveries.start_delivery');
    case DeliveryStatus.ON_THE_WAY:
      return t('deliveries.confirm_delivered');
    default:
      return t('deliveries.complete');
  }
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.white },
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...theme.shadows.soft,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: theme.colors.primary },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: { padding: theme.spacing.lg },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    padding: 20,
    marginBottom: 20,
    ...theme.shadows.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  orderIdGroup: { flexDirection: 'row', alignItems: 'center' },
  orderIdText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginStart: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  routeContainer: { marginBottom: 20 },
  routeStep: { flexDirection: 'row', marginBottom: 5 },
  iconContainer: { alignItems: 'center', width: 24, marginEnd: 16 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  line: {
    width: 2,
    height: 40,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
  routeInfo: { flex: 1 },
  routeLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  routeText: {
    fontSize: 15,
    color: theme.colors.primary,
    fontWeight: '500',
    lineHeight: 22,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    height: 56,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    ...theme.shadows.medium,
  },
  disabledButton: { opacity: 0.7 },
  actionButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginEnd: 8,
  },
  completedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success + '10',
    height: 56,
    borderRadius: theme.radius.md,
    marginTop: 10,
  },
  completedText: {
    color: theme.colors.success,
    fontWeight: 'bold',
    marginStart: 8,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
});

export default DeliveriesScreen;
