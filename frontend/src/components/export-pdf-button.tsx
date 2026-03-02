/** Lazy-loadable wrapper around PDFDownloadLink + DealPDF — isolates @react-pdf/renderer behind dynamic import boundary. */

import { PDFDownloadLink } from '@react-pdf/renderer'
import { DealPDF } from '@/components/deal-pdf'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import type { DealResponse } from '@/types'

interface ExportPDFButtonProps {
  deal: DealResponse
  filename: string
}

export default function ExportPDFButton({ deal, filename }: ExportPDFButtonProps) {
  return (
    <PDFDownloadLink document={<DealPDF deal={deal} />} fileName={filename}>
      {({ loading }) => (
        <Button variant="outline" disabled={loading} className="gap-2">
          <Download size={14} />
          {loading ? 'Preparing...' : 'Export PDF'}
        </Button>
      )}
    </PDFDownloadLink>
  )
}
