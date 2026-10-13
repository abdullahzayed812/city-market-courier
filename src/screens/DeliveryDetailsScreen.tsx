import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  AppText as Text,
  Button,
  Card,
  IconButton,
  SectionHeader,
  StatusBadge,
  SummaryRow,
  Divider,
  LoadingState,
  EmptyState,
  apiErrorMessage,
  palette,
  radii,
  sizes,
  space,
} from '@city-market/mobile-ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, MapPin, Phone, Navigation, CircleCheck, XCircle, Undo2, X, Banknote, Timer, PackageX } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { DeliveryStatus, EventType } from '@city-market/shared';

import { DeliveryService } from '../services/api/deliveryService';
import { useSocket } from '../app/SocketContext';
import { useSlaCountdown } from '../hooks/useSlaCountdown';
import { useFormat } from '../hooks/useFormat';
import QueryError from '../components/common/QueryError';
import {
  itemsTotal,
  nextStep,
  openDirections,
  shortOrderId,
  statusMeta,
  statusLabelKey,
} from '../features/deliveries/deliveryHelpers';

// Customer-side problems: the order fails and the customer is penalised.
const CANCEL_REASONS = [
  'cancel_reason_not_available',
  'cancel_reason_refused',
  'cancel_reason_wrong_address',
  'cancel_reason_other',
] as const;

const PickupCountdown = ({ deadline, label }: { deadline?: Date | string | null; label: string }) => {
  const { remainingSeconds, isExpired, isWarning, formattedTime } = useSlaCountdown(deadline);
  if (!deadline || isExpired || remainingSeconds <= 0) return null;
  const fg = isWarning ? palette.error : palette.warning;
  return (
    <View style={[styles.countdown, { backgroundColor: isWarning ? palette.errorSoft : palette.warningSoft }]}>
      <Timer size={22} color={fg} />
      <Text variant="bodyStrong" color={fg} style={styles.flex}>{label}</Text>
      <Text variant="display" color={fg} style={styles.tabular}>{formattedTime}</Text>
    </View>
  );
};

interface PlaceProps {
  kind: 'pickup' | 'dropoff';
  title?: string;
  address: string;
  current: boolean;
  onDirections: () => void;
  onCall?: () => void;
  directionsLabel: string;
  callLabel?: string;
}

/** One stop on the route; the current stop is emphasised and its actions are large. */
const Place = ({ kind, title, address, current, onDirections, onCall, directionsLabel, callLabel }: PlaceProps) => {
  const Icon = kind === 'pickup' ? Store : MapPin;
  return (
    <Card style={[styles.place, current && styles.placeCurrent]}>
      <View style={styles.placeHead}>
        <View style={[styles.placeIcon, kind === 'pickup' ? styles.placeIconPickup : styles.placeIconDrop]}>
          <Icon size={20} color={kind === 'pickup' ? palette.primary : palette.accentText} />
        </View>
        <View style={styles.flex}>
          {title ? <Text variant="bodyStrong" color={palette.text}>{title}</Text> : null}
          <Text variant={current ? 'subheading' : 'body'} color={current ? palette.text : palette.textSecondary}>{address}</Text>
        </View>
      </View>
      <View style={styles.placeActions}>
        <Button
          label={directionsLabel}
          icon={Navigation}
          variant={current ? 'primary' : 'secondary'}
          size={current ? 'md' : 'sm'}
          onPress={onDirections}
          style={styles.flex}
        />
        {onCall && callLabel ? (
          <Button label={callLabel} icon={Phone} variant="outline" size={current ? 'md' : 'sm'} onPress={onCall} style={styles.flex} />
        ) : null}
      </View>
    </Card>
  );
};

const DeliveryDetailsScreen = ({ route, navigation }: any) => {
  const { deliveryId } = route.params as { deliveryId: string };
  const { t } = useTranslation();
  const { money, weight } = useFormat();
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [cancelVisible, setCancelVisible] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');

  const { data: delivery, isLoading, error, refetch, isRefetching } = useQuery({
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
  const onError = (err: unknown) => Toast.show({ type: 'error', text1: t('common.action_failed'), text2: apiErrorMessage(err) });

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

  if (isLoading) return <LoadingState style={styles.container} />;

  if (!delivery) {
    // 404: released, reassigned or taken back to the pool.
    const gone = !error || (error as any)?.response?.status === 404;
    return (
      <View style={styles.container}>
        {gone ? (
          <EmptyState icon={PackageX} title={t('deliveries.not_found')} actionLabel={t('common.retry')} onAction={() => refetch()} />
        ) : (
          <QueryError error={error} onRetry={refetch} retrying={isRefetching} />
        )}
      </View>
    );
  }

  const meta = statusMeta(delivery.status);
  const step = nextStep(delivery.status);
  const isAssigned = delivery.status === DeliveryStatus.ASSIGNED;
  const isDelivered = delivery.status === DeliveryStatus.DELIVERED;
  const items = itemsTotal(delivery);
  const fee = Number(delivery.deliveryFee || 0);
  const toCollect = items + fee;
  const busy = statusMutation.isPending || cancelMutation.isPending || releaseMutation.isPending;
  const otherReason = reason === 'cancel_reason_other';
  const canSubmitCancel = !!reason && (!otherReason || customReason.trim().length > 0);

  const confirmRelease = () =>
    Alert.alert(t('deliveries.release_title'), t('deliveries.release_message'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('deliveries.release_confirm'), style: 'destructive', onPress: () => releaseMutation.mutate() },
    ]);

  const submitCancel = () => {
    if (!canSubmitCancel || !reason) return;
    cancelMutation.mutate(otherReason ? customReason.trim() : t(`deliveries.${reason}`));
  };

  const callCustomer = delivery.customerPhone ? () => Linking.openURL(`tel:${delivery.customerPhone}`) : undefined;

  const pickups = (delivery.pickupLocations ?? []).map(pl => ({
    pl,
    vendorName: delivery.vendorOrders?.find((vo: any) => vo.id === pl.vendorOrderId)?.vendorName as string | undefined,
  }));
  const pickupPlaces = pickups.map(({ pl, vendorName }) => (
    <Place
      key={pl.id}
      kind="pickup"
      title={vendorName}
      address={pl.address}
      current={isAssigned}
      onDirections={() => openDirections(pl.latitude, pl.longitude, pl.address)}
      directionsLabel={t('deliveries.directions')}
    />
  ));
  const dropoffPlace = (
    <Place
      kind="dropoff"
      address={delivery.deliveryAddress}
      current={!isAssigned && !isDelivered}
      onDirections={() => openDirections(delivery.deliveryLatitude, delivery.deliveryLongitude, delivery.deliveryAddress)}
      onCall={callCustomer}
      directionsLabel={t('deliveries.directions')}
      callLabel={t('deliveries.call_customer')}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={palette.primary} colors={[palette.primary]} />}
      >
        <View style={styles.headRow}>
          <Text variant="title" color={palette.text}>{shortOrderId(delivery)}</Text>
          <StatusBadge label={t(statusLabelKey(delivery.status))} tone={meta.tone} icon={meta.icon} />
        </View>
        {isAssigned ? <PickupCountdown deadline={delivery.pickupDeadline} label={t('deliveries.pickup_before')} /> : null}

        {/* Cash is what the courier must not get wrong: keep it near the top. */}
        <Card style={[styles.cash, isDelivered && styles.cashDone]}>
          <View style={styles.cashHead}>
            <Banknote size={24} color={isDelivered ? palette.success : palette.primary} />
            <Text variant="subheading" color={palette.text} style={styles.flex}>
              {t(isDelivered ? 'deliveries.cash_collected' : 'deliveries.cash_to_collect')}
            </Text>
            <Text variant="title" color={isDelivered ? palette.success : palette.primary} style={styles.tabular}>{money(toCollect)}</Text>
          </View>
          <Divider spacing={space.sm} />
          <SummaryRow label={t('deliveries.items_price')} value={money(items)} />
          <SummaryRow label={t('deliveries.delivery_fee')} value={money(fee)} />
        </Card>

        {/* Current stop first */}
        <SectionHeader
          title={isDelivered ? t('deliveries.delivery_destination') : isAssigned ? t('deliveries.next_stop_pickup') : t('deliveries.next_stop_dropoff')}
          style={styles.sectionGap}
        />
        {isAssigned ? pickupPlaces : dropoffPlace}
        {!isDelivered ? (
          <>
            <SectionHeader title={isAssigned ? t('deliveries.delivery_destination') : t('deliveries.pickup_location')} style={styles.sectionGap} />
            {isAssigned ? dropoffPlace : pickupPlaces}
          </>
        ) : null}

        {/* Items */}
        <SectionHeader title={t('deliveries.order_items')} style={styles.sectionGap} />
        <Card>
          {!delivery.vendorOrders?.length ? (
            <Text variant="body" color={palette.textMuted}>{t('deliveries.no_items_found')}</Text>
          ) : null}
          {delivery.vendorOrders?.map((vo: any, vi: number) => (
            <View key={vo.id} style={[styles.vendorBlock, vi > 0 && styles.vendorGap]}>
              <View style={styles.inline}>
                <Store size={14} color={palette.primary} />
                <Text variant="label" color={palette.primary}>{vo.vendorName || t('common.vendor')}</Text>
              </View>
              {vo.items?.map((it: any) => {
                const grams = it.actualWeightGrams ?? it.requestedWeightGrams;
                const qty = [it.quantity ? `× ${it.quantity}` : null, grams ? weight(grams) : null].filter(Boolean).join(' · ');
                return (
                  <View key={it.id} style={styles.itemRow}>
                    <View style={styles.flex}>
                      <Text variant="body" color={palette.text}>{it.productName}</Text>
                      {qty ? <Text variant="caption" color={palette.textMuted}>{qty}</Text> : null}
                    </View>
                    <Text variant="bodyStrong" color={palette.text} style={styles.tabular}>{money(it.totalPrice)}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </Card>

        {isDelivered ? (
          <View style={styles.done}>
            <CircleCheck size={22} color={palette.success} />
            <Text variant="bodyStrong" color={palette.success}>{t('deliveries.delivery_successful')}</Text>
          </View>
        ) : null}

        {/* Secondary actions: only before pickup */}
        {isAssigned ? (
          <View style={styles.secondary}>
            <Button
              label={t('deliveries.report_customer_problem')}
              icon={XCircle}
              variant="dangerOutline"
              onPress={() => {
                setReason(null);
                setCustomReason('');
                setCancelVisible(true);
              }}
              disabled={busy}
              fullWidth
            />
            <Button label={t('deliveries.release_delivery')} icon={Undo2} variant="ghost" onPress={confirmRelease} disabled={busy} fullWidth />
          </View>
        ) : null}
      </ScrollView>

      {/* Primary action */}
      {step ? (
        <View style={styles.bottomBar}>
          <Button label={t(step.labelKey)} onPress={() => setConfirmVisible(true)} disabled={busy} loading={statusMutation.isPending} size="lg" fullWidth />
        </View>
      ) : null}

      {/* Confirm status change */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.overlayCenter}>
          <View style={styles.dialog}>
            <Text variant="heading" color={palette.text}>{step ? t(step.labelKey) : ''}</Text>
            <Text variant="body" color={palette.textSecondary}>{t('deliveries.update_status_description')}</Text>
            {step?.status === DeliveryStatus.DELIVERED ? (
              <View style={styles.collectBox}>
                <Banknote size={22} color={palette.primary} />
                <Text variant="bodyStrong" color={palette.text} style={styles.flex}>
                  {t('deliveries.collect_reminder', { amount: money(toCollect) })}
                </Text>
              </View>
            ) : null}
            <View style={styles.dialogActions}>
              <Button label={t('common.cancel')} variant="outline" onPress={() => setConfirmVisible(false)} disabled={statusMutation.isPending} style={styles.flex} />
              <Button
                label={t('common.confirm')}
                onPress={() => step && statusMutation.mutate(step.status)}
                loading={statusMutation.isPending}
                style={styles.flex}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Customer problem reasons */}
      <Modal visible={cancelVisible} transparent animationType="slide" onRequestClose={() => setCancelVisible(false)}>
        <KeyboardAvoidingView style={styles.overlayBottom} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            <View style={styles.sheetHead}>
              <View style={styles.flex}>
                <Text variant="heading" color={palette.text}>{t('deliveries.cancel_delivery_title')}</Text>
                <Text variant="caption" color={palette.textMuted}>{t('deliveries.cancel_delivery_body')}</Text>
              </View>
              <IconButton icon={X} variant="soft" size={36} onPress={() => setCancelVisible(false)} accessibilityLabel={t('common.cancel')} />
            </View>
            {CANCEL_REASONS.map(key => {
              const selected = reason === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setReason(key)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.reason, selected && styles.reasonSelected]}
                >
                  <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                  <Text variant="body" color={palette.text} style={styles.flex}>{t(`deliveries.${key}`)}</Text>
                </Pressable>
              );
            })}
            {otherReason ? (
              <>
                <TextInput
                  style={styles.reasonInput}
                  placeholder={t('deliveries.cancel_reason_placeholder')}
                  placeholderTextColor={palette.textDisabled}
                  value={customReason}
                  onChangeText={setCustomReason}
                  multiline
                  maxLength={300}
                  autoFocus
                />
                {!customReason.trim() ? (
                  <Text variant="caption" color={palette.textMuted}>{t('deliveries.reason_required')}</Text>
                ) : null}
              </>
            ) : null}
            <Button
              label={t('deliveries.cancel_confirm')}
              icon={PackageX}
              variant="danger"
              onPress={submitCancel}
              disabled={!canSubmitCancel}
              loading={cancelMutation.isPending}
              size="lg"
              fullWidth
              style={styles.sheetSubmit}
            />
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.huge },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  sectionGap: { marginTop: space.sm, marginBottom: 0 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radii.lg,
  },
  cash: { borderWidth: 1.5, borderColor: palette.primaryMuted },
  cashDone: { borderColor: palette.success, backgroundColor: palette.successSoft },
  cashHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  place: { gap: space.md },
  placeCurrent: { borderWidth: 1.5, borderColor: palette.primary },
  placeHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  placeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  placeIconPickup: { backgroundColor: palette.primarySoft },
  placeIconDrop: { backgroundColor: palette.accentSoft },
  placeActions: { flexDirection: 'row', gap: space.sm },
  vendorBlock: { gap: space.sm },
  vendorGap: { marginTop: space.lg },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    padding: space.lg,
    borderRadius: radii.lg,
    backgroundColor: palette.successSoft,
  },
  secondary: { gap: space.sm, marginTop: space.md },
  bottomBar: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.md,
    backgroundColor: palette.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  overlayCenter: { flex: 1, justifyContent: 'center', padding: space.xl, backgroundColor: palette.overlay },
  overlayBottom: { flex: 1, justifyContent: 'flex-end', backgroundColor: palette.overlay },
  dialog: { gap: space.lg, padding: space.xl, borderRadius: radii.xl, backgroundColor: palette.surface },
  dialogActions: { flexDirection: 'row', gap: space.sm },
  collectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radii.md,
    backgroundColor: palette.primarySoft,
  },
  sheet: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.md,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    backgroundColor: palette.surface,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, marginBottom: space.sm },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: sizes.buttonLg,
    paddingHorizontal: space.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  reasonSelected: { borderColor: palette.error, backgroundColor: palette.errorSoft },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: palette.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: palette.error },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: palette.error },
  reasonInput: {
    minHeight: 88,
    padding: space.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    fontSize: 15,
    color: palette.text,
    textAlignVertical: 'top',
  },
  sheetSubmit: { marginTop: space.sm },
});

export default DeliveryDetailsScreen;
