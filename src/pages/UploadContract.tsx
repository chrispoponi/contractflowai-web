import { useEffect, useState, type ChangeEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'

console.log('🔥 UploadContract LOADED')

const DEFAULT_STATUSES = {
  uploaded: 'uploaded',
  parsingFailed: 'parsed_fallback'
}

export default function UploadContract() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let mounted = true
    async function hydrate() {
      await supabase.auth.getSession()
      if (mounted) setAuthReady(true)
    }
    hydrate()
    return () => {
      mounted = false
    }
  }, [])

  if (!authReady) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-gray-500">Loading account…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  async function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)

    let contractId: string | null = null

    try {
      const fileExt = file.name.split('.').pop() || 'pdf'
      const uniqueId = crypto.randomUUID()
      const filePath = `${user.id}/${uniqueId}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('contracts').upload(filePath, file, {
        upsert: false,
        cacheControl: '3600',
        contentType: file.type || 'application/pdf',
        metadata: { owner: user.id }
      })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' })
        return
      }

      const { data: contract, error: insertError } = await supabase
        .from('contracts')
        .insert({
          user_id: user.id,
          contract_file_url: filePath,
          status: DEFAULT_STATUSES.uploaded
        })
        .select()
        .single()

      if (insertError || !contract) {
        console.error('Contract insert error:', insertError)
        toast({ title: 'Upload failed', description: 'Unable to create contract record.', variant: 'destructive' })
        return
      }

      contractId = contract.id
      toast({ title: 'Uploaded', description: 'Parsing…' })

      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      if (!accessToken) {
        console.error('Missing access token.')
        toast({ title: 'Auth error', description: 'Please log in again.', variant: 'destructive' })
        return
      }

      const payload = {
        storagePath: filePath,
        userId: user.id,
        contractId: contract.id,
        persist: true
      }

      console.log('📤 Invoking contractParsing with:', payload)

      const { data: parseData, error: parseError } = await supabase.functions.invoke('contractParsing', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: payload
      })

      console.log('📥 contractParsing response:', { data: parseData, error: parseError })

      const session = await supabase.auth.getSession()
      console.log('👤 Current session:', session)

      if (parseError) {
        console.error('Parse error:', parseError)
        await supabase
          .from('contracts')
          .update({ status: DEFAULT_STATUSES.parsingFailed })
          .eq('id', contract.id)
          .eq('user_id', user.id)
        toast({ title: 'Parsing failed', description: 'Our team was notified.', variant: 'destructive' })
        return
      }

      console.log('Parsing complete:', parseData)
      toast({ title: 'Contract parsed', description: 'Successfully processed!' })
      navigate(`/contracts/${contract.id}`)
    } catch (error) {
      console.error('Unexpected error:', error)
      toast({ title: 'Upload failed', description: 'Something went wrong.', variant: 'destructive' })
      if (contractId) {
        await supabase
          .from('contracts')
          .update({ status: DEFAULT_STATUSES.parsingFailed })
          .eq('id', contractId)
          .eq('user_id', user.id)
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="mx-auto max-w-3xl rounded-lg border bg-white p-6 shadow-md">
      <CardHeader>
        <CardTitle>AI Contract Upload</CardTitle>
      </CardHeader>
      <CardContent>
        <label className="block w-full cursor-pointer rounded-md border-2 border-dashed p-10 text-center text-gray-600 hover:bg-gray-50">
          {uploading ? 'Uploading…' : 'Click to choose a contract'}
          <input type="file" accept=".pdf,.eml,.msg" className="hidden" onChange={handleFileSelect} disabled={uploading} />
        </label>
      </CardContent>
    </Card>
  )
}
