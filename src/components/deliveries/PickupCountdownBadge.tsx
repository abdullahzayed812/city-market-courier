import React from 'react';
import { Timer } from 'lucide-react-native';
import { StatusBadge } from '@city-market/mobile-ui';
import { useSlaCountdown } from '../../hooks/useSlaCountdown';

// Time left to pick up before the delivery is taken away (pickup SLA).
export const PickupCountdownBadge = ({ deadline }: { deadline?: Date | string | null }) => {
  const { remainingSeconds, isExpired, isWarning, formattedTime } = useSlaCountdown(deadline);
  if (!deadline || isExpired || remainingSeconds === 0) return null;
  return <StatusBadge size="sm" tone={isWarning ? 'error' : 'warning'} icon={Timer} label={formattedTime} />;
};
