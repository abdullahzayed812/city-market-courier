import React, { useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Switch, RefreshControl, Pressable } from 'react-native';
import {
  AppText as Text,
  Button,
  Card,
  SectionHeader,
  StatusBadge,
  EmptyState,
  LoadingState,
  ForwardIcon,
  apiErrorMessage,
  palette,
  radii,
  space,
} from '@city-market/mobile-ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star, CircleCheck, Navigation, Store, MapPin, Banknote, Timer, Coffee, Briefcase } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import { DeliveryService } from '../services/api/deliveryService';
import { useAuth } from '../app/AuthContext';
import { useSocket } from '../app/SocketContext';
import { EventType, DeliveryStatus, Delivery } from '@city-market/shared';
import { useAvailableJobs } from '../hooks/useAvailableJobs';
import { useSlaCountdown } from '../hooks/useSlaCountdown';
import { useFormat } from '../hooks/useFormat';
import { JobCard } from '../components/deliveries/JobCard';
import { DeliveryRow } from '../components/deliveries/DeliveryRow';
import QueryError from '../components/common/QueryError';
import {
  itemsTotal,
  nextStep,
  openDirections,
  shortOrderId,
  statusLabelKey,
  statusMeta,
} from '../features/deliveries/deliveryHelpers';

// How many open jobs the dashboard previews; the Jobs tab has the full list
const DASHBOARD_JOBS = 3;

/** Carrying goods first, then pickups by the nearest deadline. */
const byUrgency = (a: Delivery, b: Delivery) => {
  const carrying = (d: Delivery) => (d.status === DeliveryStatus.ASSIGNED ? 1 : 0);
  if (carrying(a) !== carrying(b)) return carrying(a) - carrying(b);
  const da = a.pickupDeadline ? new Date(a.pickupDeadline).getTime() : Infinity;
  const db = b.pickupDeadline ? new Date(b.pickupDeadline).getTime() : Infinity;
  return da - db;
};

const InlineCountdown = ({ deadline, label }: { deadline?: Date | string | null; label: string }) => {
  const { remainingSeconds, isExpired, isWarning, formattedTime } = useSlaCountdown(deadline);
  if (!deadline || isExpired || remainingSeconds <= 0) return null;
  const fg = isWarning ? palette.error : palette.warning;
  return (
    <View style={[styles.countdown, { backgroundColor: isWarning ? palette.errorSoft : palette.warningSoft }]}>
      <Timer size={18} color={fg} />
      <Text variant="label" color={fg} style={styles.flex}>{label}</Text>
      <Text variant="heading" color={fg} style={styles.tabular}>{formattedTime}</Text>
    </View>
  );
};

/** The one delivery the courier should be working on right now. */
const CurrentTask = ({ delivery, onOpen }: { delivery: Delivery; onOpen: () => void }) => {
  const { t } = useTranslation();
  const { money } = useFormat();
  const meta = statusMeta(delivery.status);
  const step = nextStep(delivery.status);
  const atPickup = delivery.status === DeliveryStatus.ASSIGNED;
  const pickup = delivery.pickupLocations?.[0];
  const toCollect = itemsTotal(delivery) + Number(delivery.deliveryFee || 0);
  const directions = () =>
    atPickup && pickup
      ? openDirections(pickup.latitude, pickup.longitude, pickup.address)
      : openDirections(delivery.deliveryLatitude, delivery.deliveryLongitude, delivery.deliveryAddress);

  return (
    <Card appearance="raised" style={styles.task}>
      <View style={styles.rowBetween}>
        <Text variant="title" color={palette.text}>{shortOrderId(delivery)}</Text>
        <StatusBadge label={t(statusLabelKey(delivery.status))} tone={meta.tone} icon={meta.icon} />
      </View>
      {atPickup ? <InlineCountdown deadline={delivery.pickupDeadline} label={t('deliveries.pickup_before')} /> : null}

      <Pressable onPress={onOpen} style={styles.stop} accessibilityRole="button">
        <View style={[styles.stopIcon, atPickup ? styles.stopPickup : styles.stopDrop]}>
          {atPickup ? <Store size={20} color={palette.primary} /> : <MapPin size={20} color={palette.accentText} />}
        </View>
        <View style={styles.flex}>
          <Text variant="caption" color={palette.textMuted}>
            {atPickup ? t('deliveries.next_stop_pickup') : t('deliveries.next_stop_dropoff')}
          </Text>
          <Text variant="subheading" color={palette.text} numberOfLines={2}>
            {atPickup
              ? (delivery.pickupLocations?.length ?? 0) > 1
                ? t('deliveries.stores_count', { count: delivery.pickupLocations.length })
                : pickup?.address ?? '—'
              : delivery.deliveryAddress}
          </Text>
        </View>
      </Pressable>

      <View style={styles.cashRow}>
        <Banknote size={20} color={palette.primary} />
        <Text variant="label" color={palette.textSecondary} style={styles.flex}>{t('deliveries.cash_to_collect')}</Text>
        <Text variant="heading" color={palette.primary} style={styles.tabular}>{money(toCollect)}</Text>
      </View>

      <View style={styles.taskActions}>
        <Button label={t('deliveries.directions')} icon={Navigation} variant="outline" size="lg" onPress={directions} style={styles.flex} />
        <Button
          label={step ? t(step.labelKey) : t('deliveries.open_task')}
          trailingIcon={ForwardIcon}
          size="lg"
          onPress={onOpen}
          style={styles.flex}
        />
      </View>
    </Card>
  );
};

const DashboardScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const { data: profile, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useQuery({
    queryKey: ['courierProfile'],
    queryFn: () => DeliveryService.getProfile(),
  });

  const {
    data: myDeliveries,
    isLoading: deliveriesLoading,
    isFetching: deliveriesFetching,
    error: deliveriesError,
    refetch: refetchDeliveries,
  } = useQuery({
    queryKey: ['activeDeliveries'],
    queryFn: () => DeliveryService.getMyDeliveries(1),
  });

  const activeDeliveries = myDeliveries?.items?.filter(
    (delivery: any) =>
      delivery.status !== DeliveryStatus.DELIVERED &&
      delivery.status !== DeliveryStatus.FAILED,
  );

  // Freelancers: open jobs they can take, previewed under their active deliveries
  const {
    isFreelancer,
    canWork,
    jobs,
    jobsQuery,
    claimMutation,
    emptyMessage: jobsEmptyMessage,
  } = useAvailableJobs(id => navigation.navigate('DeliveryDetails', { deliveryId: id }));

  useFocusEffect(
    useCallback(() => {
      refetchDeliveries();
    }, [refetchDeliveries]),
  );

  const updateAvailabilityMutation = useMutation({
    mutationFn: (isAvailable: boolean) =>
      DeliveryService.updateAvailability(isAvailable),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courierProfile'] });
    },
    // e.g. freelancer not approved yet, or a delivery still in progress
    onError: (err: unknown) => {
      Toast.show({ type: 'error', text1: t('common.action_failed'), text2: apiErrorMessage(err) });
    },
  });

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['activeDeliveries'] });
    };

    // Anything that adds, advances or removes one of my deliveries
    const activeEvents = [
      EventType.COURIER_ASSIGNED,
      EventType.ORDER_PICKED_UP,
      EventType.ORDER_ON_THE_WAY,
      EventType.ORDER_DELIVERED,
      EventType.SLA_COURIER_PICKUP_EXPIRED,
      EventType.DELIVERY_RETURNED_TO_POOL,
    ];
    activeEvents.forEach(e => socket.on(e, handleUpdate));
    const handleApproval = () => queryClient.invalidateQueries({ queryKey: ['courierProfile'] });
    socket.on(EventType.COURIER_APPROVAL_UPDATED, handleApproval);

    return () => {
      activeEvents.forEach(e => socket.off(e, handleUpdate));
      socket.off(EventType.COURIER_APPROVAL_UPDATED, handleApproval);
    };
  }, [socket, queryClient]);

  const toggleAvailability = () => {
    if (profile) {
      updateAvailabilityMutation.mutate(!profile.isAvailable);
    }
  };


  const openDelivery = useCallback((id: string) => navigation.navigate('DeliveryDetails', { deliveryId: id }), [navigation]);
  const sortedActive = useMemo(() => [...(activeDeliveries ?? [])].sort(byUrgency), [activeDeliveries]);

  if (profileLoading || deliveriesLoading) return <LoadingState style={styles.container} />;
  if (!profile && profileError) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <QueryError error={profileError} onRetry={() => { refetchProfile(); refetchDeliveries(); }} />
      </SafeAreaView>
    );
  }

  const [current, ...others] = sortedActive;
  const online = !!profile?.isAvailable;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={deliveriesFetching}
            onRefresh={() => {
              refetchDeliveries();
              refetchProfile();
              if (canWork) jobsQuery.refetch();
            }}
            tintColor={palette.primary}
            colors={[palette.primary]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text variant="caption" color={palette.textMuted}>{t('common.welcome')}</Text>
            <Text variant="title" color={palette.text} numberOfLines={1}>{profile?.fullName || user?.email}</Text>
          </View>
        </View>

        {/* Availability: large, explicit, one tap */}
        <Pressable
          onPress={toggleAvailability}
          disabled={updateAvailabilityMutation.isPending}
          accessibilityRole="switch"
          accessibilityState={{ checked: online, disabled: updateAvailabilityMutation.isPending }}
          accessibilityLabel={t('couriers.availability')}
          style={[styles.availability, online ? styles.availabilityOn : styles.availabilityOff]}
        >
          <View style={[styles.availabilityIcon, { backgroundColor: online ? palette.success : palette.neutral }]}>
            {online ? <Briefcase size={20} color={palette.white} /> : <Coffee size={20} color={palette.white} />}
          </View>
          <View style={styles.flex}>
            <Text variant="subheading" color={palette.text}>{online ? t('dashboard.online') : t('dashboard.offline')}</Text>
            <Text variant="caption" color={palette.textSecondary}>
              {online ? t('dashboard.you_are_online') : t('dashboard.go_online_to_start')}
            </Text>
          </View>
          <Switch
            value={online}
            onValueChange={toggleAvailability}
            disabled={updateAvailabilityMutation.isPending}
            trackColor={{ true: palette.primaryMuted, false: palette.borderStrong }}
            thumbColor={online ? palette.primary : palette.white}
          />
        </Pressable>

        {/* Current task first */}
        {deliveriesError && !myDeliveries ? (
          <QueryError error={deliveriesError} onRetry={() => refetchDeliveries()} compact />
        ) : current ? (
          <>
            <SectionHeader title={t('deliveries.current_task')} style={styles.sectionTight} />
            <CurrentTask delivery={current} onOpen={() => openDelivery(current.id)} />
          </>
        ) : (
          <Card>
            <EmptyState icon={Navigation} title={t('deliveries.no_active')} message={online ? undefined : t('dashboard.go_online_to_start')} compact />
          </Card>
        )}

        {others.length > 0 ? (
          <>
            <SectionHeader title={t('deliveries.other_active')} style={styles.sectionGap} />
            {others.map(d => <DeliveryRow key={d.id} item={d} onPress={openDelivery} />)}
          </>
        ) : null}

        {/* Freelancers: nearest open jobs, take one right from here */}
        {isFreelancer ? (
          <>
            <SectionHeader
              title={t('jobs.title')}
              actionLabel={jobs.length > DASHBOARD_JOBS ? t('dashboard.view_all') : undefined}
              onAction={jobs.length > DASHBOARD_JOBS ? () => navigation.navigate('Jobs') : undefined}
              style={styles.sectionGap}
            />
            {jobs.length > 0 ? (
              jobs.slice(0, DASHBOARD_JOBS).map(job => (
                <JobCard key={job.id} job={job} claiming={claimMutation.isPending} onClaim={id => claimMutation.mutate(id)} />
              ))
            ) : (
              <Card>
                <Text variant="body" color={palette.textMuted} style={styles.center}>{jobsEmptyMessage()}</Text>
              </Card>
            )}
          </>
        ) : null}

        <SectionHeader title={t('dashboard.your_stats')} style={styles.sectionGap} />
        <View style={styles.stats}>
          <Pressable
            onPress={() => navigation.navigate('MyRatings')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.stat, pressed && styles.pressed]}
          >
            <Star size={20} color={palette.accent} fill={palette.accent} />
            <Text variant="heading" color={palette.text} style={styles.tabular}>
              {/* Average of customer ratings; "—" until the first one */}
              {profile?.ratingCount ? `${profile.rating.toFixed(1)} (${profile.ratingCount})` : '—'}
            </Text>
            <Text variant="caption" color={palette.textMuted}>{t('dashboard.rating')}</Text>
          </Pressable>
          <View style={styles.stat}>
            <CircleCheck size={20} color={palette.success} />
            <Text variant="heading" color={palette.text} style={styles.tabular}>{profile?.totalDeliveries || 0}</Text>
            <Text variant="caption" color={palette.textMuted}>{t('dashboard.delivered_total')}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.huge },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.85 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  sectionTight: { marginTop: space.sm, marginBottom: 0 },
  sectionGap: { marginTop: space.md, marginBottom: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  availability: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radii.lg,
    borderWidth: 1.5,
  },
  availabilityOn: { borderColor: palette.success, backgroundColor: palette.successSoft },
  availabilityOff: { borderColor: palette.borderStrong, backgroundColor: palette.surface },
  availabilityIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  task: { gap: space.md, borderWidth: 1.5, borderColor: palette.primary },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radii.md,
  },
  stop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stopIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  stopPickup: { backgroundColor: palette.primarySoft },
  stopDrop: { backgroundColor: palette.accentSoft },
  cashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radii.md,
    backgroundColor: palette.primarySoft,
  },
  taskActions: { flexDirection: 'row', gap: space.sm },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: {
    flex: 1,
    gap: space.xs,
    padding: space.lg,
    borderRadius: radii.lg,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderStrong,
  },
});

export default DashboardScreen;
