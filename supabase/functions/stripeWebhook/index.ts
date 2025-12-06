import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@16.6.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1'
import type { Database } from '../../../../src/lib/supabase/types.ts'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
  throw new Error('Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET environment variables.')
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

const supabase = createClient<Database>(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
  auth: { persistSession: false }
})

type SubscriptionStatus = Database['public']['Tables']['user_subscriptions']['Row']['status']

const upsertSubscription = async ({
  userId,
  plan,
  status,
  expiresAt
}: {
  userId: string
  plan: string | null | undefined
  status: SubscriptionStatus
  expiresAt?: string | null
}) => {
  const payload = {
    user_id: userId,
    plan: plan ?? 'unknown',
    status,
    expires_at: expiresAt ?? null
  }

  await supabase.from('user_subscriptions').upsert(payload, { onConflict: 'user_id' })
  await supabase
    .from('users')
    .update({
      subscription_status: status,
      subscription_expires_at: expiresAt ?? null
    })
    .eq('id', userId)
}

const findUserId = async (session: Stripe.Checkout.Session) => {
  const metadataId = session.metadata?.supabase_user_id ?? session.metadata?.user_id
  if (metadataId) return metadataId

  const email = session.customer_details?.email ?? (session.customer_email as string | null)
  if (!email) return null

  const { data } = await supabase.from('users').select('id').eq('email', email).maybeSingle()
  return data?.id ?? null
}

const isoFromUnix = (unix?: number | null) => (unix ? new Date(unix * 1000).toISOString() : null)

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const signature = req.headers.get('stripe-signature') ?? ''
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error)
    return new Response('Invalid signature', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = await findUserId(session)
        if (!userId) break

        await upsertSubscription({
          userId,
          plan: session.metadata?.plan ?? session.metadata?.price_id ?? session.metadata?.product_id,
          status: 'active',
          expiresAt: isoFromUnix(session.expires_at)
        })
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = (subscription.metadata?.supabase_user_id ?? subscription.metadata?.user_id) as string | undefined

        if (!userId && typeof subscription.customer === 'string') {
          const customer = await stripe.customers.retrieve(subscription.customer)
          if (!customer || typeof customer === 'string') break
          const email = customer.email
          if (!email) break
          const { data } = await supabase.from('users').select('id').eq('email', email).maybeSingle()
          if (!data?.id) break
          await upsertSubscription({
            userId: data.id,
            plan: subscription.items.data[0]?.price.nickname ?? subscription.items.data[0]?.price.id,
            status: subscription.status as SubscriptionStatus,
            expiresAt: isoFromUnix(subscription.current_period_end)
          })
        } else if (userId) {
          await upsertSubscription({
            userId,
            plan: subscription.items.data[0]?.price.nickname ?? subscription.items.data[0]?.price.id,
            status: subscription.status as SubscriptionStatus,
            expiresAt: isoFromUnix(subscription.current_period_end)
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id ?? subscription.metadata?.user_id
        if (!userId) break
        await upsertSubscription({
          userId,
          plan: subscription.items.data[0]?.price.nickname ?? subscription.items.data[0]?.price.id,
          status: 'inactive',
          expiresAt: isoFromUnix(subscription.canceled_at)
        })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const userId = invoice.metadata?.supabase_user_id ?? invoice.metadata?.user_id
        if (!userId) break
        await upsertSubscription({
          userId,
          plan: invoice.lines.data[0]?.price?.nickname ?? invoice.lines.data[0]?.price?.id,
          status: 'inactive',
          expiresAt: isoFromUnix(invoice.lines.data[0]?.period?.end ?? null)
        })
        break
      }

      default:
        // For other events we simply acknowledge.
        break
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Stripe webhook processing error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
})
