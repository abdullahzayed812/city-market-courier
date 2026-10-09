import React from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { AppText as Text } from '@city-market/mobile-ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAvailableJobs } from '../hooks/useAvailableJobs';
import { JobCard } from '../components/deliveries/JobCard';
import { theme } from '../theme';

// Freelance pool: deliveries no office took, near this courier. First to claim wins.
const JobsScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const { canWork, jobsQuery, jobs, claimMutation, emptyMessage } = useAvailableJobs(id =>
    navigation.navigate('DeliveryDetails', { deliveryId: id }),
  );

  if (jobsQuery.isLoading && canWork) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{t('jobs.title')}</Text>
      <FlatList
        data={jobs}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={jobsQuery.isRefetching} onRefresh={jobsQuery.refetch} />}
        ListEmptyComponent={<Text style={styles.empty}>{emptyMessage()}</Text>}
        renderItem={({ item }) => <JobCard job={item} claiming={claimMutation.isPending} onClaim={id => claimMutation.mutate(id)} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  list: { padding: 16, flexGrow: 1 },
  empty: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    marginTop: 48,
    paddingHorizontal: 24,
  },
});

export default JobsScreen;
