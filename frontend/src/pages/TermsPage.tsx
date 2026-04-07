import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import ReactMarkdown from 'react-markdown'

export default function TermsPage() {
  const [content, setContent] = useState('')

  useEffect(() => {
    fetch('/legal/terms-of-service.md')
      .then((r) => r.text())
      .then(setContent)
      .catch(() => setContent('# Terms of Service\n\nFailed to load. Please try again later.'))
  }, [])

  return (
    <div className="min-h-screen bg-app-bg">
      <Helmet>
        <title>Terms of Service — Parcel</title>
        <meta name="description" content="Parcel terms of service — the agreement governing your use of the platform." />
      </Helmet>
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        <article className="prose-legal">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      </div>
    </div>
  )
}
