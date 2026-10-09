import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { AppText as Text } from '@city-market/mobile-ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, MapPin, Phone, Navigation, CheckCircle2, XCircle, Undo2, X, User, Banknote } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { DeliveryStatus, EventType } from '@city-market/shared';

import { DeliveryService } from '../services/api/deliveryService';
import { useSocket } from '../app/SocketContext';
import { PickupCountdownBadge } from '../components/deliveries/PickupCountdownBadge';
import {
  itemsTotal,
  nextStep,
  openDirections,
  shortOrderId,
  statusColor,
  statusLabelKey,
} from '../features/deliveries/deliveryHelpers';
import { theme } from '../theme';

// Customer-side problems: the order fails and the customer is penalised.
const CANCEL_REASONS = [
  'cancel_reason_not_available',
  'cancel_reason_refused',
  'cancel_reason_wrong_address',
  'cancel_reason_other',
] as const;

const DeliveryDetailsScreen = ({ route, navigation }: any) => {
  const { deliveryId } = route.params as { deliveryId: string };
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [cancelVisible, setCancelVisible] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');

  const { data: delivery, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['delivery', deliveryId],
    queryFn: () => DeliveryService.getDeliveryById(deliveryId),
  });

  useEffect(() => {
    if (!socket) return;
    const refresh = (payload: any) => {
      if (!payload?.deliveryId || payload.deliveryId === deliveryId) refetch();
    };
    const events = [EventType.ORDER_PICKED_UP, EventType.ORDER_DELIVERED, EventType.SLA_TIMER_STARTED, EventType.SLA_COURIER_PICKUP_EXPIRED];
    events.forEach(e => socket.on(e, refresh));
    return () => events.forEach(e => socket.off(e, refresh));
  }, [socket, deliveryId, refetch]);

  const afterChange = () => {
    queryClient.invalidateQueries({ queryKey: ['delivery', deliveryId] });
    queryClient.invalidateQueries({ queryKey: ['myDeliveries'] });
    queryClient.invalidateQueries({ queryKey: ['activeDeliveries'] });
    queryClient.invalidateQueries({ queryKey: ['courierProfile'] });
  };
  const onError = (err: any) => Toast.show({ type: 'error', text1: err?.response?.data?.message || t('common.error') });

  const statusMutation = useMutation({
    mutationFn: (status: DeliveryStatus) => DeliveryService.updateStatus(deliveryId, { status, vendorOrderId: delivery?.vendorOrderId ?? '' }),
    onSuccess: () => {
      setConfirmVisible(false);
      afterChange();
    },
    onError,
  });

  const cancelMutation = useMutation({
    mutationFn: (text: string) => DeliveryService.cancelByCourier(deliveryId, text),
    onSuccess: () => {
      setCancelVisible(false);
      afterChange();
      navigation.goBack();
    },
    onError,
  });

  const releaseMutation = useMutation({
    mutationFn: () => DeliveryService.releaseDelivery(deliveryId),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: t('deliveries.released') });
      afterChange();
      navigation.goBack();
    },
    onError,
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !delivery) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>{t('deliveries.not_found')}</Text>
        <TouchableOpacity style={styles.retry} onPress={() => refetch()}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const color = statusColor(delivery.status);
  const step = nextStep(delivery.status);
  const isAssigned = delivery.status === DeliveryStatus.ASSIGNED;
  const items = itemsTotal(delivery);
  const fee = Number(delivery.deliveryFee || 0);
  const busy = statusMutation.isPending || cancelMutation.isPending || releaseMutation.isPending;

  const confirmRelease = () =>
    Alert.alert(t('deliveries.release_title'), t('deliveries.release_message'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('deliveries.release_confirm'), style: 'destructive', onPress: () => releaseMutation.mutate() },
    ]);

  const submitCancel = () => {
    if (!reason) return;
    const text = reason === 'cancel_reason_other' ? customReason.trim() || t(`deliveries.${reason}`) : t(`deliveries.${reason}`);
    cancelMutation.mutate(text);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
        {/* Status */}
        <View style={styles.headerRow}>
          <Text style={styles.orderId}>{shortOrderId(delivery)}</Text>
          <View style={[styles.badge, { backgroundColor: color + '18' }]}>
            <Text style={[styles.badgeText, { color }]}>{t(statusLabelKey(delivery.status))}</Text>
          </View>
        </View>
        {isAssigned && (
          <View style={styles.countdownRow}>
            <Text style={styles.muted}>{t('deliveries.pickup_before')}</Text>
            <PickupCountdownBadge deadline={delivery.pickupDeadline} />
          </View>
        )}

        {/* Pickups */}
        <Text style={styles.section}>{t('deliveries.pickup_location')}</Text>
        {delivery.pickupLocations?.map(pl => {
          const vendor = delivery.vendorOrders?.find((vo: any) => vo.id === pl.vendorOrderId);
          return (
            <View key={pl.id} style={styles.card}>
              <View style={styles.placeRow}>
                <Store size={18} color={theme.colors.warning} />
                <View style={styles.placeText}>
                  {vendor?.vendorName && <Text style={styles.placeName}>{vendor.vendorName}</Text>}
                  <Text style={styles.placeAddress}>{pl.address}</Text>
                </View>
                <TouchableOpacity style={styles.iconButton} onPress={() => openDirections(pl.latitude, pl.longitude, pl.address)}>
                  <Navigation size={18} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Customer */}
        <Text style={styles.section}>{t('deliveries.delivery_destination')}</Text>
        <View style={styles.card}>
          <View style={styles.placeRow}>
            <MapPin size={18} color={theme.colors.error} />
            <Text style={[styles.placeText, styles.placeAddress]}>{delivery.deliveryAddress}</Text>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => openDirections(delivery.deliveryLatitude, delivery.deliveryLongitude, delivery.deliveryAddress)}
            >
              <Navigation size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          {delivery.customerPhone && (
            <View style={[styles.placeRow, styles.customerRow]}>
              <User size={18} color={theme.colors.textMuted} />
              <Text style={[styles.placeText, styles.placeAddress]}>{delivery.customerPhone}</Text>
              <TouchableOpacity style={[styles.iconButton, styles.callButton]} onPress={() => Linking.openURL(`tel:${delivery.customerPhone}`)}>
                <Phone size={18} color={theme.colors.white} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Items */}
        <Text style={styles.section}>{t('deliveries.order_items')}</Text>
        <View style={styles.card}>
          {!delivery.vendorOrders?.length && <Text style={styles.muted}>{t('deliveries.no_items_found')}</Text>}
          {delivery.vendorOrders?.map((vo: any) => (
            <View key={vo.id} style={styles.vendorBlock}>
              <Text style={styles.vendorName}>{vo.vendorName || t('common.vendor')}</Text>
              {vo.items?.map((it: any) => {
                const grams = it.actualWeightGrams ?? it.requestedWeightGrams;
                return (
                  <View key={it.id} style={styles.itemRow}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {it.productName}
                      <Text style={styles.muted}>
                        {it.quantity ? `  x${it.quantity}` : ''}
                        {grams ? `  (${(grams / 1000).toFixed(2)} kg)` : ''}
                      </Text>
                    </Text>
                    <Text style={styles.itemPrice}>
                      {Number(it.totalPrice || 0).toFixed(2)} {t('common.currency')}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Money */}
        <View style={[styles.card, styles.moneyCard]}>
          <MoneyRow label={t('deliveries.items_price')} value={items} currency={t('common.currency')} />
          <MoneyRow label={t('deliveries.delivery_fee')} value={fee} currency={t('common.currency')} />
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Banknote size={18} color={theme.colors.success} />
            <Text style={styles.totalLabel}>
              {t(delivery.status === DeliveryStatus.DELIVERED ? 'deliveries.cash_collected' : 'deliveries.cash_to_collect')}
            </Text>
            <Text style={styles.totalValue}>
              {(items + fee).toFixed(2)} {t('common.currency')}
            </Text>
          </View>
        </View>

        {delivery.status === DeliveryStatus.DELIVERED && (
          <View style={styles.doneBox}>
            <CheckCircle2 size={20} color={theme.colors.success} />
            <Text style={styles.doneText}>{t('deliveries.delivery_successful')}</Text>
          </View>
        )}

        {/* Secondary actions: only before pickup */}
        {isAssigned && (
          <View style={styles.secondaryActions}>
            <TouchableOpacity style={styles.dangerOutline} onPress={() => { setReason(null); setCustomReason(''); setCancelVisible(true); }} disabled={busy}>
              <XCircle size={16} color={theme.colors.error} />
              <Text style={styles.dangerText}>{t('deliveries.report_customer_problem')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mutedOutline} onPress={confirmRelease} disabled={busy}>
              <Undo2 size={16} color={theme.colors.textMuted} />
              <Text style={styles.mutedText}>{t('deliveries.release_delivery')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Primary action */}
      {step && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={[styles.primary, busy && styles.disabled]} onPress={() => setConfirmVisible(true)} disabled={busy}>
            {statusMutation.isPending ? <ActivityIndicator color={theme.colors.white} /> : <Text style={styles.primaryText}>{t(step.labelKey)}</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Confirm status change */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{step ? t(step.labelKey) : ''}</Text>
            <Text style={styles.modalBody}>
              {t('deliveries.update_status_description')}
              {step?.status === DeliveryStatus.DELIVERED ? `\n\n${t('deliveries.collect_reminder', { amount: (items + fee).toFixed(2) })}` : ''}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setConfirmVisible(false)} disabled={statusMutation.isPending}>
                <Text style={styles.mutedText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={() => step && statusMutation.mutate(step.status)} disabled={statusMutation.isPending}>
                {statusMutation.isPending ? <ActivityIndicator color={theme.colors.white} size="small" /> : <Text style={styles.primaryText}>{t('common.confirm')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Customer problem reasons */}
      <Modal visible={cancelVisible} transparent animationType="fade" onRequestClose={() => setCancelVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('deliveries.cancel_delivery_title')}</Text>
              <TouchableOpacity onPress={() => setCancelVisible(false)} hitSlop={10}>
                <X size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalBody}>{t('deliveries.cancel_delivery_body')}</Text>
            {CANCEL_REASONS.map(key => (
              <TouchableOpacity key={key} style={[styles.reason, reason === key && styles.reasonSelected]} onPress={() => setReason(key)}>
                <View style={[styles.radio, reason === key && styles.radioSelected]} />
                <Text style={styles.reasonText}>{t(`deliveries.${key}`)}</Text>
              </TouchableOpacity>
            ))}
            {reason === 'cancel_reason_other' && (
              <TextInput
                style={styles.reasonInput}
                placeholder={t('deliveries.cancel_reason_placeholder')}
                placeholderTextColor={theme.colors.textMuted}
                value={customReason}
                onChangeText={setCustomReason}
                multiline
              />
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setCancelVisible(false)} disabled={cancelMutation.isPending}>
                <Text style={styles.mutedText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, styles.modalDanger, (!reason || cancelMutation.isPending) && styles.disabled]}
                onPress={submitCancel}
                disabled={!reason || cancelMutation.isPending}
              >
                {cancelMutation.isPending ? <ActivityIndicator color={theme.colors.white} size="small" /> : <Text style={styles.primaryText}>{t('deliveries.cancel_confirm')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const MoneyRow = ({ label, value, currency }: { label: string; value: number; currency: string }) => (
  <View style={styles.moneyRow}>
    <Text style={styles.muted}>{label}</Text>
    <Text style={styles.moneyValue}>
      {value.toFixed(2)} {currency}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
  badgeText: { fontWeight: 'bold', fontSize: 13 },
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  section: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text, marginTop: 20, marginBottom: 8 },
  card: { backgroundColor: theme.colors.white, borderRadius: theme.radius.md, padding: 14, marginBottom: 8, ...theme.shadows.soft },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  placeText: { flex: 1 },
  placeName: { fontWeight: 'bold', color: theme.colors.text },
  placeAddress: { color: theme.colors.text },
  customerRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButton: { backgroundColor: theme.colors.success },
  vendorBlock: { marginBottom: 10 },
  vendorName: { fontWeight: 'bold', color: theme.colors.primary, marginBottom: 6 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 4, gap: 12 },
  itemName: { flex: 1, color: theme.colors.text },
  itemPrice: { color: theme.colors.text, fontWeight: '600' },
  moneyCard: { marginTop: 12 },
  moneyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  moneyValue: { color: theme.colors.text, fontWeight: '600' },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 8 },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  totalLabel: { flex: 1, fontWeight: 'bold', color: theme.colors.text },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: theme.colors.success },
  doneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    marginTop: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.success + '15',
  },
  doneText: { color: theme.colors.success, fontWeight: 'bold' },
  secondaryActions: { marginTop: 20, gap: 10 },
  dangerOutline: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    height: 46,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.error + '60',
  },
  dangerText: { color: theme.colors.error, fontWeight: 'bold' },
  mutedOutline: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    height: 46,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  mutedText: { color: theme.colors.textMuted, fontWeight: 'bold' },
  muted: { color: theme.colors.textMuted },
  retry: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, borderRadius: theme.radius.md, backgroundColor: theme.colors.primary },
  retryText: { color: theme.colors.white, fontWeight: 'bold' },
  bottomBar: { padding: 16, backgroundColor: theme.colors.white, borderTopWidth: 1, borderTopColor: theme.colors.border },
  primary: { height: 54, borderRadius: theme.radius.md, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  primaryText: { color: theme.colors.white, fontWeight: 'bold', fontSize: 16 },
  disabled: { opacity: 0.6 },
  overlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: theme.colors.white, borderRadius: theme.radius.md, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  modalBody: { color: theme.colors.textMuted, marginTop: 8, marginBottom: 16, lineHeight: 20 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalCancel: { flex: 1, height: 48, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, justifyContent: 'center', alignItems: 'center' },
  modalConfirm: { flex: 1, height: 48, borderRadius: theme.radius.md, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  modalDanger: { backgroundColor: theme.colors.error },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  reasonSelected: { borderColor: theme.colors.error, backgroundColor: theme.colors.error + '08' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: theme.colors.border },
  radioSelected: { borderColor: theme.colors.error, backgroundColor: theme.colors.error },
  reasonText: { color: theme.colors.text },
  reasonInput: {
    minHeight: 70,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 10,
    color: theme.colors.text,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
});

export default DeliveryDetailsScreen;
