import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMoney, formatWeight } from '@city-market/mobile-ui';

/** Money and weight formatters bound to the current language's unit labels. */
export const useFormat = () => {
  const { t } = useTranslation();
  const currency = t('common.currency');
  const kg = t('common.kg');
  const money = useCallback((amount: number | string | null | undefined) => formatMoney(amount, currency), [currency]);
  const weight = useCallback((grams: number | null | undefined) => formatWeight(grams, kg), [kg]);
  return { money, weight, currency, kg };
};
