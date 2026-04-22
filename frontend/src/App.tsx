import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { appRouter } from './routes/appRouter'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

export default function App() {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={appRouter} />
      </QueryClientProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
        }}
      />
    </>
  )
}
