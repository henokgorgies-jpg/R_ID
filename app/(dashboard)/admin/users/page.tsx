"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  Edit,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Shield,
  UserCog,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { PageShell, WorkspaceCard } from "@/components/layout/page-shell"
import { ROLE_LABELS, Role } from "@/lib/auth/permissions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type AdminUserRow = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: Role
  scopeType: "city" | "zone" | "woreda" | "kebele"
  scopeZoneId: string | null
  scopeWoredaId: string | null
  scopeKebeleId: string | null
  isActive: boolean
  lastLogin: string | null
}

type ZoneOption = {
  id: string
  name: string
}

function getRoleBadgeColor(role: Role) {
  switch (role) {
    case "super_admin":
      return "rounded-none border border-rose-300/80 bg-rose-50 text-rose-800"
    case "zone_admin":
      return "rounded-none border border-sky-300/80 bg-sky-50 text-sky-800"
    case "woreda_admin":
      return "rounded-none border border-indigo-300/80 bg-indigo-50 text-indigo-800"
    case "kebele_admin":
      return "rounded-none border border-emerald-300/80 bg-emerald-50 text-emerald-800"
    case "auditor":
      return "rounded-none border border-amber-300/80 bg-amber-50 text-amber-800"
    case "verification_officer":
      return "rounded-none border border-cyan-300/80 bg-cyan-50 text-cyan-800"
    default:
      return "rounded-none border border-zinc-300/80 bg-zinc-100 text-zinc-800"
  }
}

function initialsFromName(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2) || "NA"
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [zones, setZones] = useState<ZoneOption[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)
  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "kebele_admin" as Role,
    jurisdiction: "city",
  })
  const [editingUser, setEditingUser] = useState<{
    id: string
    firstName: string
    lastName: string
    role: Role
    jurisdiction: string
  } | null>(null)

  const loadUsers = async () => {
    const res = await fetch("/api/users", { cache: "no-store" })
    if (!res.ok) return
    const data = await res.json()
    setUsers(data.users ?? [])
  }

  const loadGeography = async () => {
    const res = await fetch("/api/geography", { cache: "no-store" })
    if (!res.ok) return
    const data = await res.json()
    setZones(data.zones ?? [])
  }

  useEffect(() => {
    void loadUsers()
    void loadGeography()
  }, [])

  const getFullName = (user: AdminUserRow) =>
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Unnamed User"
  const getEmail = (user: AdminUserRow) => user.email ?? ""
  const getUsername = (user: AdminUserRow) => {
    const email = getEmail(user)
    return email.includes("@") ? email.split("@")[0] : "n/a"
  }
  const getJurisdiction = (user: AdminUserRow) =>
    user.scopeType === "city"
      ? "City-wide"
      : user.scopeKebeleId ?? user.scopeWoredaId ?? user.scopeZoneId ?? "N/A"

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const fullName = getFullName(user).toLowerCase()
      const username = getUsername(user).toLowerCase()
      const email = getEmail(user).toLowerCase()
      const query = searchQuery.toLowerCase()

      const matchesSearch =
        fullName.includes(query) ||
        email.includes(query) ||
        username.includes(query)

      const matchesRole = roleFilter === "all" || user.role === roleFilter
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && user.isActive) ||
        (statusFilter === "inactive" && !user.isActive)

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchQuery, roleFilter, statusFilter])

  const roleDistribution = useMemo(
    () =>
      Object.entries(ROLE_LABELS)
        .map(([role, label]) => ({
          role: role as Role,
          label,
          count: users.filter((user) => user.role === role).length,
        }))
        .filter((item) => item.count > 0),
    [users],
  )

  const activeUsers = users.filter((user) => user.isActive).length
  const inactiveUsers = users.length - activeUsers
  const adminUsers = users.filter((user) => user.role.includes("admin")).length
  const cityWideUsers = users.filter((user) => user.scopeType === "city").length

  const handleDeactivateUser = async (userId: string, isActive: boolean) => {
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    })
    if (!res.ok) {
      toast.error("Failed to update user status")
      return
    }
    toast.success(`User ${isActive ? "deactivated" : "activated"} successfully`)
    await loadUsers()
  }

  const handleResetPassword = async (userId: string) => {
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetPassword: true }),
    })
    if (!res.ok) {
      toast.error("Failed to reset password")
      return
    }
    const data = await res.json()
    toast.success(`Temporary password: ${data.temporaryPassword}`)
  }

  const handleOpenEdit = (user: AdminUserRow) => {
    const jurisdiction =
      user.scopeType === "city"
        ? "city"
        : user.scopeKebeleId ?? user.scopeWoredaId ?? user.scopeZoneId ?? "city"

    setEditingUser({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      jurisdiction,
    })
    setIsEditDialogOpen(true)
  }

  const saveEditUser = async () => {
    if (!editingUser) return
    if (!editingUser.firstName || !editingUser.lastName) {
      toast.error("First name and last name are required")
      return
    }

    const scopePayload =
      editingUser.jurisdiction === "city"
        ? { scopeType: "city", scopeZoneId: null, scopeWoredaId: null, scopeKebeleId: null }
        : {
            scopeType: "zone",
            scopeZoneId: editingUser.jurisdiction,
            scopeWoredaId: null,
            scopeKebeleId: null,
          }

    setIsEditSubmitting(true)
    const res = await fetch(`/api/users/${editingUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        role: editingUser.role,
        ...scopePayload,
      }),
    })
    setIsEditSubmitting(false)

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      toast.error(payload.error || "Failed to update user")
      return
    }

    toast.success("User updated successfully")
    setIsEditDialogOpen(false)
    setEditingUser(null)
    await loadUsers()
  }

  const createUser = async () => {
    if (!newUser.firstName || !newUser.lastName || !newUser.email || !newUser.password) {
      toast.error("First name, last name, email, and password are required")
      return
    }

    const scopePayload =
      newUser.jurisdiction === "city"
        ? { scopeType: "city", scopeZoneId: null }
        : { scopeType: "zone", scopeZoneId: newUser.jurisdiction }

    setIsSubmitting(true)
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newUser.email,
        password: newUser.password,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        ...scopePayload,
      }),
    })
    setIsSubmitting(false)

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      toast.error(payload.error || "Failed to create user")
      return
    }

    const payload = await res.json()
    setIsAddDialogOpen(false)
    setNewUser({ firstName: "", lastName: "", email: "", password: "", role: "kebele_admin", jurisdiction: "city" })
    toast.success(
      payload.temporaryPassword
        ? `User created. Temporary password: ${payload.temporaryPassword}`
        : "User created successfully",
    )
    await loadUsers()
  }

  const addEditDialog = (mode: "add" | "edit") => {
    const isAdd = mode === "add"
    const isOpen = isAdd ? isAddDialogOpen : isEditDialogOpen
    const setOpen = isAdd ? setIsAddDialogOpen : setIsEditDialogOpen
    const title = isAdd ? "Add User" : "Edit User"
    const description = isAdd
      ? "Create an operator account with the right access scope."
      : "Update the operator profile, role, and scope."

    return (
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setOpen(open)
          if (!open && !isAdd) setEditingUser(null)
        }}
      >
        {isAdd && (
          <DialogTrigger asChild>
            <Button className="rounded-none">
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
        )}
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {isAdd || editingUser ? (
            <div className="grid gap-4 py-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`${mode}-firstName`}>First Name</Label>
                  <Input
                    id={`${mode}-firstName`}
                    className="rounded-none"
                    placeholder="Enter first name"
                    value={isAdd ? newUser.firstName : editingUser?.firstName ?? ""}
                    onChange={(event) =>
                      isAdd
                        ? setNewUser((prev) => ({ ...prev, firstName: event.target.value }))
                        : setEditingUser((prev) => (prev ? { ...prev, firstName: event.target.value } : prev))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${mode}-lastName`}>Last Name</Label>
                  <Input
                    id={`${mode}-lastName`}
                    className="rounded-none"
                    placeholder="Enter last name"
                    value={isAdd ? newUser.lastName : editingUser?.lastName ?? ""}
                    onChange={(event) =>
                      isAdd
                        ? setNewUser((prev) => ({ ...prev, lastName: event.target.value }))
                        : setEditingUser((prev) => (prev ? { ...prev, lastName: event.target.value } : prev))
                    }
                  />
                </div>
              </div>

              {isAdd && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="add-email">Email</Label>
                    <Input
                      id="add-email"
                      className="rounded-none"
                      type="email"
                      placeholder="user@example.gov.et"
                      value={newUser.email}
                      onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-password">Password</Label>
                    <Input
                      id="add-password"
                      className="rounded-none"
                      type="password"
                      placeholder="Set initial password"
                      value={newUser.password}
                      onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
                    />
                  </div>
                </>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{isAdd ? "Role" : "Role"}</Label>
                  <Select
                    value={isAdd ? newUser.role : editingUser?.role ?? "kebele_admin"}
                    onValueChange={(value) =>
                      isAdd
                        ? setNewUser((prev) => ({ ...prev, role: value as Role }))
                        : setEditingUser((prev) => (prev ? { ...prev, role: value as Role } : prev))
                    }
                  >
                    <SelectTrigger className="rounded-none">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([role, label]) => (
                        <SelectItem key={role} value={role}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Jurisdiction</Label>
                  <Select
                    value={isAdd ? newUser.jurisdiction : editingUser?.jurisdiction ?? "city"}
                    onValueChange={(value) =>
                      isAdd
                        ? setNewUser((prev) => ({ ...prev, jurisdiction: value }))
                        : setEditingUser((prev) => (prev ? { ...prev, jurisdiction: value } : prev))
                    }
                  >
                    <SelectTrigger className="rounded-none">
                      <SelectValue placeholder="Select jurisdiction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="city">Addis Ababa (City-wide)</SelectItem>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" className="rounded-none" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-none"
              onClick={() => void (isAdd ? createUser() : saveEditUser())}
              disabled={isAdd ? isSubmitting : isEditSubmitting}
            >
              {isAdd ? (isSubmitting ? "Creating..." : "Create User") : isEditSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <PageShell
      title="User Management"
      description="Operate user access, staffing coverage, and role distribution from one control surface."
      actions={addEditDialog("add")}
    >
      {addEditDialog("edit")}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
        <Card className="rounded-2xl border-border/70 bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--primary)/0.07)_100%)] shadow-[0_20px_60px_-40px_hsl(var(--foreground)/0.45)]">
          <CardContent className="flex flex-col gap-5 p-5 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <Badge variant="outline" className="rounded-none border-primary/30 bg-primary/5 text-primary">
                  Access Control
                </Badge>
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em]">Administrative coverage at a glance</h2>
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    Review active operators, identify inactive accounts, and maintain role balance across the registry.
                  </p>
                </div>
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  <span>{activeUsers} active accounts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-sky-700" />
                  <span>{adminUsers} admin roles assigned</span>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-none border border-border/70 bg-background/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Total Users</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em]">{users.length}</p>
              </div>
              <div className="rounded-none border border-emerald-300/70 bg-emerald-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">Active</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-emerald-900">{activeUsers}</p>
              </div>
              <div className="rounded-none border border-amber-300/70 bg-amber-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">Inactive</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-amber-900">{inactiveUsers}</p>
              </div>
              <div className="rounded-none border border-sky-300/70 bg-sky-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sky-700">City Scope</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-sky-900">{cityWideUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <WorkspaceCard title="Role Mix" description="Current staffing distribution by permission level">
          <div className="space-y-3">
            {roleDistribution.length === 0 ? (
              <div className="rounded-none border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No role assignments available yet.
              </div>
            ) : (
              roleDistribution.map((item) => (
                <div key={item.role} className="flex items-center justify-between gap-3 rounded-none border border-border/60 bg-background/70 px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-none border border-border/70 bg-muted/30">
                      <UserCog className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">Assigned operators</p>
                    </div>
                  </div>
                  <Badge className={getRoleBadgeColor(item.role)} variant="secondary">
                    {item.count}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </WorkspaceCard>
      </div>

      <WorkspaceCard
        title="Operator Directory"
        description="Search, filter, and manage accounts without leaving the table."
        toolbar={<Badge variant="outline" className="rounded-none">{filteredUsers.length} visible</Badge>}
      >
        <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or username"
              className="rounded-none pl-9"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="rounded-none">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {Object.entries(ROLE_LABELS).map(([role, label]) => (
                <SelectItem key={role} value={role}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="rounded-none">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto rounded-none border border-border/70">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead>User</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Jurisdiction</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                    No users match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const fullName = getFullName(user)
                  return (
                    <TableRow key={user.id} className={!user.isActive ? "bg-muted/10" : undefined}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 rounded-none border border-border/70">
                            <AvatarFallback className="rounded-none bg-primary/10 text-primary">
                              {initialsFromName(fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-0.5">
                            <p className="font-medium">{fullName}</p>
                            <p className="text-sm text-muted-foreground">{getEmail(user) || "No email"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1.5">
                          <Badge className={getRoleBadgeColor(user.role)} variant="secondary">
                            {ROLE_LABELS[user.role]}
                          </Badge>
                          <p className="font-mono text-xs text-muted-foreground">@{getUsername(user)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{getJurisdiction(user)}</p>
                          <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{user.scopeType}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.isActive ? (
                          <Badge variant="secondary" className="rounded-none border border-emerald-300/80 bg-emerald-50 text-emerald-800">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="rounded-none border border-zinc-300/80 bg-zinc-100 text-zinc-800">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-none">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-none">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleOpenEdit(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void handleResetPassword(user.id)}>
                              <Mail className="mr-2 h-4 w-4" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => void handleDeactivateUser(user.id, user.isActive)}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              {user.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </WorkspaceCard>
    </PageShell>
  )
}
