import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { appRouter } from './routes/appRouter'

export default function App() {
  return (
    <>
      <RouterProvider router={appRouter} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
        }}
      />
    </>
  )
}
