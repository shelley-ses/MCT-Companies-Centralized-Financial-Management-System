import { RouterProvider } from 'react-router-dom'
import { router } from '@/routes'
import { SessionProvider } from '@/context/SessionContext'

export default function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  )
}
