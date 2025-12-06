import { useRef, useState } from 'react'
import { UploadCloud, CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase/client'

interface UploadCounterOfferModalProps {
  contractId: string
  counterOfferCount: number
  userId: string
  open: boolean
  onClose: () => void
  onUploaded: () => void
}

export default function UploadCounterOfferModal({
  contractId,
  counterOfferCount,
  userId,
  open,
  onClose,
  onUploaded
}: UploadCounterOfferModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleUpload = async () => {
    if (!file) {
      setError('Select a PDF counter-offer before uploading.')
      return
    }

    setIsUploading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const storagePath = `${contractId}/counter-${counterOfferCount + 1}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('counter_offers').upload(storagePath, file, {
        upsert: true
      })

      if (uploadError) throw uploadError

      const { error: functionError } = await supabase.functions.invoke('counterOfferCreation', {
        body: {
          contractId,
          storagePath,
          fileName: file.name,
          userId
        }
      })

      if (functionError) throw functionError

      setSuccessMessage('Counter-offer queued successfully. Timeline and summaries will refresh shortly.')
      setFile(null)
      onUploaded()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to upload counter-offer'
      setError(message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload counter-offer #{counterOfferCount + 1}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {successMessage && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
            <UploadCloud className="mx-auto h-10 w-10 text-indigo-600" />
            <p className="mt-3 text-sm text-slate-500">Upload signed counter-offers in PDF format.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <Button className="mt-4" onClick={() => fileInputRef.current?.click()} variant="outline">
              Choose file
            </Button>
            {file && <p className="mt-2 text-sm text-slate-600">{file.name}</p>}
          </div>
          <Button onClick={handleUpload} disabled={isUploading || !file} className="w-full">
            {isUploading ? 'Uploading…' : 'Upload counter-offer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
