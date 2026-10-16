import { useState } from 'react'
import { apiError } from '@/lib/apiError'
import { useQuery } from '@tanstack/react-query'
import { getAdminUsers, createAdminUser, updateAdminUser } from '@/api/admin'
import { useAuth } from '@/app/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from '@/lib/toast'
import { formatDateTime } from '@/lib/date'
import { Plus, Search, Edit2 } from 'lucide-react'
import type { User } from '@/api/types'

export function UsersAdminPage() {
  const { me } = useAuth()
  const [roleFilter, setRoleFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'gloma_admin' | 'shop_owner'>('shop_owner')
  const [password, setPassword] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', { roleFilter, search, page }],
    queryFn: () =>
      getAdminUsers({
        role: roleFilter || undefined,
        search: search || undefined,
        page,
      }),
  })

  const users = data?.data || []

  const openCreateDialog = () => {
    setEditingUser(null)
    setName('')
    setEmail('')
    setPhone('')
    setRole('shop_owner')
    setPassword('')
    setIsActive(true)
    setIsDialogOpen(true)
  }

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setName(user.name)
    setEmail(user.email)
    setPhone(user.phone || '')
    setRole(user.role.value as 'gloma_admin' | 'shop_owner')
    setPassword('')
    setIsActive(user.is_active)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return

    setIsSubmitting(true)
    try {
      if (editingUser) {
        await updateAdminUser(editingUser.id, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          is_active: isActive,
          password: password ? password : undefined,
        })
        toast.show('User updated successfully.', 'success')
      } else {
        if (!password) {
          toast.show('Password is required for new users.', 'warning')
          setIsSubmitting(false)
          return
        }
        await createAdminUser({
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.trim() || null,
          role,
        })
        toast.show('User created successfully.', 'success')
      }
      setIsDialogOpen(false)
      refetch()
    } catch (err) {
      toast.show(apiError(err).message || 'Failed to save user.', 'danger')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">User Accounts</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage Gloma administrators and partner shop owners
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={openCreateDialog}
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          Add User
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value)
            setPage(1)
          }}
          className="px-2.5 py-1.5 rounded-lg text-xs border border-gray-300 bg-white text-gray-700 focus:outline-none"
        >
          <option value="">All Roles</option>
          <option value="gloma_admin">Gloma Admins</option>
          <option value="shop_owner">Shop Owners</option>
        </select>
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Spinner size="lg" className="text-indigo-600" />
        </div>
      ) : users.length === 0 ? (
        <EmptyState title="No users found" description="Try adjusting your filters." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold">
              <tr>
                <th scope="col" className="px-4 py-3">User Name</th>
                <th scope="col" className="px-4 py-3">Role</th>
                <th scope="col" className="px-4 py-3">Assigned Shops</th>
                <th scope="col" className="px-4 py-3 text-center">Status</th>
                <th scope="col" className="px-4 py-3">Last Login</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-900">
                    <div className="font-semibold">{u.name}</div>
                    <div className="text-[11px] text-gray-400 font-mono">{u.email}</div>
                  </td>

                  <td className="px-4 py-3">
                    <Badge tone={u.role.value === 'gloma_admin' ? 'primary' : 'neutral'} size="sm">
                      {u.role.label}
                    </Badge>
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {u.shops && u.shops.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {u.shops.map((s) => (
                          <span
                            key={s.id}
                            className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-semibold text-gray-700"
                          >
                            {s.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">None</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <Badge tone={u.is_active ? 'success' : 'danger'} size="sm">
                      {u.is_active ? 'Active' : 'Deactivated'}
                    </Badge>
                  </td>

                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {formatDateTime(u.last_login_at)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(u)}
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* User Dialog */}
      {isDialogOpen && (
        <Dialog
          isOpen={true}
          onClose={() => setIsDialogOpen(false)}
          title={editingUser ? `Edit User: ${editingUser.name}` : 'Create New User'}
          description="Configure account details and password."
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="e.g. Priyantha Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Phone Number (Optional)"
              placeholder="0771234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            {!editingUser && (
              <Select
                label="System Role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'gloma_admin' | 'shop_owner')}
                required
              >
                <option value="shop_owner">Shop Owner</option>
                <option value="gloma_admin">Gloma Super Admin</option>
              </Select>
            )}

            <Input
              label={editingUser ? 'Reset Password (Leave blank to keep current)' : 'Password'}
              type="password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!editingUser}
            />

            {editingUser && editingUser.id !== me?.user.id && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Active user account</span>
                </label>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                Save User
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  )
}
