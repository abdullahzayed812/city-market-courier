import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Modal,
  Linking,
  TextInput,
  ScrollView,
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
  AlertTriangle,
  X,
  ChevronLeft,
  Phone,
  XCircle,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeliveryService } from '../services/api/deliveryService';
import { useSocket } from '../app/SocketContext';
import { theme } from '../theme';
import { Delivery, DeliveryStatus, EventType } from '@city-market/shared';

const DeliveriesScreen = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isRTL = i18n.language === 'ar';

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<{
    id: string;
    status: DeliveryStatus;
    vendorOrderId: string;
    customerOrderId: string;
  } | null>(null);

  const CANCEL_REASONS = [
    'cancel_reason_not_available',
    'cancel_reason_refused',
    'cancel_reason_wrong_address',
    'cancel_reason_other',
  ] as const;

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelDeliveryId, setCancelDeliveryId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');

  const { data: myDeliveries, isLoading: myLoading } = useQuery<
    Delivery[] | undefined
  >({
    // Use Delivery[]
    queryKey: ['myDeliveries'],
    queryFn: DeliveryService.getMyDeliveries,
  });

  console.log(myDeliveries);

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
    mutationFn: ({
      id,
      status,
      vendorOrderId,
    }: { id: string; status: DeliveryStatus; vendorOrderId: string }) =>
      DeliveryService.updateStatus(id, { status, vendorOrderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDeliveries'] });
      queryClient.invalidateQueries({ queryKey: ['activeDeliveries'] });
      setModalVisible(false);
      setSelectedDelivery(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      DeliveryService.cancelByCourier(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDeliveries'] });
      queryClient.invalidateQueries({ queryKey: ['activeDeliveries'] });
      setCancelModalVisible(false);
      setCancelDeliveryId(null);
      setSelectedReason(null);
      setCustomReason('');
    },
  });

  const deliveriesWithTotal = useMemo(() => {
    return (myDeliveries || []).map(d => ({
      ...d,
      computedTotal:
        d.vendorOrders?.reduce((total: number, vo: any) => {
          return (
            total +
            (vo.items?.reduce((sum: number, i: any) => {
              return sum + (i.totalPrice || 0);
            }, 0) || 0)
          );
        }, 0) || 0,
    }));
  }, [myDeliveries]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const hasAssigned = (myDeliveries || []).some(
      d => d.status === DeliveryStatus.ASSIGNED && d.assignedWindowExpiry,
    );
    if (!hasAssigned) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [myDeliveries]);

  const getAssignedWindowCountdown = useCallback(
    (expiry: Date | string | undefined): string | null => {
      if (!expiry) return null;
      const diff = Math.max(0, new Date(expiry).getTime() - now);
      if (diff === 0) return null;
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    },
    [now],
  );

  const isWithinAssignedWindow = useCallback(
    (expiry: Date | string | undefined): boolean => {
      if (!expiry) return false;
      return new Date(expiry).getTime() > now;
    },
    [now],
  );

  const handleUpdateStatus = (
    id: string,
    currentStatus: DeliveryStatus,
    vendorOrderId: string,
    customerOrderId: string,
  ) => {
    setSelectedDelivery({ id, status: currentStatus, vendorOrderId, customerOrderId });
    setModalVisible(true);
  };

  const handleOpenCancelModal = (deliveryId: string) => {
    setCancelDeliveryId(deliveryId);
    setSelectedReason(null);
    setCustomReason('');
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = () => {
    if (!cancelDeliveryId || !selectedReason) return;
    const reason =
      selectedReason === 'cancel_reason_other'
        ? customReason.trim() || t(`deliveries.${selectedReason}`)
        : t(`deliveries.${selectedReason}`);
    cancelMutation.mutate({ id: cancelDeliveryId, reason });
  };

  const confirmUpdateStatus = () => {
    if (!selectedDelivery) return;

    // Use DeliveryStatus
    let nextStatus: DeliveryStatus | undefined;
    if (selectedDelivery.status === DeliveryStatus.ASSIGNED)
      nextStatus = DeliveryStatus.PICKED_UP;
    else if (selectedDelivery.status === DeliveryStatus.PICKED_UP)
      nextStatus = DeliveryStatus.ON_THE_WAY;
    else if (selectedDelivery.status === DeliveryStatus.ON_THE_WAY)
      nextStatus = DeliveryStatus.DELIVERED;

    if (nextStatus) {
      statusMutation.mutate({
        id: selectedDelivery.id,
        status: nextStatus,
        vendorOrderId: selectedDelivery.vendorOrderId,
      });
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
    const statusConfig = getStatusConfig(item.status);
    const isCompleted = item.status === DeliveryStatus.DELIVERED;
    const inCallWindow =
      item.status === DeliveryStatus.ASSIGNED &&
      isWithinAssignedWindow(item.assignedWindowExpiry);
    const countdown = inCallWindow
      ? getAssignedWindowCountdown(item.assignedWindowExpiry)
      : null;

    const totalPrice = item.computedTotal;

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

        <View style={styles.itemsContainer}>
          <Text style={styles.itemsTitle}>{t('deliveries.order_items')}</Text>
          {item.vendorOrders?.map((vo: any) => (
            <View key={vo.id} style={styles.vendorSection}>
              <Text style={styles.vendorName}>
                {vo.vendorName || t('common.vendor')}
              </Text>
              {vo.items?.map((orderItem: any) => (
                <View key={orderItem.id} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{orderItem.productName}</Text>

                    <Text style={styles.itemQuantity}>
                      {orderItem.quantity ? `x${orderItem.quantity}` : ''}
                      {orderItem.actualWeightGrams
                        ? ` (${(orderItem.actualWeightGrams / 1000).toFixed(
                            2,
                          )} kg)`
                        : orderItem.requestedWeightGrams
                        ? ` (${(orderItem.requestedWeightGrams / 1000).toFixed(
                            2,
                          )} kg)`
                        : ''}
                    </Text>
                  </View>
                  <Text style={styles.itemPrice}>
                    {orderItem.totalPrice.toFixed(2)} {t('common.currency')}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          <View style={{ marginTop: 12 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
              {t('deliveries.total_price')}: {totalPrice?.toFixed(2)}{' '}
              {t('common.currency')}
            </Text>
          </View>

          {(!item.vendorOrders || item.vendorOrders.length === 0) && (
            <Text style={styles.emptyText}>
              {t('deliveries.no_items_found')}
            </Text>
          )}
        </View>

        {item.status === DeliveryStatus.ASSIGNED && (
          <View style={styles.assignedActions}>
            {/* Countdown badge */}
            {inCallWindow && countdown && (
              <View style={styles.countdownBadge}>
                <Clock size={13} color="#FF9500" />
                <Text style={styles.countdownBadgeText}>
                  {t('deliveries.call_window_label')}: {countdown}
                </Text>
              </View>
            )}

            {/* Primary row: Confirm Pickup + Call Customer */}
            <View style={styles.assignedButtonRow}>
              <TouchableOpacity
                style={[styles.confirmPickupButton, statusMutation.isPending && styles.disabledButton]}
                onPress={() =>
                  handleUpdateStatus(item.id, item.status, item.vendorOrderId || '', item.customerOrderId || '')
                }
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending ? (
                  <ActivityIndicator color={theme.colors.white} size="small" />
                ) : (
                  <Text style={styles.confirmPickupText}>{t('deliveries.confirm_pickup')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.callButtonSmall, !item.customerPhone && styles.disabledButton]}
                onPress={() => item.customerPhone && Linking.openURL(`tel:${item.customerPhone}`)}
                disabled={!item.customerPhone}
              >
                <Phone size={16} color={theme.colors.white} />
                <Text style={styles.callButtonSmallText}>{t('deliveries.call_customer')}</Text>
              </TouchableOpacity>
            </View>

            {/* Cancel button — only after window expires */}
            {!inCallWindow && (
              <TouchableOpacity
                style={[styles.cancelDeliveryButton, cancelMutation.isPending && styles.disabledButton]}
                onPress={() => handleOpenCancelModal(item.id)}
                disabled={cancelMutation.isPending}
              >
                <XCircle size={16} color={theme.colors.error} />
                <Text style={styles.cancelDeliveryText}>{t('deliveries.cancel_delivery')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!isCompleted && item.status !== DeliveryStatus.ASSIGNED && (
          <TouchableOpacity
            style={[styles.actionButton, statusMutation.isPending && styles.disabledButton]}
            onPress={() =>
              handleUpdateStatus(item.id, item.status, item.vendorOrderId || '', item.customerOrderId || '')
            }
            disabled={statusMutation.isPending}
          >
            {statusMutation.isPending ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <>
                <Text style={styles.actionButtonText}>{getNextStatusLabel(item.status, t)}</Text>
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
          data={deliveriesWithTotal}
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

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.alertIconContainer}>
                <AlertTriangle size={24} color={theme.colors.warning} />
              </View>
              <Text style={styles.modalTitle}>
                {t('deliveries.update_status_title', 'Update Status')}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalDescription}>
                {t(
                  'deliveries.update_status_description',
                  'Are you sure you want to update the status of this delivery?',
                )}
              </Text>

              {selectedDelivery && (
                <View style={styles.deliveryInfoCard}>
                  <Text style={styles.infoLabel}>
                    {t('deliveries.order_number', 'Order Number')}
                  </Text>
                  <Text style={styles.infoValue}>
                    #{selectedDelivery.customerOrderId.slice(-8)}
                  </Text>

                  <View style={styles.statusFlow}>
                    <View style={styles.statusPoint}>
                      <Text style={styles.statusLabel}>
                        {t('deliveries.current_status', 'Current')}
                      </Text>
                      <View
                        style={[
                          styles.smallStatusBadge,
                          {
                            backgroundColor:
                              getStatusConfig(selectedDelivery.status).color +
                              '15',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.smallStatusText,
                            {
                              color: getStatusConfig(selectedDelivery.status)
                                .color,
                            },
                          ]}
                        >
                          {getStatusConfig(selectedDelivery.status).label}
                        </Text>
                      </View>
                    </View>

                    <ChevronLeft size={20} color={theme.colors.textMuted} />

                    <View style={styles.statusPoint}>
                      <Text style={styles.statusLabel}>
                        {t('deliveries.next_status', 'Next')}
                      </Text>
                      <View style={styles.nextStatusBadge}>
                        <Text style={styles.nextStatusText}>
                          {getNextStatusLabel(selectedDelivery.status, t)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                disabled={statusMutation.isPending}
              >
                <Text style={styles.cancelButtonText}>
                  {t('common.cancel', 'Cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmUpdateStatus}
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending ? (
                  <ActivityIndicator color={theme.colors.white} size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {t('common.confirm', 'Confirm')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Cancel Reason Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.alertIconContainer, { backgroundColor: theme.colors.error + '15' }]}>
                <XCircle size={24} color={theme.colors.error} />
              </View>
              <Text style={styles.modalTitle}>{t('deliveries.cancel_delivery_title')}</Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)} style={styles.closeButton}>
                <X size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalDescription}>{t('deliveries.cancel_delivery_body')}</Text>

              {CANCEL_REASONS.map(reasonKey => (
                <TouchableOpacity
                  key={reasonKey}
                  style={[
                    styles.reasonOption,
                    selectedReason === reasonKey && styles.reasonOptionSelected,
                  ]}
                  onPress={() => setSelectedReason(reasonKey)}
                >
                  <View
                    style={[
                      styles.radioCircle,
                      selectedReason === reasonKey && styles.radioCircleSelected,
                    ]}
                  />
                  <Text
                    style={[
                      styles.reasonText,
                      selectedReason === reasonKey && styles.reasonTextSelected,
                    ]}
                  >
                    {t(`deliveries.${reasonKey}`)}
                  </Text>
                </TouchableOpacity>
              ))}

              {selectedReason === 'cancel_reason_other' && (
                <TextInput
                  style={styles.reasonInput}
                  placeholder={t('deliveries.cancel_reason_placeholder')}
                  placeholderTextColor={theme.colors.textMuted}
                  value={customReason}
                  onChangeText={setCustomReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setCancelModalVisible(false)}
                disabled={cancelMutation.isPending}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  { backgroundColor: theme.colors.error },
                  (!selectedReason || cancelMutation.isPending) && styles.disabledButton,
                ]}
                onPress={handleConfirmCancel}
                disabled={!selectedReason || cancelMutation.isPending}
              >
                {cancelMutation.isPending ? (
                  <ActivityIndicator color={theme.colors.white} size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>{t('deliveries.cancel_confirm')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  assignedActions: {
    marginTop: 10,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FF9500' + '15',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FF9500' + '30',
  },
  countdownBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF9500',
    marginStart: 5,
  },
  assignedButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmPickupButton: {
    flex: 1,
    height: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.soft,
  },
  confirmPickupText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  callButtonSmall: {
    flex: 1,
    height: 48,
    backgroundColor: '#FF9500',
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.soft,
  },
  callButtonSmallText: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: 'bold',
    marginStart: 6,
  },
  cancelDeliveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    marginTop: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.error + '50',
    backgroundColor: theme.colors.error + '08',
  },
  cancelDeliveryText: {
    color: theme.colors.error,
    fontSize: 14,
    fontWeight: 'bold',
    marginStart: 6,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
    backgroundColor: theme.colors.white,
  },
  reasonOptionSelected: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.error + '08',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginEnd: 10,
  },
  radioCircleSelected: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.error,
  },
  reasonText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    flex: 1,
  },
  reasonTextSelected: {
    color: theme.colors.error,
    fontWeight: '600',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 12,
    fontSize: 14,
    color: theme.colors.text,
    minHeight: 80,
    marginTop: 4,
    backgroundColor: theme.colors.white,
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
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  itemsContainer: {
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginBottom: 15,
  },
  itemsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  vendorSection: {
    marginBottom: 10,
  },
  vendorName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    // justifyContent: 'flex-start',
    paddingVertical: 2,
  },
  itemInfo: {
    flex: 1,
  },
  itemQuantity: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  itemName: {
    fontSize: 13,
    color: theme.colors.text,
    // flex: 1,
  },
  itemPrice: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginStart: 10,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    ...theme.shadows.medium,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  alertIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.warning + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 15,
    color: theme.colors.textMuted,
    lineHeight: 22,
    marginBottom: 20,
  },
  deliveryInfoCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 16,
  },
  statusFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPoint: {
    // flex: 1,
    // alignItems: 'flex-start',
  },
  statusLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  smallStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  smallStatusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  nextStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary,
  },
  nextStatusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background + '50',
  },
  cancelButton: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
  },
  confirmButton: {
    flex: 2,
    height: 48,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.radius.md,
    ...theme.shadows.soft,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
});

export default DeliveriesScreen;
