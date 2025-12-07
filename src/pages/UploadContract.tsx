import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'

const CONTRACTS_BUCKET = 'contracts'

const sanitizeFileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.-]/g, '')

export default function UploadContract() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [statusTrail, setStatusTrail] = useState<string[]>([])

  const updateStatus = (status: string) => {
    setStatusTrail((prev) => [...prev, `${new Date().toLocaleTimeString()} — ${status}`])
  }

  const handleFileChange = (selected: File | null) => {
    setFile(selected)
    setStatusTrail([])
  }

  const handleUpload = async () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Log in to upload contracts.', variant: 'destructive' })
      return
    }

    if (!file) {
      toast({ title: 'Select a file', description: 'Pick a PDF or email export to continue.' })
      return
    }

    setIsUploading(true)
    setStatusTrail([])
    const timestamp = Date.now()
    const sanitized = sanitizeFileName(file.name || 'contract.pdf')
    const storagePath = `${user.id}/${timestamp}-${sanitized}`

    try {
      updateStatus('Uploading file to secure storage…')
      const { error: uploadError } = await supabase.storage.from(CONTRACTS_BUCKET).upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/pdf',
        metadata: { owner: user.id }
      })
      if (uploadError) throw uploadError

      updateStatus('Creating contract record…')
      const { data: contract, error: insertError } = await supabase
        .from('contracts')
        .insert({
          user_id: user.id,
          title: file.name.replace(/\.[^/.]+$/, ''),
          contract_file_url: storagePath,
          status: 'uploaded'
        })
        .select()
        .single()

      if (insertError || !contract) throw insertError ?? new Error('Unable to create contract')

      updateStatus('Parsing contract with AI…')
      const { error: parsingError } = await supabase.functions.invoke('contractParsing', {
        body: {
          storagePath,
          userId: user.id,
          contractId: contract.id,
          persist: true
        }
      })

      if (parsingError) {
        await supabase.from('contracts').update({ status: 'parsed_fallback' }).eq('id', contract.id).eq('user_id', user.id)
        throw parsingError
      }

      updateStatus('Finalizing contract…')
      await supabase
        .from('contracts')
        .update({ status: 'completed' })
        .eq('id', contract.id)
        .eq('user_id', user.id)

      toast({ title: 'Contract parsed', description: 'Review the extracted data now.' })
      navigate(`/contracts/${contract.id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error'
      console.error('[UploadContract]', message)
      toast({ title: 'Upload failed', description: message, variant: 'destructive' })
      updateStatus(`Error: ${message}`)
    } finally {
      setIsUploading(false)
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Upload a contract</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">Sign in to store and parse contracts with AI assistance.</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Upload contract</CardTitle>
          <p className="text-sm text-slate-500">Files are stored under {`contracts/${user.id}/…`} for RLS compliance.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf,.eml,.msg"
            className="hidden"
            onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            {file ? 'Choose another file' : 'Select file'}
          </Button>
          {file && <p className="text-sm text-slate-500">Selected: {file.name}</p>}
          <Button onClick={handleUpload} disabled={isUploading || !file} className="w-full md:w-auto">
            {isUploading ? 'Processing…' : 'Upload & Parse'}
          </Button>
        </CardContent>
      </Card>

      {statusTrail.length > 0 && (
        <Alert>
          <AlertDescription className="space-y-1 text-sm">
            {statusTrail.map((status) => (
              <p key={status}>{status}</p>
            ))}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
