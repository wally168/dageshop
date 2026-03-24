'use client'
export const dynamic = 'force-dynamic'

import Layout from '@/components/Layout'
import { useSettings } from '@/lib/settings'

export default function PrivacyPolicyPage() {
  const { settings, loading } = useSettings()
  const content = loading ? defaultPrivacy() : settings.privacyPolicy

  const paragraphs = content.split('\n').filter(p => p.trim().length)

  return (
    <Layout>
      <div className="bg-white">
        <div className="relative bg-gradient-to-br from-blue-50 to-indigo-100 py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Privacy Policy
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                Learn how we collect, use, and protect your data.
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="prose prose-lg prose-blue mx-auto">
              <h2>Overview</h2>
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}

              <h2>Data We Collect</h2>
              <ul>
                <li>Account information such as name and email.</li>
                <li>Order and payment details processed securely.</li>
                <li>Website usage analytics to improve experience.</li>
              </ul>

              <h2>Your Rights</h2>
              <ul>
                <li>Access, correct, or delete your personal data.</li>
                <li>Opt-out of marketing communications anytime.</li>
                <li>Contact us for privacy-related questions.</li>
              </ul>

              <h2>Contact</h2>
              <p>
                For privacy inquiries, email us at {loading ? 'contact@yourbrand.com' : settings.contactEmail}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

function defaultPrivacy() {
  return 'We value your privacy. This policy explains what data we collect, how we use it, and your rights. We collect basic information needed to operate our services, never sell personal data, and provide ways to access, correct, or delete your information.'
}