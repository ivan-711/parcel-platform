import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import ReactMarkdown from 'react-markdown'

export default function PrivacyPage() {
  const [content, setContent] = useState('')

  useEffect(() => {
    fetch('/legal/privacy-policy.md')
      .then((r) => r.text())
      .then(setContent)
      .catch(() => setContent('# Privacy Policy\n\nFailed to load. Please try again later.'))
  }, [])

  return (
    <div className="min-h-screen bg-app-bg">
      <Helmet>
        <title>Privacy Policy — Parcel</title>
        <meta name="description" content="Parcel privacy policy — how we collect, use, and protect your data." />
      </Helmet>
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        <article className="prose-legal">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      </div>
    </div>
  )
}
