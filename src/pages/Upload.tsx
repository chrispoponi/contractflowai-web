import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase'
import type { TablesInsert } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

interface UploadFormState {
  title: string
  property_address: string
  client_name: string
  purchase_price: string
  closing_date: string
  notes: string
}

const initialState: UploadFormState = {
  title: '',
  property_address: '',
  client_name: '',
  purchase_price: '',
  closing_date: '',
  notes: ''
}

export default function Upload() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [form, setForm] = useState<UploadFormState>(initialState)
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (field: keyof UploadFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return

    if (!file) {
      toast({ title: 'Upload required', description: 'Attach the executed contract PDF.', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)

    try {
      const rawPath = `${user.id}/raw-${Date.now()}-${file.name}`
      const { error: uploadsError } = await supabase.storage.from('uploads').upload(rawPath, file, { upsert: true })
      if (uploadsError) throw uploadsError

      const storagePath = `${user.id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('contracts').upload(storagePath, file, {
        cacheControl: '3600',
        upsert: true
      })

      if (uploadError) {
        throw uploadError
      }

      const payload: TablesInsert<'contracts'> = {
        owner_id: user.id,
        title: form.title || file.name,
        property_address: form.property_address,
        client_name: form.client_name,
        status: 'pending',
        purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
        closing_date: form.closing_date || null,
        storage_path: storagePath,
        ai_summary: form.notes || null
      }

      const { data: newContract, error: insertError } = await supabase
        .from('contracts')
        .insert(payload)
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      await supabase.functions.invoke('contractParsing', {
        body: {
          contractId: newContract.id,
          storagePath,
          ownerId: user.id
        }
      })

      toast({ title: 'Contract uploaded', description: 'Parsing and AI summary queued.' })
      setForm(initialState)
      setFile(null)
      navigate(`/contracts/${newContract.id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast({ title: 'Upload failed', description: message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Upload a contract</CardTitle>
          <p className="text-sm text-slate-500">
            Files are stored in the Supabase `contracts` bucket and parsed by the `contractParsing` Edge Function.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={form.title} onChange={(event) => handleChange('title', event.target.value)} required />
              </div>
              <div>
                <Label htmlFor="client_name">Client name</Label>
                <Input id="client_name" value={form.client_name} onChange={(event) => handleChange('client_name', event.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="property_address">Property address</Label>
                <Input
                  id="property_address"
                  value={form.property_address}
                  onChange={(event) => handleChange('property_address', event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="closing_date">Target closing date</Label>
                <Input id="closing_date" type="date" value={form.closing_date} onChange={(event) => handleChange('closing_date', event.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="purchase_price">Purchase price (USD)</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  value={form.purchase_price}
                  onChange={(event) => handleChange('purchase_price', event.target.value)}
                  min={0}
                />
              </div>
              <div>
                <Label htmlFor="file">Contract PDF</Label>
                <Input
                  id="file"
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Internal notes</Label>
              <Textarea id="notes" value={form.notes} onChange={(event) => handleChange('notes', event.target.value)} rows={4} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                {isSubmitting ? 'Uploading…' : 'Upload and parse'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
