import * as React from 'react'
import { BrandPanel } from '@/components/auth/BrandPanel'
import { CompanyLinks } from '@/components/auth/CompanyLinks'

interface AuthLayoutProps {
  children: React.ReactNode
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full flex flex-col lg:grid lg:grid-cols-2 bg-background">
      {/* Left (Brand) Panel */}
      <BrandPanel />

      {/* Right (Form) Panel */}
      <div className="flex flex-col justify-between min-h-[calc(100vh-300px)] lg:min-h-screen bg-background p-6 sm:p-10 lg:p-12">
        {/* Top spacer to balance alignment */}
        <div className="hidden lg:block h-6" aria-hidden="true" />

        {/* Centered Form Area */}
        <main className="my-auto flex w-full flex-col items-center justify-center">
          {children}
        </main>

        {/* Pinned Company Links Footer */}
        <CompanyLinks />
      </div>
    </div>
  )
}
