'use client'

import React from 'react'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const maybe = error as { digest?: unknown }
  const digestText = typeof maybe.digest === 'string' ? maybe.digest : error.message
  return (
    <div className="mx-auto max-w-2xl py-16 px-6 text-center">
      <h2 className="text-2xl font-semibold text-gray-900">Something went wrong</h2>
      <p className="mt-3 text-gray-600">The products page failed to load. Please try again.</p>
      {error?.message && (
        <p className="mt-2 text-xs text-gray-400">Digest: {digestText}</p>
      )}
      <div className="mt-6">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-500"
        >
          Retry
        </button>
      </div>
    </div>
  )
}
