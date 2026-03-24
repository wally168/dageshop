'use client'

import Layout from '@/components/Layout'
import { useSettings } from '@/lib/settings'

export default function AboutPage() {
  const { settings, loading } = useSettings()

  return (
    <Layout>
      <div className="bg-white">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-blue-50 to-indigo-100 py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                About {loading ? 'Your Brand' : settings.siteName}
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                {loading ? 'We\'re passionate about bringing you the finest products that combine quality, innovation, and style.' : settings.aboutText}
              </p>
            </div>
          </div>
        </div>

        {/* About Content */}
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="prose prose-lg prose-blue mx-auto">
              <h2>Our Story</h2>
              <p>
                {loading ? 
                  'Founded with a vision to make premium products accessible to everyone, Your Brand has been dedicated to curating exceptional items that enhance your daily life. We believe that quality shouldn\'t be compromised, and every product in our collection reflects this commitment.' 
                  : settings.ourStory
                }
              </p>
              
              <h2>Our Mission</h2>
              <p>
                {loading ? 
                  'To provide our customers with carefully selected, high-quality products that offer both functionality and style. We work directly with trusted manufacturers and suppliers to ensure that every item meets our rigorous standards.' 
                  : settings.ourMission
                }
              </p>

              <h2>Why Choose Us</h2>
              <ul>
                {loading ? (
                  <>
                    <li>Rigorous quality control and product testing</li>
                    <li>Competitive pricing with transparent policies</li>
                    <li>Excellent customer service and support</li>
                    <li>Fast and reliable shipping</li>
                    <li>Satisfaction guarantee on all products</li>
                  </>
                ) : (
                  settings.whyChooseUs.split('\n').filter(item => item.trim()).map((item, index) => (
                    <li key={index}>{item.trim()}</li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>


      </div>
    </Layout>
  )
}