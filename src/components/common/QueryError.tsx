import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '@city-market/mobile-ui';

interface Props {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Translated error/offline state for a failed query, with retry. */
const QueryError = ({ error, onRetry, retrying, compact, style }: Props) => {
  const { t } = useTranslation();
  return (
    <ErrorState
      error={error}
      title={t('common.error_title')}
      message={t('common.error_message')}
      offlineTitle={t('common.offline_title')}
      offlineMessage={t('common.offline_message')}
      retryLabel={t('common.retry')}
      onRetry={onRetry}
      retrying={retrying}
      compact={compact}
      style={style}
    />
  );
};

export default QueryError;
