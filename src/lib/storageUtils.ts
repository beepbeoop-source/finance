import { getSupabase, isSupabaseConfigured } from './supabaseClient'

export const ASSET_BUCKET = 'finance-assets'

/**
 * Upload an image file to Supabase S3-compatible Storage bucket 'finance-assets'
 * and returns its permanent public CDN URL.
 * Falls back to local Data URL (base64) if offline or during configuration.
 */
export async function uploadImage(
  file: File,
  folder: string = 'logos'
): Promise<{ url: string; error?: string }> {
  const client = getSupabase()

  // 1. Fallback to base64 reader if Supabase is not connected
  if (!client || !isSupabaseConfigured()) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve({ url: reader.result as string })
      }
      reader.onerror = () => {
        resolve({ url: '', error: 'Failed to read image file locally.' })
      }
      reader.readAsDataURL(file)
    })
  }

  try {
    const fileExt = file.name.split('.').pop() || 'png'
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9]/g, '_')
    const fileName = `${folder}/${Date.now()}_${cleanFileName}.${fileExt}`

    // Upload to Supabase Storage Bucket
    const { data: uploadData, error: uploadErr } = await client.storage
      .from(ASSET_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadErr) {
      console.warn('Storage upload error, using local fallback:', uploadErr.message)
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve({ url: reader.result as string, error: uploadErr.message })
        reader.readAsDataURL(file)
      })
    }

    // Get public CDN URL
    const { data: publicUrlData } = client.storage
      .from(ASSET_BUCKET)
      .getPublicUrl(uploadData.path)

    return { url: publicUrlData.publicUrl }
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : 'Upload failed'
    console.error('Image upload exception:', msg)
    
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ url: reader.result as string, error: msg })
      reader.readAsDataURL(file)
    })
  }
}
