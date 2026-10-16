import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  getAdminShop,
  createAdminShop,
  updateAdminShop,
  addAdminShopOwner,
  removeAdminShopOwner,
  getAdminUsers,
} from '@/api/admin'
import { useAuth } from '@/app/authContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Dialog } from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/lib/toast'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'

export function ShopFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id && id !== 'new')
  const shopId = isEditing ? parseInt(id!, 10) : 0
  const navigate = useNavigate()
  const { refreshMe } = useAuth()

  // Shop basic fields
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [stockMode, setStockMode] = useState<'single' | 'by_location'>('single')
  const [contractRef, setContractRef] = useState('')
  const [contractStartedOn, setContractStartedOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  // New Shop Owner Fields
  const [ownerMode, setOwnerMode] = useState<'existing' | 'new'>('new')
  const [existingUserId, setExistingUserId] = useState<number>(0)
  const [newOwnerName, setNewOwnerName] = useState('')
  const [newOwnerEmail, setNewOwnerEmail] = useState('')
  const [newOwnerPassword, setNewOwnerPassword] = useState('')
  const [newOwnerPhone, setNewOwnerPhone] = useState('')

  // Add Owner Dialog (for existing shop)
  const [isAddOwnerOpen, setIsAddOwnerOpen] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch shop detail when editing
  const { data: shop, isLoading, refetch } = useQuery({
    queryKey: ['admin-shop-detail', shopId],
    queryFn: () => getAdminShop(shopId),
    enabled: isEditing && shopId > 0,
  })

  // Fetch existing shop owners for picker
  const { data: usersData } = useQuery({
    queryKey: ['admin-users-owners'],
    queryFn: () => getAdminUsers({ role: 'shop_owner', page: 1 }),
  })

  useEffect(() => {
    if (shop) {
      setName(shop.name)
      setCode(shop.code)
      setStockMode(shop.stock_mode.value as any)
      setContractRef(shop.contract_ref || '')
      setContractStartedOn(shop.contract_started_on || '')
      setPhone(shop.phone || '')
      setEmail(shop.email || '')
      setAddress(shop.address || '')
      setNotes(shop.notes || '')
    }
  }, [shop])

  const handleSaveShop = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    try {
      if (isEditing) {
        await updateAdminShop(shopId, {
          name: name.trim(),
          contract_ref: contractRef.trim() || null,
          contract_started_on: contractStartedOn || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          notes: notes.trim() || null,
        })
        toast.show('Shop details updated successfully.', 'success')
        await refreshMe()
        refetch()
      } else {
        if (!code.trim()) {
          toast.show('Shop unique code is required.', 'warning')
          setIsSubmitting(false)
          return
        }

        const ownerPayload =
          ownerMode === 'existing'
            ? { user_id: existingUserId }
            : {
                name: newOwnerName.trim(),
                email: newOwnerEmail.trim(),
                password: newOwnerPassword,
                phone: newOwnerPhone.trim() || undefined,
              }

        const created = await createAdminShop({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          stock_mode: stockMode,
          contract_ref: contractRef.trim() || null,
          contract_started_on: contractStartedOn || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          notes: notes.trim() || null,
          owner: ownerPayload,
        })

        toast.show(`Shop ${created.name} onboarded successfully!`, 'success')
        await refreshMe()
        navigate('/admin/shops')
      }
    } catch (err: any) {
      toast.show(err.response?.data?.message || 'Failed to save shop.', 'danger')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddOwner = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const ownerPayload =
        ownerMode === 'existing'
          ? { user_id: existingUserId }
          : {
              name: newOwnerName.trim(),
              email: newOwnerEmail.trim(),
              password: newOwnerPassword,
              phone: newOwnerPhone.trim() || undefined,
            }

      await addAdminShopOwner(shopId, ownerPayload)
      toast.show('Owner assigned to shop.', 'success')
      setIsAddOwnerOpen(false)
      refetch()
    } catch (err: any) {
      toast.show(err.response?.data?.message || 'Failed to assign owner.', 'danger')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveOwner = async (userId: number) => {
    if (!confirm('Remove this owner from this shop?')) return
    try {
      await removeAdminShopOwner(shopId, userId)
      toast.show('Owner removed from shop.', 'info')
      refetch()
    } catch (err: any) {
      toast.show(err.response?.data?.message || 'Failed to remove owner.', 'danger')
    }
  }

  if (isEditing && isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="lg" className="text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
        <button
          type="button"
          onClick={() => navigate('/admin/shops')}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            {isEditing ? `Edit Shop: ${shop?.name}` : 'Onboard New Partner Shop'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure business information, contract details, and owner credentials
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveShop} className="space-y-5">
        {/* Shop Information */}
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-2xs space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 pb-2 border-b border-gray-100">
            Shop Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Shop Name"
              placeholder="e.g. Trendy Apparel Galle"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />

            <Input
              label="Shop Unique Code"
              placeholder="e.g. TRG"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isEditing}
              helperText={isEditing ? 'Code cannot be changed after creation' : '2-12 letters/numbers'}
              required
            />

            {!isEditing && (
              <Select
                label="Stock Mode"
                value={stockMode}
                onChange={(e) => setStockMode(e.target.value as any)}
                required
              >
                <option value="single">Single (Shared Stock Pool)</option>
                <option value="by_location">By Location (Gloma vs Shop)</option>
              </Select>
            )}

            <Input
              label="Contract Reference #"
              placeholder="e.g. GLM-CTR-2026-001"
              value={contractRef}
              onChange={(e) => setContractRef(e.target.value)}
            />

            <Input
              label="Contract Start Date"
              type="date"
              value={contractStartedOn}
              onChange={(e) => setContractStartedOn(e.target.value)}
            />

            <Input
              label="Contact Phone"
              placeholder="0112345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <Input
              label="Contact Email"
              type="email"
              placeholder="shop@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="sm:col-span-2">
              <Input
                label="Physical Address"
                placeholder="Shop street address and city"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <Input
                label="Internal Admin Notes (Gloma Eyes Only)"
                placeholder="Commercial terms, profit split notes, or special agreements"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* First Owner Credentials (Only when creating a new shop) */}
        {!isEditing && (
          <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="pb-2 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Primary Shop Owner</h2>
                <span className="text-xs text-gray-500">Assign an existing owner or create a new login</span>
              </div>

              <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 text-xs">
                <button
                  type="button"
                  onClick={() => setOwnerMode('new')}
                  className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                    ownerMode === 'new' ? 'bg-white shadow-2xs text-gray-900 font-semibold' : 'text-gray-500'
                  }`}
                >
                  New Owner
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerMode('existing')}
                  className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                    ownerMode === 'existing' ? 'bg-white shadow-2xs text-gray-900 font-semibold' : 'text-gray-500'
                  }`}
                >
                  Existing User
                </button>
              </div>
            </div>

            {ownerMode === 'new' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Owner Full Name"
                  placeholder="e.g. Sunil Perera"
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  required
                />

                <Input
                  label="Owner Email Address"
                  type="email"
                  placeholder="owner@example.com"
                  value={newOwnerEmail}
                  onChange={(e) => setNewOwnerEmail(e.target.value)}
                  required
                />

                <Input
                  label="Temporary Password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={newOwnerPassword}
                  onChange={(e) => setNewOwnerPassword(e.target.value)}
                  required
                />

                <Input
                  label="Owner Mobile Phone"
                  placeholder="0771234567"
                  value={newOwnerPhone}
                  onChange={(e) => setNewOwnerPhone(e.target.value)}
                />
              </div>
            ) : (
              <Select
                label="Select Existing Shop Owner"
                value={existingUserId}
                onChange={(e) => setExistingUserId(Number(e.target.value))}
                required
              >
                <option value={0}>Choose a user...</option>
                {usersData?.data.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </Select>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="md" onClick={() => navigate('/admin/shops')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={isSubmitting} icon={<Save className="w-4 h-4" />}>
            {isEditing ? 'Save Shop Details' : 'Onboard Shop'}
          </Button>
        </div>
      </form>

      {/* Owners Management Section (When Editing) */}
      {isEditing && shop && (
        <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Shop Owners</h2>
              <span className="text-xs text-gray-500">Users authorized to sign in to this shop</span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setOwnerMode('existing')
                setIsAddOwnerOpen(true)
              }}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Owner
            </Button>
          </div>

          <div className="divide-y divide-gray-100">
            {shop.owners?.map((owner) => (
              <div key={owner.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-gray-900 text-sm block">{owner.name}</span>
                  <span className="text-gray-500 font-mono">{owner.email}</span>
                </div>

                {shop.owners && shop.owners.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveOwner(owner.id)}
                    className="text-red-600 hover:bg-red-50"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Owner Modal */}
      {isAddOwnerOpen && (
        <Dialog
          isOpen={true}
          onClose={() => setIsAddOwnerOpen(false)}
          title="Add Owner to Shop"
          description="Grant an existing user or create a new user account with shop ownership access."
        >
          <form onSubmit={handleAddOwner} className="space-y-4">
            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 text-xs mb-3">
              <button
                type="button"
                onClick={() => setOwnerMode('existing')}
                className={`flex-1 py-1 rounded font-medium transition-colors cursor-pointer ${
                  ownerMode === 'existing' ? 'bg-white shadow-2xs text-gray-900 font-semibold' : 'text-gray-500'
                }`}
              >
                Existing User
              </button>
              <button
                type="button"
                onClick={() => setOwnerMode('new')}
                className={`flex-1 py-1 rounded font-medium transition-colors cursor-pointer ${
                  ownerMode === 'new' ? 'bg-white shadow-2xs text-gray-900 font-semibold' : 'text-gray-500'
                }`}
              >
                New User
              </button>
            </div>

            {ownerMode === 'existing' ? (
              <Select
                label="Select User"
                value={existingUserId}
                onChange={(e) => setExistingUserId(Number(e.target.value))}
                required
              >
                <option value={0}>Choose a user...</option>
                {usersData?.data.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </Select>
            ) : (
              <div className="space-y-3">
                <Input
                  label="Full Name"
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={newOwnerEmail}
                  onChange={(e) => setNewOwnerEmail(e.target.value)}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  value={newOwnerPassword}
                  onChange={(e) => setNewOwnerPassword(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOwnerOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                Add Owner
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  )
}
