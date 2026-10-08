"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { 
  Settings, User, Bell, Shield, Database,
  Globe, Key, Save, RefreshCw, AlertTriangle, Mail, Phone, Clock3
} from "lucide-react"
import { toast } from "sonner"
import { PageShell } from "@/components/layout/page-shell"
import { OpsPageIntro } from "@/components/layout/ops-page-intro"

export default function SettingsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  // Profile settings
  const [profile, setProfile] = useState({
    fullName: user ? `${user.firstName} ${user.lastName}`.trim() : "",
    email: user?.email || "",
    phone: "+251-911-123456",
    language: "en",
    timezone: "Africa/Addis_Ababa"
  })

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    duplicateAlerts: true,
    transferRequests: true,
    systemUpdates: false,
    weeklyReports: true
  })

  // System settings (admin only)
  const [systemSettings, setSystemSettings] = useState({
    duplicateThreshold: 75,
    autoApproveTransfers: false,
    requireTwoFactorAuth: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    enableAuditLogs: true
  })
  const [paymentFees, setPaymentFees] = useState({
    initialIssueFeeEtb: 60,
    reissueFeeEtb: 100,
  })

  useEffect(() => {
    const loadPaymentFees = async () => {
      const res = await fetch("/api/settings/payment-fees", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json().catch(() => null)
      const initialIssueFeeEtb = Number(data?.fees?.initialIssueFeeEtb)
      const reissueFeeEtb = Number(data?.fees?.reissueFeeEtb)
      if (Number.isFinite(initialIssueFeeEtb) && Number.isFinite(reissueFeeEtb)) {
        setPaymentFees({
          initialIssueFeeEtb,
          reissueFeeEtb,
        })
      }
    }
    if (user) void loadPaymentFees()
  }, [user])

  const handleSaveProfile = async () => {
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLoading(false)
    toast.success("Profile settings saved successfully")
  }

  const handleSaveNotifications = async () => {
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLoading(false)
    toast.success("Notification preferences saved")
  }

  const handleSaveSystem = async () => {
    setLoading(true)
    const res = await fetch("/api/settings/payment-fees", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initialIssueFeeEtb: paymentFees.initialIssueFeeEtb,
        reissueFeeEtb: paymentFees.reissueFeeEtb,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      setLoading(false)
      toast.error(err?.error ?? "Failed to save payment fee settings")
      return
    }
    setLoading(false)
    toast.success("System settings updated")
  }

  const canAccessSystemSettings = user?.role === "super_admin" || user?.role === "zone_admin"
  const settingsTabTriggerClass =
    "flex items-center gap-2 rounded-md data-[state=active]:rounded-md data-[state=active]:border-slate-300/90 data-[state=active]:bg-slate-100 data-[state=active]:shadow-none"
  const fieldClassName = "rounded-none"
  const cardClassName = "rounded-none"
  const badgeClassName = "rounded-none"

  return (
    <PageShell
      title="Settings"
      description="Manage your account and system preferences"
      hideHeader
    >
      <OpsPageIntro
        eyebrow="System Configuration"
        title="Account, security, and platform controls"
        description="Configure user profile preferences, notification behavior, security safeguards, and administrative system policies from a single settings workspace."
        links={[
          { label: "Profile", href: "/settings", icon: User },
          { label: "Security", href: "/settings", icon: Shield },
          { label: "System", href: "/settings", icon: Settings },
        ]}
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-slate-300/80 bg-white/90 p-1.5 shadow-[0_10px_24px_-18px_hsl(var(--foreground)/0.45)]">
          <TabsTrigger value="profile" className={settingsTabTriggerClass}>
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className={settingsTabTriggerClass}>
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className={settingsTabTriggerClass}>
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          {canAccessSystemSettings && (
            <TabsTrigger value="system" className={settingsTabTriggerClass}>
              <Settings className="h-4 w-4" />
              System
            </TabsTrigger>
          )}
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="mt-0">
          <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
            <Card className={`h-fit border-slate-300/80 bg-white/85 ${cardClassName}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Profile Overview</CardTitle>
                <CardDescription>Your account identity and scope</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl border border-slate-300/80 bg-slate-50/80 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{profile.fullName || "Unnamed User"}</p>
                    <p className="truncate text-xs text-muted-foreground">{profile.email || "No email set"}</p>
                  </div>
                </div>
                <div className="space-y-2 rounded-xl border border-slate-300/70 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Current Role</p>
                  <Badge variant="secondary" className={`capitalize ${badgeClassName}`}>
                    {user?.role.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="space-y-2 rounded-xl border border-slate-300/70 bg-white p-3 text-sm text-slate-700">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-500" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-500" />
                    <span className="truncate">{profile.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-slate-500" />
                    <span className="truncate">{profile.timezone}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`border-slate-300/80 bg-white/90 ${cardClassName}`}>
              <CardHeader className="pb-4">
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="mx-auto w-full max-w-3xl space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        className={fieldClassName}
                        value={profile.fullName}
                        onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">This name appears on approvals and audit records.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        className={fieldClassName}
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">Used for notifications and account recovery.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        className={fieldClassName}
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <div className="flex h-10 items-center gap-2 rounded-none border border-input bg-muted/40 px-3">
                        <Badge variant="secondary" className={`capitalize ${badgeClassName}`}>
                          {user?.role.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select
                        value={profile.language}
                        onValueChange={(value) => setProfile({ ...profile, language: value })}
                      >
                        <SelectTrigger id="language" className={fieldClassName}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="am">Amharic</SelectItem>
                          <SelectItem value="or">Oromiffa</SelectItem>
                          <SelectItem value="ti">Tigrinya</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select
                        value={profile.timezone}
                        onValueChange={(value) => setProfile({ ...profile, timezone: value })}
                      >
                        <SelectTrigger id="timezone" className={fieldClassName}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Africa/Addis_Ababa">East Africa Time (EAT)</SelectItem>
                          <SelectItem value="UTC">UTC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end border-t border-slate-200/80 pt-4">
                    <Button onClick={handleSaveProfile} disabled={loading} className="min-w-36 rounded-none">
                      {loading ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="mt-0">
          <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
            <Card className={`h-fit border-slate-300/80 bg-white/85 ${cardClassName}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Delivery Summary</CardTitle>
                <CardDescription>How and when updates reach you</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-none border border-slate-300/70 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Channels</p>
                  <p className="mt-1 text-sm text-slate-800">Email alerts and in-app operational notices</p>
                </div>
                <div className="rounded-none border border-slate-300/70 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Enabled Rules</p>
                  <p className="mt-1 text-sm text-slate-800">
                    {Object.values(notifications).filter(Boolean).length} of {Object.values(notifications).length} active
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className={`border-slate-300/80 bg-white/90 ${cardClassName}`}>
              <CardHeader className="pb-4">
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose what notifications you want to receive</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mx-auto w-full max-w-3xl space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3 rounded-none border border-slate-300/70 bg-white p-3.5">
                      <div className="space-y-0.5">
                        <Label>Email Alerts</Label>
                        <p className="text-sm text-muted-foreground">Receive important alerts via email</p>
                      </div>
                      <Switch
                        checked={notifications.emailAlerts}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, emailAlerts: checked })
                        }
                      />
                    </div>
                    <div className="flex items-start justify-between gap-3 rounded-none border border-slate-300/70 bg-white p-3.5">
                      <div className="space-y-0.5">
                        <Label>Duplicate Detection Alerts</Label>
                        <p className="text-sm text-muted-foreground">Get notified when potential duplicates are found</p>
                      </div>
                      <Switch
                        checked={notifications.duplicateAlerts}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, duplicateAlerts: checked })
                        }
                      />
                    </div>
                    <div className="flex items-start justify-between gap-3 rounded-none border border-slate-300/70 bg-white p-3.5">
                      <div className="space-y-0.5">
                        <Label>Transfer Requests</Label>
                        <p className="text-sm text-muted-foreground">Notifications for incoming transfer requests</p>
                      </div>
                      <Switch
                        checked={notifications.transferRequests}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, transferRequests: checked })
                        }
                      />
                    </div>
                    <div className="flex items-start justify-between gap-3 rounded-none border border-slate-300/70 bg-white p-3.5">
                      <div className="space-y-0.5">
                        <Label>System Updates</Label>
                        <p className="text-sm text-muted-foreground">Get notified about system maintenance and updates</p>
                      </div>
                      <Switch
                        checked={notifications.systemUpdates}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, systemUpdates: checked })
                        }
                      />
                    </div>
                    <div className="flex items-start justify-between gap-3 rounded-none border border-slate-300/70 bg-white p-3.5">
                      <div className="space-y-0.5">
                        <Label>Weekly Reports</Label>
                        <p className="text-sm text-muted-foreground">Receive weekly summary reports via email</p>
                      </div>
                      <Switch
                        checked={notifications.weeklyReports}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, weeklyReports: checked })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end border-t border-slate-200/80 pt-4">
                    <Button onClick={handleSaveNotifications} disabled={loading} className="min-w-36 rounded-none">
                      {loading ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Preferences
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="mt-0">
          <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
            <Card className={`h-fit border-slate-300/80 bg-white/85 ${cardClassName}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Security Posture</CardTitle>
                <CardDescription>Monitor account safety controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-slate-300/70 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Password</p>
                  <p className="mt-1 text-sm text-slate-800">Last updated recently</p>
                </div>
                <div className="rounded-xl border border-slate-300/70 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Two-Factor</p>
                  <p className="mt-1 text-sm text-slate-800">Optional for this account</p>
                </div>
                <div className="rounded-xl border border-slate-300/70 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Sessions</p>
                  <p className="mt-1 text-sm text-slate-800">1 active trusted device</p>
                </div>
              </CardContent>
            </Card>

            <div className="mx-auto w-full max-w-4xl space-y-4">
              <Card className={`border-slate-300/80 bg-white/90 ${cardClassName}`}>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your password to keep your account secure</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input id="currentPassword" type="password" className={fieldClassName} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input id="newPassword" type="password" className={fieldClassName} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input id="confirmPassword" type="password" className={fieldClassName} />
                    </div>
                  </div>
                  <div className="flex justify-end border-t border-slate-200/80 pt-4">
                    <Button className="rounded-none">
                      <Key className="mr-2 h-4 w-4" />
                      Update Password
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className={`border-slate-300/80 bg-white/90 ${cardClassName}`}>
                <CardHeader>
                  <CardTitle>Two-Factor Authentication</CardTitle>
                  <CardDescription>Add an extra layer of security to your account</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between rounded-none border border-slate-300/70 bg-white p-3.5">
                    <div className="space-y-0.5">
                      <Label>Enable 2FA</Label>
                      <p className="text-sm text-muted-foreground">Require a verification code when logging in</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>

              <Card className={`border-slate-300/80 bg-white/90 ${cardClassName}`}>
                <CardHeader>
                  <CardTitle>Active Sessions</CardTitle>
                  <CardDescription>Manage devices where you are currently logged in</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-none border border-slate-300/70 bg-white p-4">
                    <div className="flex items-center gap-4">
                      <div className="rounded-none bg-green-100 p-2">
                        <Globe className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Current Session</p>
                        <p className="text-sm text-muted-foreground">Addis Ababa, Ethiopia - Chrome on Windows</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className={`bg-green-100 text-green-800 ${badgeClassName}`}>Active</Badge>
                  </div>
                  <div className="flex justify-end border-t border-slate-200/80 pt-4">
                    <Button variant="outline" className="rounded-none">Sign Out All Other Sessions</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* System Settings (Admin Only) */}
        {canAccessSystemSettings && (
          <TabsContent value="system" className="mt-0">
            <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
              <Card className={`h-fit border-slate-300/80 bg-white/85 ${cardClassName}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">System Scope</CardTitle>
                  <CardDescription>Policies that affect all operators</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-none border border-slate-300/70 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Duplicate Threshold</p>
                    <p className="mt-1 text-sm text-slate-800">{systemSettings.duplicateThreshold}% match confidence</p>
                  </div>
                  <div className="rounded-none border border-slate-300/70 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Session Timeout</p>
                    <p className="mt-1 text-sm text-slate-800">{systemSettings.sessionTimeout} minutes</p>
                  </div>
                  <div className="rounded-none border border-slate-300/70 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Audit Logging</p>
                    <p className="mt-1 text-sm text-slate-800">{systemSettings.enableAuditLogs ? "Enabled" : "Disabled"}</p>
                  </div>
                  <div className="rounded-none border border-slate-300/70 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">ID Generation Fee</p>
                    <p className="mt-1 text-sm text-slate-800">{paymentFees.initialIssueFeeEtb} ETB</p>
                  </div>
                  <div className="rounded-none border border-slate-300/70 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">ID Reissue Fee</p>
                    <p className="mt-1 text-sm text-slate-800">{paymentFees.reissueFeeEtb} ETB</p>
                  </div>
                </CardContent>
              </Card>

              <div className="mx-auto w-full max-w-4xl space-y-4">
                <Card className={`border-slate-300/80 bg-white/90 ${cardClassName}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Payment Fees
                    </CardTitle>
                    <CardDescription>Set ID issuance and reissue amounts charged through EthioPay</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="initialIssueFeeEtb">Initial ID Fee (ETB)</Label>
                        <Input
                          id="initialIssueFeeEtb"
                          type="number"
                          min={1}
                          className={fieldClassName}
                          value={paymentFees.initialIssueFeeEtb}
                          onChange={(e) => setPaymentFees({ ...paymentFees, initialIssueFeeEtb: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reissueFeeEtb">Reissue Fee (ETB)</Label>
                        <Input
                          id="reissueFeeEtb"
                          type="number"
                          min={1}
                          className={fieldClassName}
                          value={paymentFees.reissueFeeEtb}
                          onChange={(e) => setPaymentFees({ ...paymentFees, reissueFeeEtb: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`border-slate-300/80 bg-white/90 ${cardClassName}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Duplicate Detection
                    </CardTitle>
                    <CardDescription>Configure duplicate detection thresholds and behavior</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="matchThreshold">Match Threshold (%)</Label>
                      <div className="grid items-center gap-3 md:grid-cols-[120px_minmax(0,1fr)]">
                        <Input
                          id="matchThreshold"
                          type="number"
                          min={50}
                          max={100}
                          className={fieldClassName}
                          value={systemSettings.duplicateThreshold}
                          onChange={(e) =>
                            setSystemSettings({
                              ...systemSettings,
                              duplicateThreshold: parseInt(e.target.value),
                            })
                          }
                        />
                        <p className="text-sm text-muted-foreground">
                          Records above this similarity score are flagged as potential duplicates.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`border-slate-300/80 bg-white/90 ${cardClassName}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Security Settings
                    </CardTitle>
                    <CardDescription>Configure system-wide security policies</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start justify-between gap-3 rounded-none border border-slate-300/70 bg-white p-3.5">
                      <div className="space-y-0.5">
                        <Label>Require Two-Factor Authentication</Label>
                        <p className="text-sm text-muted-foreground">Require all users to enable 2FA</p>
                      </div>
                      <Switch
                        checked={systemSettings.requireTwoFactorAuth}
                        onCheckedChange={(checked) =>
                          setSystemSettings({ ...systemSettings, requireTwoFactorAuth: checked })
                        }
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                        <Input
                          id="sessionTimeout"
                          type="number"
                          min={5}
                          max={120}
                          className={fieldClassName}
                          value={systemSettings.sessionTimeout}
                          onChange={(e) =>
                            setSystemSettings({
                              ...systemSettings,
                              sessionTimeout: parseInt(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                        <Input
                          id="maxLoginAttempts"
                          type="number"
                          min={3}
                          max={10}
                          className={fieldClassName}
                          value={systemSettings.maxLoginAttempts}
                          onChange={(e) =>
                            setSystemSettings({
                              ...systemSettings,
                              maxLoginAttempts: parseInt(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex items-start justify-between gap-3 rounded-none border border-slate-300/70 bg-white p-3.5">
                      <div className="space-y-0.5">
                        <Label>Enable Audit Logging</Label>
                        <p className="text-sm text-muted-foreground">Track all system activities for compliance</p>
                      </div>
                      <Switch
                        checked={systemSettings.enableAuditLogs}
                        onCheckedChange={(checked) =>
                          setSystemSettings({ ...systemSettings, enableAuditLogs: checked })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className={`border-slate-300/80 bg-white/90 ${cardClassName}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <RefreshCw className="h-5 w-5" />
                      Transfer Settings
                    </CardTitle>
                    <CardDescription>Configure resident transfer policies</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start justify-between gap-3 rounded-none border border-slate-300/70 bg-white p-3.5">
                      <div className="space-y-0.5">
                        <Label>Auto-Approve Transfers</Label>
                        <p className="text-sm text-muted-foreground">Automatically approve transfer requests between kebeles</p>
                      </div>
                      <Switch
                        checked={systemSettings.autoApproveTransfers}
                        onCheckedChange={(checked) =>
                          setSystemSettings({ ...systemSettings, autoApproveTransfers: checked })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className={`border-amber-300/80 bg-amber-50/95 ${cardClassName}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-800">
                      <AlertTriangle className="h-5 w-5" />
                      Danger Zone
                    </CardTitle>
                    <CardDescription className="text-amber-700">
                      Irreversible actions that affect the entire system
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-3 rounded-none border border-amber-300/80 bg-white/70 p-3.5">
                      <div>
                        <p className="font-medium">Reset Duplicate Flags</p>
                        <p className="text-sm text-muted-foreground">Clear all pending duplicate flags and start fresh</p>
                      </div>
                      <Button variant="outline" className="rounded-none border-amber-300 text-amber-700">
                        Reset Flags
                      </Button>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-none border border-amber-300/80 bg-white/70 p-3.5">
                      <div>
                        <p className="font-medium">Export All Data</p>
                        <p className="text-sm text-muted-foreground">Download a complete backup of all registry data</p>
                      </div>
                      <Button variant="outline" className="rounded-none">
                        Export Data
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end border-t border-slate-200/80 pt-4">
                  <Button onClick={handleSaveSystem} disabled={loading} className="min-w-44 rounded-none">
                    {loading ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save System Settings
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </PageShell>
  )
}
