import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { differenceInDays, format, parseISO } from 'date-fns'
import { Calendar, Mail, Send, CheckCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { ContractsAPI } from '@/lib/supabase/queries/contracts'
import { ClientUpdatesAPI } from '@/lib/supabase/queries/clientUpdates'
import { UsersAPI } from '@/lib/supabase/queries/users'
import type { Database } from '@/lib/supabase/types'

type ContractRow = Database['public']['Tables']['contracts']['Row']
type ClientUpdateRow = Database['public']['Tables']['client_updates']['Row']

type UpcomingDate = {
  id: string
  contract_id: string
  contract: ContractRow
  date: string
  type: string
  label: string
  daysUntil: number
  alreadySent: boolean
  isOverdue: boolean
}

export default function ClientUpdatesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const {
    data: contracts = [],
    isLoading: contractsLoading
  } = useQuery({
    queryKey: ['client-updates-contracts', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => ContractsAPI.listByUser(user!.id)
  })

  const {
    data: updates = [],
    isLoading: updatesLoading,
    refetch: refetchUpdates
  } = useQuery({
    queryKey: ['client-updates-history', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => ClientUpdatesAPI.listByUser(user!.id)
  })

  const { data: profile } = useQuery({
    queryKey: ['client-updates-profile', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => UsersAPI.getCurrent(user!.id)
  })

  const sellerSideContracts = useMemo(() => {
    return contracts.filter((contract) => {
      const side = contract.representing_side?.toLowerCase()
      const status = contract.status?.toLowerCase()
      return side === 'seller' && status !== 'closed' && status !== 'cancelled'
    }).length
  }, [contracts])

  const upcomingDates = useMemo<UpcomingDate[]>(() => {
    const activeBuyerContracts = contracts.filter((contract) => {
      const status = contract.status?.toLowerCase()
      const side = contract.representing_side?.toLowerCase()
      return status !== 'closed' && status !== 'cancelled' && side === 'buyer' && Boolean(contract.buyer_email)
    })

    const config = [
      { key: 'inspection_date', type: 'inspection_scheduled', label: 'Inspection', completed: 'inspection_completed' },
      {
        key: 'inspection_response_date',
        type: 'inspection_response',
        label: 'Inspection Response Due',
        completed: 'inspection_response_completed'
      },
      { key: 'appraisal_date', type: 'appraisal_scheduled', label: 'Appraisal', completed: 'appraisal_completed' },
      {
        key: 'loan_contingency_date',
        type: 'loan_contingency',
        label: 'Loan Contingency',
        completed: 'loan_contingency_completed'
      },
      {
        key: 'final_walkthrough_date',
        type: 'final_walkthrough',
        label: 'Final Walkthrough',
        completed: 'final_walkthrough_completed'
      },
      { key: 'closing_date', type: 'closing', label: 'Closing', completed: 'closing_completed' }
    ] as const

    const windows: UpcomingDate[] = []

    activeBuyerContracts.forEach((contract) => {
      config.forEach(({ key, type, label, completed }) => {
        const rawDate = contract[key as keyof ContractRow] as string | null
        const isCompleted = Boolean(contract[completed as keyof ContractRow])
        if (rawDate && !isCompleted) {
          const daysUntil = differenceInDays(new Date(rawDate), new Date())
          if (daysUntil <= 14) {
            const alreadySent = updates.some(
              (update) => update.contract_id === contract.id && update.update_type === type && update.is_sent
            )

            windows.push({
              id: `${contract.id}-${type}`,
              contract_id: contract.id,
              contract,
              date: rawDate,
              type,
              label,
              daysUntil,
              alreadySent,
              isOverdue: daysUntil < 0
            })
          }
        }
      })
    })

    return windows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [contracts, updates])

  const generateEmailContent = (dateInfo: UpcomingDate) => {
    const { contract, label, date, type } = dateInfo
    const formattedDate = format(parseISO(date), 'EEEE, MMMM d, yyyy')
    const buyerFirstName = contract.buyer_name?.split(' ')[0] ?? 'there'
    const price = contract.purchase_price ? `$${contract.purchase_price.toLocaleString()}` : ''

    const templates: Record<
      string,
      {
        subject: string
        body: string
      }
    > = {
      inspection_scheduled: {
        subject: `Upcoming Inspection - ${contract.property_address}`,
        body: `Hi ${buyerFirstName}!

Just a friendly reminder that your home inspection is coming up:

📅 Date: ${formattedDate}
📍 Property: ${contract.property_address}

I'll send you the inspector's contact information shortly. Please make sure all utilities are on and the property is accessible.

After the inspection, we'll review the report together and discuss any findings.

Looking forward to moving this forward!`
      },
      inspection_response: {
        subject: `Inspection Response Deadline - ${contract.property_address}`,
        body: `Hi ${buyerFirstName}!

Quick reminder - your inspection response deadline is coming up on ${formattedDate}.

📍 Property: ${contract.property_address}

Have you had a chance to review the inspection report? Let's schedule a call to discuss any concerns and next steps.

I'm here to help guide you through this!`
      },
      appraisal_scheduled: {
        subject: `Appraisal Coming Up - ${contract.property_address}`,
        body: `Hi ${buyerFirstName}!

Your appraisal is scheduled for ${formattedDate}.

📍 Property: ${contract.property_address}
💰 Purchase Price: ${price}

The appraiser will assess the property to ensure it supports the purchase price. I'll keep you updated on the results.

Everything is on track!`
      },
      loan_contingency: {
        subject: `Loan Contingency Deadline - ${contract.property_address}`,
        body: `Hi ${buyerFirstName}!

Your loan contingency deadline is ${formattedDate}.

📍 Property: ${contract.property_address}

How is the loan process going? Let me know if you need me to follow up with your lender or if there's anything I can help with.

We're almost there!`
      },
      final_walkthrough: {
        subject: `Final Walkthrough Scheduled - ${contract.property_address}`,
        body: `Hi ${buyerFirstName}!

Your final walkthrough is scheduled for ${formattedDate}!

📍 Property: ${contract.property_address}

This is your chance to verify the property is in the agreed-upon condition before closing. I'll meet you there and we'll do a thorough walk-through together.

Almost time to get your keys!`
      },
      closing: {
        subject: `Closing Day Approaching! - ${contract.property_address}`,
        body: `Hi ${buyerFirstName}!

The big day is almost here! Your closing is scheduled for ${formattedDate}.

📍 Property: ${contract.property_address}
${price ? `💰 Purchase Price: ${price}\n` : ''}

I'll send you the closing location and time details soon. Make sure to bring a valid ID and your certified funds.

Congratulations - you're about to be a homeowner!`
      }
    }

    return (
      templates[type] ?? {
        subject: `Update on ${contract.property_address}`,
        body: `Hi ${buyerFirstName}!\n\n${label} is scheduled for ${formattedDate}.\n\nProperty: ${contract.property_address}\n\nI'll keep you updated!`
      }
    )
  }

  const toggleSending = (key: string, sending: boolean) =>
    setSendingIds((prev) => {
      const next = new Set(prev)
      if (sending) {
        next.add(key)
      } else {
        next.delete(key)
      }
      return next
    })

  const handleSendUpdate = async (dateInfo: UpcomingDate) => {
    setError(null)
    setSuccess(null)
    toggleSending(dateInfo.id, true)

    try {
      const { subject, body } = generateEmailContent(dateInfo)
      const closingDetail = dateInfo.contract.closing_date
        ? `Expected Closing: ${format(parseISO(dateInfo.contract.closing_date), 'MMMM d, yyyy')}`
        : ''
      const emailBody = `${body}

---
${closingDetail}

Questions? Just reply to this email.

Best regards,
${profile?.full_name ?? 'Your agent'}
${profile?.brokerage_name ?? ''}

---
Sent from ContractFlowAI`

      await supabase.functions.invoke('clientUpdates', {
        body: {
          userId: user?.id,
          contractId: dateInfo.contract_id,
          updateType: dateInfo.type,
          subject,
          body: emailBody
        }
      })

      setSuccess(`✅ Email sent to ${dateInfo.contract.buyer_name ?? 'client'}!`)
      await refetchUpdates()
    } catch (err) {
      setError(`❌ Error: ${(err as Error).message}`)
      toast({ title: 'Failed to send', description: (err as Error).message, variant: 'destructive' })
    } finally {
      toggleSending(dateInfo.id, false)
    }
  }

  const renderDateBadge = (dateInfo: UpcomingDate) => {
    if (dateInfo.daysUntil === 0) return 'TODAY'
    if (dateInfo.daysUntil === 1) return 'Tomorrow'
    if (dateInfo.isOverdue) return `${Math.abs(dateInfo.daysUntil)}d overdue`
    return `${dateInfo.daysUntil} days`
  }

  const isLoading = contractsLoading || updatesLoading

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">📧 Client Updates</h1>
          <p className="text-gray-600">Automatically send reminders to your buyer clients for upcoming dates</p>
        </div>

        {sellerSideContracts > 0 && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-900">
              <strong>Note:</strong> You have {sellerSideContracts} listing{sellerSideContracts !== 1 ? 's' : ''} where you
              represent the seller. Automated reminders are only sent to buyer clients. Seller updates are typically handled by the
              buyer&apos;s agent.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#1e3a5f]" />
              Buyer Clients - Ready to Send ({upcomingDates.filter((d) => !d.alreadySent).length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <p className="text-center text-gray-500">Loading contracts…</p>
            ) : upcomingDates.length === 0 ? (
              <div className="py-12 text-center">
                <Mail className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                <p className="text-lg text-gray-500">No upcoming dates for buyer clients in the next 14 days</p>
                <p className="mt-2 text-sm text-gray-400">
                  {sellerSideContracts > 0
                    ? "Seller-side contracts don't get automated buyer reminders"
                    : "Contract dates will appear here when they're within 2 weeks"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingDates.map((dateInfo) => (
                  <div
                    key={dateInfo.id}
                    className={`rounded-lg border-2 p-5 transition-all ${
                      dateInfo.isOverdue
                        ? 'border-red-300 bg-red-50'
                        : dateInfo.alreadySent
                          ? 'border-gray-200 bg-gray-50 opacity-60'
                          : 'border-blue-200 bg-white hover:border-blue-400 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge className={`${dateInfo.isOverdue ? 'bg-red-600' : 'bg-blue-600'} text-white`}>
                            {dateInfo.label}
                          </Badge>
                          <Badge variant="outline">{renderDateBadge(dateInfo)}</Badge>
                          {dateInfo.alreadySent && (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Already Sent
                            </Badge>
                          )}
                        </div>

                        <h3 className="mb-1 text-lg font-bold text-gray-900">{dateInfo.contract.property_address}</h3>

                        <div className="mb-3 grid gap-2 text-sm text-gray-600 md:grid-cols-2">
                          <div>
                            <strong>Client:</strong> {dateInfo.contract.buyer_name}
                          </div>
                          <div>
                            <strong>Email:</strong> {dateInfo.contract.buyer_email}
                          </div>
                          <div>
                            <strong>Date:</strong> {format(parseISO(dateInfo.date), 'MMM d, yyyy')}
                          </div>
                          <div>
                            <strong>Price:</strong>{' '}
                            {dateInfo.contract.purchase_price ? `$${dateInfo.contract.purchase_price.toLocaleString()}` : '—'}
                          </div>
                        </div>

                        <details className="text-sm">
                          <summary className="cursor-pointer font-medium text-blue-600 hover:text-blue-800">
                            Preview Email →
                          </summary>
                          <div className="mt-3 rounded border border-gray-200 bg-gray-50 p-4">
                            <p className="mb-2 font-semibold">Subject: {generateEmailContent(dateInfo).subject}</p>
                            <pre className="whitespace-pre-wrap font-sans text-xs text-gray-700">
                              {generateEmailContent(dateInfo).body}
                            </pre>
                          </div>
                        </details>
                      </div>

                      <div className="flex-shrink-0">
                        {dateInfo.alreadySent ? (
                          <div className="text-center">
                            <CheckCircle className="mx-auto mb-1 h-8 w-8 text-green-600" />
                            <p className="text-xs text-gray-500">Sent</p>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleSendUpdate(dateInfo)}
                            disabled={sendingIds.has(dateInfo.id)}
                            className={`min-w-[140px] ${
                              dateInfo.isOverdue ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            {sendingIds.has(dateInfo.id) ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="mr-2 h-4 w-4" />
                                Send Email
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <CardTitle>Recent Updates ({updates.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {updates.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No updates sent yet</p>
            ) : (
              <div className="space-y-2">
                {updates.slice(0, 10).map((update: ClientUpdateRow) => {
                  const contract = contracts.find((c) => c.id === update.contract_id)
                  return (
                    <div key={update.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                      <div>
                        <p className="font-semibold text-gray-900">{contract?.property_address ?? 'Contract'}</p>
                        <p className="text-sm text-gray-600">
                          To: {update.client_email} • {update.update_type.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <CheckCircle className="mr-2 inline h-4 w-4 text-green-600" />
                        <span className="text-sm text-gray-500">
                          {update.sent_date ? format(parseISO(update.sent_date), 'MMM d, h:mm a') : ''}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
