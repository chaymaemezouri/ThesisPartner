import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { LocaleProvider } from './i18n/LocaleContext';
import { AppRoutes } from './routes/router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </LocaleProvider>
    </QueryClientProvider>
  );
}
