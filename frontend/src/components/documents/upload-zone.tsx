/** UploadZone — dropzone area for uploading document files (PDF, DOCX, PNG, JPG). */

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ACCEPTED_TYPES, MAX_FILE_SIZE } from './constants'

interface UploadZoneProps {
  onUpload: (file: File) => void
  isUploading: boolean
}

export function UploadZone({ onUpload, isUploading }: UploadZoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) onUpload(accepted[0])
    },
    [onUpload],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    disabled: isUploading,
    onDropRejected: (rejections) => {
      const err = rejections[0]?.errors[0]
      if (err?.code === 'file-too-large') toast.error('File too large — max 10 MB')
      else if (err?.code === 'file-invalid-type') toast.error('Unsupported file type')
      else toast.error('Upload failed — please try again')
    },
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
        isDragActive
          ? 'border-accent-primary bg-accent-primary/10'
          : 'border-border-subtle hover:border-border-default',
        isUploading && 'pointer-events-none opacity-60',
      )}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <div className="flex flex-col items-center gap-2 py-2">
          <Loader2 size={20} className="text-accent-primary animate-spin" />
          <p className="text-xs text-text-muted">Uploading...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-2">
          <Upload size={20} className="text-text-muted" />
          <p className="text-xs text-text-secondary">
            {isDragActive ? 'Drop file here' : 'Drag & drop or click to upload'}
          </p>
          <p className="text-[10px] text-text-muted">PDF, DOCX, PNG, JPG — max 10 MB</p>
        </div>
      )}
    </div>
  )
}
