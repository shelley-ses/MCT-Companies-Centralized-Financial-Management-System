import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  Mail,
  Phone,
  User,
  MapPin,
  Lock,
  Bell,
  Camera,
  Trash2,
  CheckCircle2,
  ChevronDown,
  RotateCcw,
  Save,
  Check,
  Wallet,
  Coins,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useSession } from '@/hooks/useSession'
import { employeeService, type Company } from '@/services/employeeService'
import { formatPHP } from '@/lib/format'
import { cn } from '@/lib/utils'
import logo2Url from '@/assets/LOGO2.png'

interface NotificationSettings {
  transactionAlerts: boolean
  loanReminders: boolean
  dailySummary: boolean
  auditAlerts: boolean
}

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useSession()
  const isAuditor = user?.role === 'Supervisor'
  const isRestrictedRole = user?.role === 'Admin' || user?.role === 'Finance' || user?.role === 'Audit'
  const assignedCompany = user?.assignedCompany || 'MCT Kitchen'

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/dashboard')
    }
  }

  // Company data states
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string>('')
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [successBanner, setSuccessBanner] = React.useState<string | null>(null)
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = React.useState(false)
  const companyDropdownRef = React.useRef<HTMLDivElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Form Fields
  const [companyName, setCompanyName] = React.useState('')
  const [contactPerson, setContactPerson] = React.useState('')
  const [telephoneNumber, setTelephoneNumber] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [address, setAddress] = React.useState('')
  const [startingBalance, setStartingBalance] = React.useState<number>(0)
  const [currentBalance, setCurrentBalance] = React.useState<number>(0)
  const [logoUrl, setLogoUrl] = React.useState<string>(logo2Url)
  const [logoFile, setLogoFile] = React.useState<File | null>(null)

  // Toggle Switches: Notifications
  const [notificationSettings, setNotificationSettings] =
    React.useState<NotificationSettings>({
      transactionAlerts: true,
      loanReminders: true,
      dailySummary: false,
      auditAlerts: true,
    })

  // Load companies from employeeService
  const loadCompanies = React.useCallback(async () => {
    try {
      setLoading(true)
      const list = await employeeService.getCompanies()
      setCompanies(list)

      // Determine initial company
      let target: Company | undefined
      if (isAuditor) {
        target = list.find(
          (c) => c.name.toLowerCase() === assignedCompany.toLowerCase()
        )
      }
      if (!target && list.length > 0) {
        target = list[0]
      }

      if (target) {
        populateCompanyData(target)
      }
    } finally {
      setLoading(false)
    }
  }, [isAuditor, assignedCompany])

  React.useEffect(() => {
    loadCompanies()
  }, [loadCompanies])

  // Populate state with target company
  const populateCompanyData = (target: Company) => {
    setSelectedCompanyId(target.id)
    setCompanyName(target.name)
    setContactPerson(target.contactPerson || '')
    setTelephoneNumber(target.telephoneNumber || target.contactNumber || '')
    setEmail(target.email || '')
    setAddress(target.address)
    setStartingBalance(target.startingBalance)
    setCurrentBalance(target.currentBalance || 0)
    setLogoUrl(target.logoUrl || logo2Url)
  }

  // Switch company (Admin only)
  const handleSelectCompany = (comp: Company) => {
    populateCompanyData(comp)
    setIsCompanyDropdownOpen(false)
  }

  // Handle outside click for company dropdown
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        companyDropdownRef.current &&
        !companyDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCompanyDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-dismiss success banner
  React.useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => setSuccessBanner(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [successBanner])

  // Profile image upload handler
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit. Please upload a smaller image.')
      return
    }

    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        setLogoUrl(e.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  }

  // Reset image to default
  const handleRemoveImage = () => {
    setLogoUrl(logo2Url)
    setLogoFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Save changes handler
  const handleSaveChanges = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!selectedCompanyId) return

    try {
      setSaving(true)
      const updated = await employeeService.updateCompany(selectedCompanyId, {
        name: companyName,
        contactPerson,
        telephoneNumber,
        contactNumber: telephoneNumber,
        email,
        address,
        logoUrl: logoFile ? undefined : logoUrl,
        logoFile: logoFile || undefined,
      })

      setLogoFile(null)
      if (updated.logoUrl) {
        setLogoUrl(updated.logoUrl)
      }

      // Update local company list copy
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === selectedCompanyId
            ? {
                ...c,
                name: updated.name || companyName,
                contactPerson,
                telephoneNumber,
                email,
                address,
                logoUrl: updated.logoUrl || logoUrl,
              }
            : c
        )
      )

      setSuccessBanner('Company profile and settings have been saved successfully.')
    } catch (err) {
      console.error('Failed to save settings:', err)
      alert('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Discard changes
  const handleDiscardChanges = () => {
    const original = companies.find((c) => c.id === selectedCompanyId)
    if (original) {
      populateCompanyData(original)
    }
  }

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId)

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* 1. Header Toolbar (Identical unified level matching other pages) */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 -ml-2 text-muted-fg hover:text-focus text-xs font-semibold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer mb-1.5"
            aria-label="Go back to previous page"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold text-focus tracking-tight">
            Settings
          </h1>
          <p className="text-sm sm:text-base text-muted-fg font-normal mt-1">
            Manage company profile and notification preferences.
          </p>
        </div>

        {/* Right Action Controls: Company Selector (Admin) & Save Changes */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto shrink-0">
          {/* Company Selector Dropdown (Admin only) */}
          {!isAuditor && companies.length > 0 && (
            <div ref={companyDropdownRef} className="relative inline-block">
              <button
                type="button"
                onClick={() => setIsCompanyDropdownOpen((prev) => !prev)}
                className={cn(
                  'inline-flex items-center gap-2 h-10 sm:h-11 px-4 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer select-none box-border',
                  isCompanyDropdownOpen && 'ring-2 ring-focus/20 border-focus'
                )}
                aria-label="Select company to configure"
              >
                <Building2 className="h-4 w-4 text-muted-fg shrink-0" />
                <span className="font-semibold text-focus/90 truncate max-w-[170px]">
                  {companyName || 'Select Company'}
                </span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 text-muted-fg shrink-0 transition-transform duration-200',
                    isCompanyDropdownOpen && 'transform rotate-180'
                  )}
                />
              </button>

              {isCompanyDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-stroke/30 shadow-2xl p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                  <div className="px-2.5 py-1.5 border-b border-stroke/20 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-fg">
                      Configuring Company
                    </span>
                  </div>
                  <div className="space-y-0.5 max-h-56 overflow-y-auto">
                    {companies.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCompany(c)}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer',
                          selectedCompanyId === c.id
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-focus/80 hover:bg-slate-50'
                        )}
                      >
                        <span className="truncate">{c.name}</span>
                        {selectedCompanyId === c.id && (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Assigned Company Badge (Auditor) */}
          {isAuditor && (
            <div className="inline-flex items-center gap-2 h-10 sm:h-11 px-4 rounded-full border border-stroke/60 bg-white text-focus text-xs sm:text-sm font-medium shadow-xs select-none">
              <Building2 className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-focus truncate max-w-[180px]">
                Assigned: {assignedCompany}
              </span>
            </div>
          )}

          {/* Discard Changes Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleDiscardChanges}
            disabled={saving || loading}
            className="h-10 sm:h-11 px-4 rounded-full border border-stroke/60 bg-white text-focus hover:bg-surface font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer transition-all box-border"
          >
            <RotateCcw className="h-3.5 w-3.5 text-focus/70 shrink-0" />
            <span className="hidden sm:inline">Discard</span>
          </Button>

          {/* Save Changes Button */}
          <Button
            type="button"
            onClick={() => handleSaveChanges()}
            disabled={saving || loading}
            className="h-10 sm:h-11 px-5 rounded-full bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 transition-all cursor-pointer box-border"
          >
            {saving ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4 shrink-0 text-white" />
                <span>Save Changes</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200 shadow-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* 2. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column (2 Cols): Company Profile & Financial Balance Form */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          {/* Card 1: Company Profile Picture & Basic Info */}
          <Card className="rounded-[24px] bg-white border border-stroke/30 p-5 sm:p-7 shadow-xs">
            {/* Section Header */}
            <div className="flex items-center justify-between pb-5 border-b border-stroke/20 mb-6">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-focus">
                  Company Profile
                </h2>
                <p className="text-xs sm:text-sm text-muted-fg mt-0.5">
                  General details and branding configuration for {companyName || 'your company'}.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                {selectedCompany?.status || 'Active'}
              </span>
            </div>

            <form onSubmit={handleSaveChanges} className="space-y-6">
              {/* Profile Picture Section */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                <div className="relative group shrink-0">
                  <div className="h-24 w-24 rounded-2xl border-2 border-stroke/40 bg-white overflow-hidden shadow-xs flex items-center justify-center p-2">
                    <img
                      src={logoUrl}
                      alt="Company Profile"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 text-white rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Change Profile Picture"
                  >
                    <Camera className="h-5 w-5 mb-0.5" />
                    <span className="text-[10px] font-semibold">Change</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>

                <div className="space-y-2 flex-1">
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-focus block">
                      Company Profile Picture
                    </label>
                    <p className="text-xs text-muted-fg mt-0.5">
                      Recommended square format: PNG, JPG, or WEBP (Max size: 5MB).
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-9 px-3.5 rounded-full text-xs font-semibold text-focus hover:bg-white border-stroke/60 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <Camera className="h-3.5 w-3.5 text-muted-fg" />
                      <span>Upload New Image</span>
                    </Button>
                    {logoUrl !== logo2Url && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveImage}
                        className="h-9 px-3 rounded-full text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Reset to Default</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Input Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {/* Company Name */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-focus flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-fg" />
                    <span>Company Name</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter company name"
                    required
                    className="h-11 rounded-xl border border-stroke/60 bg-white text-sm text-focus shadow-xs focus-visible:ring-2 focus-visible:ring-focus"
                  />
                </div>

                {/* Contact Person */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-focus flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-fg" />
                    <span>Contact Person</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Enter contact person"
                    required
                    className="h-11 rounded-xl border border-stroke/60 bg-white text-sm text-focus shadow-xs focus-visible:ring-2 focus-visible:ring-focus"
                  />
                </div>

                {/* Telephone Number */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-focus flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-fg" />
                    <span>Telephone Number</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="tel"
                    value={telephoneNumber}
                    onChange={(e) => setTelephoneNumber(e.target.value)}
                    placeholder="(02) 8000-0000 or +63 900 000 0000"
                    required
                    className="h-11 rounded-xl border border-stroke/60 bg-white text-sm text-focus shadow-xs focus-visible:ring-2 focus-visible:ring-focus"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-focus flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-fg" />
                    <span>Email Address</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="corporate@mctgroup.com"
                    required
                    className="h-11 rounded-xl border border-stroke/60 bg-white text-sm text-focus shadow-xs focus-visible:ring-2 focus-visible:ring-focus"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-focus flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-fg" />
                  <span>Business Address</span>
                  <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street address, building, district, city, zip"
                  required
                  className="h-11 rounded-xl border border-stroke/60 bg-white text-sm text-focus shadow-xs focus-visible:ring-2 focus-visible:ring-focus"
                />
              </div>
            </form>
          </Card>

          {/* Card 2: Balances (Hidden for Admin, Finance, Audit; View-Only for Company users) */}
          {!isRestrictedRole && (
            <Card className="rounded-[24px] bg-white border border-stroke/30 p-5 sm:p-7 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-stroke/20 mb-5">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-focus flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    <span>Financial Balances</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-fg mt-0.5">
                    Audited capital baseline and live working balances. These fields are strictly view-only.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <Lock className="h-3 w-3 text-amber-600" />
                  <span>View-Only</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {/* Starting Balance (view-only) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-fg uppercase tracking-wider flex items-center gap-1.5">
                      <Coins className="h-3.5 w-3.5 text-muted-fg" />
                      <span>Starting Balance</span>
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-200 text-slate-700">
                      Baseline
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-focus tabular-nums tracking-tight">
                    {formatPHP(startingBalance)}
                  </div>
                  <p className="text-2xs sm:text-xs text-muted-fg flex items-center gap-1 pt-1">
                    <Lock className="h-3 w-3 shrink-0 text-slate-400" />
                    <span>Initial enrolled capital established during company setup.</span>
                  </p>
                </div>

                {/* Current Balance (view-only) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Current Balance</span>
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800">
                      Live Balance
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-700 tabular-nums tracking-tight">
                    {formatPHP(currentBalance)}
                  </div>
                  <p className="text-2xs sm:text-xs text-emerald-700/80 flex items-center gap-1 pt-1">
                    <Lock className="h-3 w-3 shrink-0 text-emerald-600" />
                    <span>Calculated dynamically from real-time deposits, sales, and withdrawals.</span>
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right Column (1 Col): Notifications */}
        <div className="space-y-6 sm:space-y-8">
          {/* Card: Notification Preferences */}
          <Card className="rounded-[24px] bg-white border border-stroke/30 p-5 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-stroke/20">
              <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shrink-0">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-focus leading-tight">
                  Notification Alerts
                </h2>
                <p className="text-xs text-muted-fg mt-0.5">
                  Configure financial events and automated alerts.
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              {/* Transaction Outflow Alerts */}
              <div className="flex items-start justify-between gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="space-y-0.5">
                  <span className="text-xs sm:text-sm font-semibold text-focus block">
                    Large Transaction Alerts
                  </span>
                  <p className="text-2xs sm:text-xs text-muted-fg">
                    Notify immediately when single withdrawals or expenses exceed ₱50,000.
                  </p>
                </div>
                <Switch
                  id="notif-tx-toggle"
                  checked={notificationSettings.transactionAlerts}
                  onCheckedChange={(val) =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      transactionAlerts: val,
                    }))
                  }
                  aria-label="Toggle Large Transaction Alerts"
                />
              </div>

              {/* Loan Due Date Reminders */}
              <div className="flex items-start justify-between gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="space-y-0.5">
                  <span className="text-xs sm:text-sm font-semibold text-focus block">
                    Loan Due Date Reminders
                  </span>
                  <p className="text-2xs sm:text-xs text-muted-fg">
                    Receive advance alerts 3 days prior to loan maturity and repayment deadlines.
                  </p>
                </div>
                <Switch
                  id="notif-loan-toggle"
                  checked={notificationSettings.loanReminders}
                  onCheckedChange={(val) =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      loanReminders: val,
                    }))
                  }
                  aria-label="Toggle Loan Due Date Reminders"
                />
              </div>

              {/* Daily Financial Summary */}
              <div className="flex items-start justify-between gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="space-y-0.5">
                  <span className="text-xs sm:text-sm font-semibold text-focus block">
                    Daily Financial Digest
                  </span>
                  <p className="text-2xs sm:text-xs text-muted-fg">
                    Automated end-of-day summary email of daily sales, expenses, and net liquidity.
                  </p>
                </div>
                <Switch
                  id="notif-digest-toggle"
                  checked={notificationSettings.dailySummary}
                  onCheckedChange={(val) =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      dailySummary: val,
                    }))
                  }
                  aria-label="Toggle Daily Financial Digest"
                />
              </div>

              {/* Audit & Modification Alerts */}
              <div className="flex items-start justify-between gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="space-y-0.5">
                  <span className="text-xs sm:text-sm font-semibold text-focus block">
                    Audit Status Updates
                  </span>
                  <p className="text-2xs sm:text-xs text-muted-fg">
                    Alert whenever transactions are marked approved, pending review, or voided.
                  </p>
                </div>
                <Switch
                  id="notif-audit-toggle"
                  checked={notificationSettings.auditAlerts}
                  onCheckedChange={(val) =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      auditAlerts: val,
                    }))
                  }
                  aria-label="Toggle Audit Status Updates"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
