'use client'

import { useState } from 'react'
import { Mail, Phone, MapPin } from 'lucide-react'
import Layout from '@/components/Layout'
import { useSettings } from '@/lib/settings'

export default function ContactPage() {
  const { settings, loading } = useSettings()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    country: '',
    orderNo: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [emailError, setEmailError] = useState('')

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) {
      return 'Email is required'
    }
    if (!emailRegex.test(email)) {
      return 'Your email format is incorrect. Please enter a valid email address (e.g., user@example.com)'
    }
    return ''
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.name === 'email') {
      setEmailError(validateEmail(e.target.value))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate email before submitting
    const emailValidationError = validateEmail(formData.email)
    if (emailValidationError) {
      setEmailError(emailValidationError)
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSubmitStatus('success')
        setFormData({ name: '', email: '', country: '', orderNo: '', subject: '', message: '' })
      } else {
        const data = await response.json()
        if (data.error && data.error.includes('valid email')) {
          setEmailError(data.error)
          setSubmitStatus('idle') // Don't show generic error if it's a specific field error
        } else {
          setSubmitStatus('error')
        }
      }
    } catch (error) {
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    if (name === 'email') {
      setEmailError('')
    }
  }

  return (
    <Layout>
      <div className="bg-white">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-blue-50 to-indigo-100 py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Contact Us
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                Have questions or feedback? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Send us a Message
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Fill out the form below and we'll get back to you as soon as possible.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-xl">
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div>
                <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">
                  Full Name *
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
                  Email Address *
                </label>
                <div className="mt-2">
                  <input
                    type="email"
                    name="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 ${
                      emailError ? 'ring-red-500 focus:ring-red-500' : 'ring-gray-300'
                    }`}
                  />
                  {emailError && (
                    <p className="mt-2 text-sm text-red-600" id="email-error">
                      {emailError}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium leading-6 text-gray-900">
                  Subject
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    name="subject"
                    id="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="country" className="block text-sm font-medium leading-6 text-gray-900">
                  Country
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    name="country"
                    id="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="orderNo" className="block text-sm font-medium leading-6 text-gray-900">
                  Order No.
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    name="orderNo"
                    id="orderNo"
                    value={formData.orderNo}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium leading-6 text-gray-900">
                  Message *
                </label>
                <div className="mt-2">
                  <textarea
                    name="message"
                    id="message"
                    rows={4}
                    required
                    value={formData.message}
                    onChange={handleChange}
                    className="block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="block w-full rounded-md bg-blue-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </div>

              {submitStatus === 'success' && (
                <div className="rounded-md bg-green-50 p-4">
                  <div className="text-sm text-green-800">
                    Thank you for your message! We'll get back to you soon.
                  </div>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-800">
                    There was an error sending your message. Please try again.
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-gray-50 py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Get in Touch
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                We're here to help and answer any questions you might have.
              </p>
            </div>

            {/* Contact Details - Single Row */}
            <div className="mx-auto mt-16 max-w-4xl">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="flex items-start sm:items-center gap-3 rounded-xl bg-white p-4 border border-gray-200 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 flex-shrink-0">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">Email</p>
                    <p className="text-sm text-gray-600 break-words">
                      {loading ? 'contact@yourstore.com' : settings.contactEmail || 'contact@yourstore.com'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start sm:items-center gap-3 rounded-xl bg-white p-4 border border-gray-200 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 flex-shrink-0">
                    <Phone className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">Phone</p>
                    <p className="text-sm text-gray-600 break-words">
                      {loading ? '+1 (555) 123-4567' : settings.contactPhone || '+1 (555) 123-4567'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start sm:items-center gap-3 rounded-xl bg-white p-4 border border-gray-200 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 flex-shrink-0">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">Address</p>
                    <p className="text-sm text-gray-600 break-words">
                      {loading ? '123 Business St, City, State 12345' : settings.contactAddress || '123 Business St, City, State 12345'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
