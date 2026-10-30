import { RouterProvider } from 'react-router-dom'
import { router } from '@/routes'
import { SessionProvider } from '@/context/SessionContext'
import { CompanyProvider } from '@/context/CompanyContext'

export default function App() {
  return (
    <SessionProvider>
      <CompanyProvider>
        <RouterProvider router={router} />
      </CompanyProvider>
    </SessionProvider>
  )
}
