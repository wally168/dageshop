'use client'
export const dynamic = 'force-dynamic'

import Layout from '@/components/Layout'
import { useSettings } from '@/lib/settings'

export default function TermsPage() {
  const { settings, loading } = useSettings()
  const content = loading ? defaultTerms() : settings.termsOfService
  const paragraphs = content.split('\n').filter(p => p.trim().length)

  return (
    <Layout>
      <div className="bg-white">
        <div className="relative bg-gradient-to-br from-blue-50 to-indigo-100 py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Terms of Service
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                Please review the terms governing your use of our site.
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="prose prose-lg prose-blue mx-auto">
              <h2>Agreement to Terms</h2>
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}

              <h2>Use of the Service</h2>
              <ul>
                <li>Do not misuse or attempt to disrupt the site.</li>
                <li>Product details, pricing, shipping, and returns are subject to change.</li>
                <li>We may update these terms; continued use constitutes acceptance.</li>
              </ul>

              <h2>Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by law, we are not liable for indirect or incidental damages arising from your use of the site.
              </p>

              <h2>Contact</h2>
              <p>
                Questions about these terms? Email {loading ? 'contact@yourbrand.com' : settings.contactEmail}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

function defaultTerms() {
  return 'By using our site, you agree to our terms. This includes acceptable use, product information, pricing, shipping, returns, disclaimers, and limitations of liability. Please review carefully and contact us with any questions.'
}