import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const ADMIN_EMAIL = 'chrispoponi@gmail.com'

serve(async (req) => {
  try {
    const { record } = await req.json()
    
    // Send email notification to admin
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ContractFlow AI <noreply@contractflowai.us>',
        to: [ADMIN_EMAIL],
        subject: `New Feedback: ${record.topic || 'General'}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e3a5f;">New Feedback Received</h2>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>From:</strong> ${record.email || 'No email provided'}</p>
              <p><strong>Topic:</strong> ${record.topic || 'General'}</p>
              ${record.sentiment ? `<p><strong>Sentiment:</strong> ${record.sentiment}</p>` : ''}
              <p><strong>Submitted:</strong> ${new Date(record.created_at).toLocaleString()}</p>
            </div>
            
            <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
              <h3 style="margin-top: 0;">Message:</h3>
              <p style="white-space: pre-wrap;">${record.message}</p>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #eff6ff; border-radius: 8px;">
              <p style="margin: 0; font-size: 14px; color: #1e40af;">
                View all feedback in your <a href="https://supabase.com/dashboard/project/uehjpftyvycbrketwhwg/editor" style="color: #1e40af;">Supabase Dashboard</a>
              </p>
            </div>
          </div>
        `,
      }),
    })

    if (!emailResponse.ok) {
      const error = await emailResponse.json()
      throw new Error(`Resend API error: ${JSON.stringify(error)}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending feedback notification:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
