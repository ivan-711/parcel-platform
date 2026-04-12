/** Modal for AI-generated offer letter with copy-to-clipboard and PDF download. */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { prefersReducedMotion } from '@/lib/motion'
import { Copy, Check, Download, RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { StrategyBadge } from '@/components/ui/StrategyBadge'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { Strategy } from '@/types'

/** Strip markdown bold/italic markers from AI-generated text. */
const cleanLetter = (text: string) =>
  text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')

interface OfferLetterModalProps {
  isOpen: boolean
  onClose: () => void
  dealId: string
  address: string
  strategy: Strategy
}

export function OfferLetterModal({
  isOpen,
  onClose,
  dealId,
  address,
  strategy,
}: OfferLetterModalProps) {
  const [copied, setCopied] = useState(false)

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['offer-letter', dealId],
    queryFn: () => api.offerLetter.generate(dealId),
    enabled: isOpen && !!dealId,
    staleTime: 0,
    retry: false,
  })

  const handleCopy = async () => {
    if (!data?.offer_letter) return
    try {
      await navigator.clipboard.writeText(cleanLetter(data.offer_letter))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!data?.offer_letter) return
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const cleanText = cleanLetter(data.offer_letter)
    const lines = doc.splitTextToSize(cleanText, 180)
    doc.setFontSize(11)
    doc.text(lines, 15, 20)
    doc.save(`offer-letter-${address.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="border-border-default bg-app-elevated sm:max-w-2xl">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.15 }}
        >
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle className="text-text-primary">Offer Letter</DialogTitle>
              <StrategyBadge strategy={strategy} />
            </div>
            <DialogDescription className="text-text-secondary">
              {address}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {/* Loading State */}
            {isLoading && (
              <div className="space-y-3">
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-4 rounded bg-layer-3 animate-pulse"
                      style={{ width: `${70 + ((i * 17) % 30)}%` }}
                    />
                  ))}
                </div>
                <p className="text-sm text-text-secondary text-center pt-2">
                  Generating your offer letter with AI...
                </p>
              </div>
            )}

            {/* Error State */}
            {isError && (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-loss">
                  {error instanceof Error ? error.message : 'Failed to generate offer letter'}
                </p>
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  className="gap-2 border-border-default text-text-secondary hover:text-text-primary hover:bg-layer-2"
                >
                  <RefreshCw size={14} />
                  Retry
                </Button>
              </div>
            )}

            {/* Generated State */}
            {data && !isLoading && !isError && (
              <div className="space-y-4">
                <pre className="max-h-[400px] overflow-y-auto rounded-lg border border-border-subtle bg-app-bg p-4 text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                  {cleanLetter(data.offer_letter)}
                </pre>

                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={handleCopy}
                    className="gap-2 border-border-default text-text-secondary hover:text-text-primary hover:bg-layer-2"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy to Clipboard'}
                  </Button>
                  <Button
                    onClick={handleDownloadPDF}
                    className="gap-2 bg-gradient-to-r from-violet-400 to-violet-500 text-accent-text-on-accent hover:opacity-90"
                  >
                    <Download size={14} />
                    Download as PDF
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
