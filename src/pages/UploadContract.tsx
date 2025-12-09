import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import ContractDeadlines from '@/components/ContractDeadlines'
import EmailSummaryModal from '@/components/EmailSummaryModal'

console.log('🔥 UploadContract LOADED')

const DEFAULT_STATUSES = {
  uploaded: 'uploaded',
  parsingFailed: 'parsed_fallback'
}

type ContractParsingResult = {
  summary: string
  deadlines: Record<string, string | null>
  contractId: string
}

type ContractParsingEdgeResponse = ContractParsingResult & {
  attempts?: unknown
}

export default function UploadContract() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [parsingResult, setParsingResult] = useState<ContractParsingResult | null>(null)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [uploadTitle, setUploadTitle] = useState('Contract Timeline')

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
    setParsingResult(null)

    let contractId: string | null = null

    try {
      const fileExt = file.name.split('.').pop() || 'pdf'
      const uniqueId = crypto.randomUUID()
      const filePath = `${user.id}/${uniqueId}.${fileExt}`
      const derivedTitle = file.name.replace(/\.[^/.]+$/, '') || 'Contract Timeline'
      setUploadTitle(derivedTitle)

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
          status: 'under_contract'
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

      const { data: parseData, error: parseError } = await supabase.functions.invoke<ContractParsingEdgeResponse>('contractParsing', {
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

      if (!parseData || typeof parseData !== 'object') {
        throw new Error('Parsing response missing data payload.')
      }

      setParsingResult({
        summary: typeof parseData.summary === 'string' ? parseData.summary : 'Summary pending manual review.',
        deadlines: (parseData.deadlines as Record<string, string | null>) ?? {},
        contractId: parseData.contractId ?? contract.id
      })

      console.log('Parsing complete:', parseData)
      toast({ title: 'Contract parsed', description: 'Successfully processed!' })
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

  const deadlineDefinitions = [
    { key: 'inspection_date', label: 'Inspection' },
    { key: 'inspection_response_date', label: 'Inspection Response' },
    { key: 'appraisal_date', label: 'Appraisal' },
    { key: 'loan_contingency_date', label: 'Loan Contingency' },
    { key: 'final_walkthrough_date', label: 'Final Walkthrough' },
    { key: 'closing_date', label: 'Closing' }
  ] as const

  const deadlineList = useMemo(() => {
    if (!parsingResult) return []
    return deadlineDefinitions.map(({ key, label }) => {
      const date = parsingResult.deadlines?.[key] ?? null
      const completed = Boolean(date && Date.parse(date) < Date.now())
      return { label, date, completed }
    })
  }, [parsingResult])

  const formatICSDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const handleCalendarDownload = () => {
    if (!parsingResult) return
    const now = new Date()

    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ContractFlowAI//EN'
    ]

    deadlineDefinitions.forEach(({ key, label }) => {
      const date = parsingResult.deadlines?.[key]
      if (!date) return
      const normalized = date.replace(/-/g, '')
      icsLines.push('BEGIN:VEVENT')
      icsLines.push(`UID:${parsingResult.contractId}-${key}@contractflowai`)
      icsLines.push(`DTSTAMP:${formatICSDate(now)}`)
      icsLines.push(`SUMMARY:${label} - ${uploadTitle}`)
      icsLines.push(`DTSTART;VALUE=DATE:${normalized}`)
      icsLines.push('DURATION:P1D')
      icsLines.push('END:VEVENT')
    })

    icsLines.push('END:VCALENDAR')

    const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${uploadTitle.replace(/\s+/g, '_')}_deadlines.ics`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4">
      <Card className="rounded-lg border bg-white p-6 shadow-md">
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

      {parsingResult && (
        <div className="space-y-6">
          <Card className="border bg-white shadow-lg">
            <CardHeader>
              <CardTitle>AI Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base leading-relaxed text-slate-700">{parsingResult.summary}</p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setEmailModalOpen(true)}>Send summary via email</Button>
                <Button variant="outline" onClick={handleCalendarDownload}>
                  Add to calendar
                </Button>
                <Button variant="ghost" onClick={() => navigate(`/contracts/${parsingResult.contractId}`)}>
                  View contract
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Deadlines</CardTitle>
            </CardHeader>
            <CardContent>
              <ContractDeadlines deadlines={deadlineList} />
            </CardContent>
          </Card>
        </div>
      )}

      {parsingResult && (
        <EmailSummaryModal
          open={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          summary={parsingResult.summary}
          contractId={parsingResult.contractId}
        />
      )}
    </div>
  )
}
