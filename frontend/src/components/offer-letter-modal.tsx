/** Modal for AI-generated offer letter with copy-to-clipboard and PDF download. */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
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
import jsPDF from 'jspdf'
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

  const handleDownloadPDF = () => {
    if (!data?.offer_letter) return
    const doc = new jsPDF()
    const cleanText = cleanLetter(data.offer_letter)
    const lines = doc.splitTextToSize(cleanText, 180)
    doc.setFontSize(11)
    doc.text(lines, 15, 20)
    doc.save(`offer-letter-${address.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="border-white/[0.06] bg-[#22211D] sm:max-w-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
        >
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle className="text-[#F0EDE8]">Offer Letter</DialogTitle>
              <StrategyBadge strategy={strategy} />
            </div>
            <DialogDescription className="text-[#A09D98]">
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
                      className="h-4 rounded bg-white/[0.06] animate-pulse"
                      style={{ width: `${70 + ((i * 17) % 30)}%` }}
                    />
                  ))}
                </div>
                <p className="text-sm text-[#A09D98] text-center pt-2">
                  Generating your offer letter with AI...
                </p>
              </div>
            )}

            {/* Error State */}
            {isError && (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-[#D4766A]">
                  {error instanceof Error ? error.message : 'Failed to generate offer letter'}
                </p>
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  className="gap-2 border-white/[0.06] text-[#A09D98] hover:text-[#F0EDE8] hover:bg-white/[0.04]"
                >
                  <RefreshCw size={14} />
                  Retry
                </Button>
              </div>
            )}

            {/* Generated State */}
            {data && !isLoading && !isError && (
              <div className="space-y-4">
                <pre className="max-h-[400px] overflow-y-auto rounded-lg border border-white/[0.04] bg-[#0C0B0A] p-4 text-sm text-[#A09D98] whitespace-pre-wrap leading-relaxed">
                  {cleanLetter(data.offer_letter)}
                </pre>

                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={handleCopy}
                    className="gap-2 border-white/[0.06] text-[#A09D98] hover:text-[#F0EDE8] hover:bg-white/[0.04]"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy to Clipboard'}
                  </Button>
                  <Button
                    onClick={handleDownloadPDF}
                    className="gap-2 bg-gradient-to-r from-[#8B7AFF] to-[#6C5CE7] text-[#0C0B0A] hover:opacity-90"
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
