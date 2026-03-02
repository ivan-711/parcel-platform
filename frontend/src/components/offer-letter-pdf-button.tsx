/** Lazy-loadable wrapper around PDFDownloadLink + OfferLetterPDF — isolates @react-pdf/renderer behind dynamic import boundary. */

import { PDFDownloadLink } from '@react-pdf/renderer'
import { OfferLetterPDF } from '@/components/offer-letter-pdf'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface OfferLetterPDFButtonProps {
  address: string
  letterText: string
  generatedAt: string
  filename: string
}

export default function OfferLetterPDFButton({ address, letterText, generatedAt, filename }: OfferLetterPDFButtonProps) {
  return (
    <PDFDownloadLink
      document={<OfferLetterPDF address={address} letterText={letterText} generatedAt={generatedAt} />}
      fileName={filename}
    >
      {({ loading }) => (
        <Button className="gap-2 bg-accent-primary hover:bg-accent-primary/90 text-white">
          <Download size={14} />
          {loading ? 'Preparing...' : 'Download as PDF'}
        </Button>
      )}
    </PDFDownloadLink>
  )
}
