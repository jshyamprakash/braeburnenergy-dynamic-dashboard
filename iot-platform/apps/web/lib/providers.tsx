'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as ReduxProvider } from 'react-redux';
import { useState, type ReactNode } from 'react';
import { store } from './store';
import { WebSocketProvider } from './providers/WebSocketProvider';
import { RootInitializer } from '@/components/RootInitializer';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider>
          <RootInitializer />
          {children}
        </WebSocketProvider>
      </QueryClientProvider>
    </ReduxProvider>
  );
}
