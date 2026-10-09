import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Exported so AuthContext can clear it when the signed-in user changes
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            refetchOnWindowFocus: false,
        },
    },
});

export const APIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};
