import { Shield, Lock, Eye, FileText, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PrivacyPage() {
  const lastUpdated = new Date().toLocaleDateString()

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-gray-600">Your documents and data are 100% private and secure</p>
          <p className="mt-2 text-sm text-gray-500">Last Updated: {lastUpdated}</p>
        </div>

        {/* Key Commitments */}
        <Card className="border-l-4 border-green-500 bg-green-50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CheckCircle className="h-6 w-6 text-green-600" />
              Our Commitments to You
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
              <p className="text-gray-800">
                <strong>Your documents are NEVER modified</strong> - we only read them to extract contract data
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
              <p className="text-gray-800">
                <strong>Your data is NEVER sold</strong> - we don&apos;t sell, rent, or trade your information
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
              <p className="text-gray-800">
                <strong>Your data stays private</strong> - only you and authorized users can access it
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
              <p className="text-gray-800">
                <strong>No third-party sharing</strong> - your contracts stay in your secure account
              </p>
            </div>
          </CardContent>
        </Card>

        {/* What We Collect */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#1e3a5f]" />
              What Information We Collect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="mb-2 font-semibold text-gray-900">1. Account Information</h3>
              <ul className="ml-4 list-disc list-inside space-y-1 text-gray-700">
                <li>Name and email address (from Google Sign-In)</li>
                <li>Subscription tier and status</li>
                <li>Reminder preferences</li>
              </ul>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-gray-900">2. Contract Documents</h3>
              <ul className="ml-4 list-disc list-inside space-y-1 text-gray-700">
                <li>PDF or image files you upload</li>
                <li>Stored securely in your private account</li>
                <li>Only accessible by you and authorized users</li>
              </ul>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-gray-900">3. Extracted Contract Data</h3>
              <ul className="ml-4 list-disc list-inside space-y-1 text-gray-700">
                <li>Property addresses, buyer/seller names</li>
                <li>Prices, dates, and contract terms</li>
                <li>AI-generated summaries</li>
                <li>Notes you add to contracts</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* How We Use Data */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-[#1e3a5f]" />
              How We Use Your Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-700">
            <div className="flex items-start gap-3">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
              <p>
                <strong>Extract Contract Data:</strong> Read uploaded documents to automatically extract dates, prices, and terms
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
              <p>
                <strong>Generate Summaries:</strong> Use AI to create plain-language explanations of contract terms
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
              <p>
                <strong>Send Reminders:</strong> Email you about upcoming inspections, contingencies, and closings
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
              <p>
                <strong>Manage Your Account:</strong> Process payments and provide customer support
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Document Processing */}
        <Card className="border-l-4 border-blue-500 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" />
              How We Process Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-4">
              <h3 className="mb-2 font-semibold text-gray-900">Read-Only Processing</h3>
              <p className="mb-3 text-sm text-gray-700">
                When you upload a contract, we ONLY read it to extract information. The original document is:
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>
                    <strong>Never modified</strong> - stored exactly as you uploaded it
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>
                    <strong>Never shared</strong> - stays in your private account
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>
                    <strong>Securely stored</strong> - encrypted and protected
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-gray-900">AI Processing</h3>
              <p className="text-sm text-gray-700">We use AI services (OpenAI) to read documents and extract data. The AI:</p>
              <ul className="ml-4 mt-2 list-disc list-inside space-y-1 text-sm text-gray-700">
                <li>Only receives the text content temporarily for analysis</li>
                <li>Does not store your documents permanently</li>
                <li>Returns extracted data that we save in your account</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* What We DON'T Do */}
        <Card className="border-l-4 border-red-500 bg-red-50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <XCircle className="h-6 w-6 text-red-600" />
              What We NEVER Do
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <p className="text-gray-800">
                <strong>Sell your data</strong> - we never sell, rent, or trade your information to anyone
              </p>
            </div>
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <p className="text-gray-800">
                <strong>Share with third parties</strong> - your contracts stay private to your account
              </p>
            </div>
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <p className="text-gray-800">
                <strong>Modify your documents</strong> - originals remain untouched
              </p>
            </div>
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <p className="text-gray-800">
                <strong>Use for marketing</strong> - your contracts are not used for advertising or training
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data Security */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#1e3a5f]" />
              Data Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-700">
            <p>We take security seriously and protect your data with:</p>
            <ul className="ml-4 list-disc list-inside space-y-2">
              <li>
                <strong>Encryption:</strong> All data is encrypted in transit (HTTPS) and at rest
              </li>
              <li>
                <strong>Secure Authentication:</strong> Google Sign-In with industry-standard OAuth
              </li>
              <li>
                <strong>Private Storage:</strong> Documents stored in isolated, secure cloud storage
              </li>
              <li>
                <strong>Access Controls:</strong> Only you can access your contracts and data
              </li>
              <li>
                <strong>Regular Backups:</strong> Your data is backed up automatically
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-[#1e3a5f]" />
              Your Rights &amp; Control
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-700">
            <p>You have complete control over your data:</p>
            <ul className="ml-4 list-disc list-inside space-y-2">
              <li>
                <strong>Access:</strong> View all your contracts and data anytime
              </li>
              <li>
                <strong>Edit:</strong> Update or correct any information
              </li>
              <li>
                <strong>Delete:</strong> Remove contracts or close your account anytime
              </li>
              <li>
                <strong>Export:</strong> Download your documents and data
              </li>
              <li>
                <strong>Opt-Out:</strong> Disable email reminders in settings
              </li>
            </ul>
            <p className="mt-4 text-sm">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:vtcoord2025@gmail.com" className="font-medium text-[#1e3a5f] hover:underline">
                vtcoord2025@gmail.com
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Data Retention */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Data Retention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-700">
            <p>We keep your data as long as your account is active:</p>
            <ul className="ml-4 list-disc list-inside space-y-2">
              <li>Active contracts and documents: Stored indefinitely while account is active</li>
              <li>Archived contracts: Remain accessible in your account</li>
              <li>Account closure: Data deleted within 30 days upon request</li>
              <li>Backup copies: Removed within 90 days of account deletion</li>
            </ul>
          </CardContent>
        </Card>

        {/* Third-Party Services */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Third-Party Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-700">
            <p>We use the following trusted services to operate the app:</p>
            <ul className="ml-4 list-disc list-inside space-y-2">
              <li>
                <strong>Google Sign-In:</strong> For secure authentication
              </li>
              <li>
                <strong>Supabase Platform:</strong> For hosting, authentication, and database
              </li>
              <li>
                <strong>OpenAI:</strong> For AI-powered document analysis (text only, not stored)
              </li>
              <li>
                <strong>Resend:</strong> For sending email reminders
              </li>
              <li>
                <strong>Stripe/PayPal/Square:</strong> For payment processing (they handle payment data, not us)
              </li>
            </ul>
            <p className="mt-3 text-sm">These services have their own privacy policies and are bound by strict security standards.</p>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="border-l-4 border-[#c9a961] shadow-lg">
          <CardHeader>
            <CardTitle>Questions or Concerns?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-gray-700">
              If you have any questions about this Privacy Policy or how we handle your data, please contact us:
            </p>
            <div className="space-y-2 rounded-lg bg-gray-50 p-4">
              <p className="text-gray-700">
                <strong>Email:</strong>{' '}
                <a href="mailto:vtcoord2025@gmail.com" className="text-[#1e3a5f] hover:underline">
                  vtcoord2025@gmail.com
                </a>
              </p>
              <p className="text-gray-700">
                <strong>Response Time:</strong> Within 24 hours
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="border-t py-8 text-center">
          <p className="text-sm text-gray-500">
            This privacy policy is effective as of {lastUpdated} and may be updated from time to time.
            <br />
            We will notify you of any material changes via email.
          </p>
        </div>
      </div>
    </div>
  )
}
