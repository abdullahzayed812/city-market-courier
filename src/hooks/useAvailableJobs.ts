import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { EventType } from '@city-market/shared';
import { DeliveryService } from '../services/api/deliveryService';
import { useSocket } from '../app/SocketContext';

// Freelance pool: deliveries no office took, near this courier (nearest first).
// Shared by the Jobs tab and the dashboard's "Available jobs" section.
export const useAvailableJobs = (onClaimed?: (deliveryId: string) => void) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const { data: profile } = useQuery({
    queryKey: ['courierProfile'],
    queryFn: () => DeliveryService.getProfile(),
  });
  const isFreelancer = profile?.courierType === 'FREELANCE';
  const canWork = isFreelancer && profile?.approvalStatus === 'APPROVED' && !!profile?.isAvailable;

  const jobsQuery = useQuery({
    queryKey: ['availableJobs'],
    queryFn: () => DeliveryService.getAvailableJobs(),
    enabled: canWork,
    // 4xx (freelancing disabled, location missing…) won't fix itself by retrying
    retry: (count, err: any) => (err?.response?.status ?? 500) >= 500 && count < 2,
    refetchInterval: query => ((query.state.error as any)?.response?.status < 500 ? false : 30_000),
  });

  useEffect(() => {
    if (!socket || !isFreelancer) return;
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['availableJobs'] });
    const events = [
      EventType.DELIVERY_OPEN_TO_FREELANCE,
      EventType.DELIVERY_CLAIMED,
      EventType.DELIVERY_ACCEPTED,
      EventType.DELIVERY_RETURNED_TO_POOL,
    ];
    events.forEach(e => socket.on(e, refresh));
    return () => events.forEach(e => socket.off(e, refresh));
  }, [socket, queryClient, isFreelancer]);

  const claimMutation = useMutation({
    mutationFn: (id: string) => DeliveryService.claimDelivery(id),
    onSuccess: (_data, id) => {
      Toast.show({ type: 'success', text1: t('jobs.claimed') });
      queryClient.invalidateQueries({ queryKey: ['availableJobs'] });
      queryClient.invalidateQueries({ queryKey: ['courierProfile'] });
      queryClient.invalidateQueries({ queryKey: ['myDeliveries'] });
      queryClient.invalidateQueries({ queryKey: ['activeDeliveries'] });
      onClaimed?.(id);
    },
    onError: (err: any) => {
      Toast.show({ type: 'error', text1: err?.response?.data?.message || t('common.error') });
      queryClient.invalidateQueries({ queryKey: ['availableJobs'] });
    },
  });

  // Why the list is empty / not shown
  const emptyMessage = (): string => {
    if (profile?.approvalStatus === 'PENDING_REVIEW') return t('jobs.pending_review');
    if (profile?.approvalStatus === 'SUSPENDED') return t('jobs.suspended');
    if (!profile?.isAvailable) return t('jobs.go_online');
    if (jobsQuery.error) return (jobsQuery.error as any)?.response?.data?.message || t('common.error');
    return t('jobs.empty');
  };

  return { profile, isFreelancer, canWork, jobsQuery, jobs: canWork ? jobsQuery.data ?? [] : [], claimMutation, emptyMessage };
};
