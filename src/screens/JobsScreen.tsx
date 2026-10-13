import React from 'react';
import { StyleSheet, FlatList, RefreshControl } from 'react-native';
import { EmptyState, LoadingState, ScreenHeader, palette, space } from '@city-market/mobile-ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { PackageSearch } from 'lucide-react-native';

import { useAvailableJobs } from '../hooks/useAvailableJobs';
import { JobCard } from '../components/deliveries/JobCard';

// Freelance pool: deliveries no office took, near this courier. First to claim wins.
const JobsScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { canWork, jobsQuery, jobs, claimMutation, emptyMessage } = useAvailableJobs(id =>
    navigation.navigate('DeliveryDetails', { deliveryId: id }),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={t('jobs.title')} />
      {jobsQuery.isLoading && canWork ? (
        <LoadingState />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={jobsQuery.isRefetching} onRefresh={jobsQuery.refetch} tintColor={palette.primary} colors={[palette.primary]} />
          }
          // The hook explains why the list is empty (offline, under review, API error…)
          ListEmptyComponent={
            <EmptyState
              icon={PackageSearch}
              title={emptyMessage()}
              actionLabel={canWork ? t('common.retry') : undefined}
              onAction={canWork ? () => jobsQuery.refetch() : undefined}
            />
          }
          renderItem={({ item }) => <JobCard job={item} claiming={claimMutation.isPending} onClaim={id => claimMutation.mutate(id)} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  list: { padding: space.lg, gap: space.md, flexGrow: 1 },
});

export default JobsScreen;
