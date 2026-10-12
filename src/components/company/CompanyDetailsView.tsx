import React, { useState } from 'react'
import type { CompanyDetails } from '@/types/finance'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DEFAULT_COMPANY_LOGO } from '@/lib/defaultCompany'
import { uploadImage, ASSET_BUCKET } from '@/lib/storageUtils'
import { Building2, Save, RotateCcw, Upload, Loader2, Cloud } from 'lucide-react'
import { toast } from 'sonner'

interface CompanyDetailsViewProps {
  company: CompanyDetails
  onSave: (details: Partial<CompanyDetails>) => void
}

export const CompanyDetailsView: React.FC<CompanyDetailsViewProps> = ({ company, onSave }) => {
  const [form, setForm] = useState<CompanyDetails>({ ...company })
  const [isUploading, setIsUploading] = useState(false)

  const handleChange = (field: keyof CompanyDetails, val: string) => {
    setForm((prev) => ({ ...prev, [field]: val }))
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, SVG, WebP)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image file must be less than 5 MB')
      return
    }

    setIsUploading(true)
    try {
      const res = await uploadImage(file, 'logos')
      if (res.url) {
        setForm((prev) => ({ ...prev, logo: res.url }))
        toast.success('Logo uploaded to cloud storage!')
      } else if (res.error) {
        toast.error('Upload error: ' + res.error)
      }
    } catch (err: any) {
      toast.error('Upload failed: ' + (err.message || 'Unknown error'))
    } finally {
      setIsUploading(false)
    }
  }

  const handleRestoreLogo = () => {
    setForm((prev) => ({ ...prev, logo: DEFAULT_COMPANY_LOGO }))
    toast.info('Restored default company mark')
  }

  const handleSave = () => {
    onSave(form)
  }

  const isCloudUrl = form.logo && (form.logo.startsWith('http://') || form.logo.startsWith('https://'))

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold tracking-tight">Company Details</h2>
        <p className="text-xs text-muted-foreground">
          Configure business name, address, tax registration (GSTIN), and brand logo. Uploaded logos are saved to cloud storage bucket (<code className="font-mono text-primary">{ASSET_BUCKET}</code>) and synced across all devices.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Business Profile
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Logo Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Company Brand Logo
              </label>
              {isCloudUrl && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  <Cloud className="w-3 h-3" />
                  Cloud S3 Hosted
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-xl bg-muted/20">
              <div className="w-20 h-20 rounded-lg border bg-background flex items-center justify-center p-2 overflow-hidden shadow-xs relative">
                {isUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : form.logo ? (
                  <img src={form.logo} alt="Company logo preview" className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-xs text-muted-foreground">No logo</span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-input bg-background text-xs font-medium hover:bg-accent hover:text-accent-foreground shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  {isUploading ? 'Uploading...' : 'Upload to Cloud Storage'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploading}
                    onChange={handleLogoUpload}
                  />
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={handleRestoreLogo}
                  disabled={isUploading}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore Default Logo
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Images are stored in your project's S3-compatible Supabase Storage bucket with public CDN delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Company Name
              </label>
              <Input
                value={form.name}
                maxLength={100}
                placeholder="e.g. Syed Global Group PVT LTD"
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Address
              </label>
              <Input
                value={form.address}
                maxLength={160}
                placeholder="Registered business address..."
                onChange={(e) => handleChange('address', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <Input
                value={form.phone}
                maxLength={40}
                placeholder="+91 ..."
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <Input
                type="email"
                value={form.email}
                maxLength={100}
                placeholder="accounts@syedglobal.com"
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                GSTIN / Tax ID
              </label>
              <Input
                value={form.gstin}
                maxLength={40}
                placeholder="e.g. 33AAAAA0000A1Z5"
                onChange={(e) => handleChange('gstin', e.target.value)}
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end p-4 border-t bg-muted/10">
          <Button onClick={handleSave} className="gap-2" disabled={isUploading}>
            <Save className="w-4 h-4" />
            Save Details to Cloud
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
