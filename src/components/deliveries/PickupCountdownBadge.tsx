import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText as Text } from '@city-market/mobile-ui';
import { Clock } from 'lucide-react-native';
import { useSlaCountdown } from '../../hooks/useSlaCountdown';

// Time left to pick up before the delivery is taken away (pickup SLA).
export const PickupCountdownBadge = ({ deadline }: { deadline?: Date | string | null }) => {
  const { remainingSeconds, isExpired, isWarning, formattedTime } = useSlaCountdown(deadline);
  if (!deadline || isExpired || remainingSeconds === 0) return null;
  const color = isWarning ? '#dc2626' : '#FF9500';
  return (
    <View style={[styles.badge, { borderColor: color + '40', backgroundColor: color + '12' }]}>
      <Clock size={13} color={color} />
      <Text style={[styles.text, { color }]}>{formattedTime}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  text: { fontSize: 12, fontWeight: 'bold' },
});
