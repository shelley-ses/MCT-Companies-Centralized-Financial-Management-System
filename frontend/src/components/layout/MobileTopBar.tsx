import * as React from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { AppSidebar } from '@/components/layout/AppSidebar'

import logo2Url from '@/assets/LOGO2.png'
import mct2Url from '@/assets/MCT2.png'

export const MobileTopBar: React.FC = () => {
  const [open, setOpen] = React.useState(false)

  return (
    <header className="lg:hidden flex items-center justify-between w-full h-16 px-4 bg-background border-b border-stroke/20 sticky top-0 z-40">
      {/* Mobile Menu Trigger & Sheet Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-focus"
            aria-label="Open navigation menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>

        <SheetContent side="left" className="p-0 w-72 sm:w-80">
          <AppSidebar onItemClick={() => setOpen(false)} className="w-full h-full border-r-0" />
        </SheetContent>
      </Sheet>

      {/* Brand Logo in Mobile Top Bar */}
      <div className="flex items-center gap-2.5 pr-2">
        <img
          src={logo2Url}
          alt="MCT Logo"
          className="h-8 w-auto object-contain shrink-0"
        />
        <div className="flex flex-col justify-center">
          <img
            src={mct2Url}
            alt="MCT"
            className="h-4.5 w-auto object-contain"
          />
          <span className="text-[9px] font-semibold text-muted-fg tracking-wider uppercase">
            Group of Companies
          </span>
        </div>
      </div>
    </header>
  )
}
