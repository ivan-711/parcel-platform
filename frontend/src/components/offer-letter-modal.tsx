/** Modal for AI-generated offer letter with copy-to-clipboard and PDF download. */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Copy, Check, Download, RefreshCw } from 'lucide-react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { StrategyBadge } from '@/components/ui/StrategyBadge'
import { Button } from '@/components/ui/button'
import { OfferLetterPDF } from '@/components/offer-letter-pdf'
import { api } from '@/lib/api'
import type { Strategy } from '@/types'

interface OfferLetterModalProps {
  isOpen: boolean
  onClose: () => void
  dealId: string
  address: string
  strategy: string
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
    await navigator.clipboard.writeText(data.offer_letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="border-[#1A1A2E] bg-[#0F0F1A] sm:max-w-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
        >
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle className="text-text-primary">Offer Letter</DialogTitle>
              <StrategyBadge strategy={strategy as Strategy} />
            </div>
            <DialogDescription className="text-[#94A3B8]">
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
                      className="h-4 rounded bg-[#1A1A2E] animate-pulse"
                      style={{ width: `${70 + Math.random() * 30}%` }}
                    />
                  ))}
                </div>
                <p className="text-sm text-[#94A3B8] text-center pt-2">
                  Generating your offer letter with AI...
                </p>
              </div>
            )}

            {/* Error State */}
            {isError && (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-red-400">
                  {error instanceof Error ? error.message : 'Failed to generate offer letter'}
                </p>
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  className="gap-2"
                >
                  <RefreshCw size={14} />
                  Retry
                </Button>
              </div>
            )}

            {/* Generated State */}
            {data && !isLoading && !isError && (
              <div className="space-y-4">
                <pre className="max-h-[400px] overflow-y-auto rounded-lg border border-[#1A1A2E] bg-[#08080F] p-4 text-sm text-[#E2E8F0] font-mono whitespace-pre-wrap leading-relaxed">
                  {data.offer_letter}
                </pre>

                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={handleCopy}
                    className="gap-2"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy to Clipboard'}
                  </Button>
                  <PDFDownloadLink
                    document={
                      <OfferLetterPDF
                        address={data.address}
                        letterText={data.offer_letter}
                        generatedAt={data.generated_at}
                      />
                    }
                    fileName={`offer-letter-${data.address.replace(/[\s,.]+/g, '-').toLowerCase()}.pdf`}
                  >
                    {({ loading }) => (
                      <Button className="gap-2 bg-accent-primary hover:bg-accent-primary/90 text-white">
                        <Download size={14} />
                        {loading ? 'Preparing...' : 'Download as PDF'}
                      </Button>
                    )}
                  </PDFDownloadLink>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
