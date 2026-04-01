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
        'border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors',
        isDragActive
          ? 'border-[#8B7AFF]/40 bg-[#8B7AFF]/[0.04]'
          : 'border-white/[0.08] bg-[#131210] hover:border-white/[0.12] hover:bg-white/[0.02]',
        isUploading && 'pointer-events-none opacity-60',
      )}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <div className="flex flex-col items-center gap-2 py-2">
          <Loader2 size={20} className="text-[#8B7AFF] animate-spin" />
          <p className="text-xs text-[#A09D98]">Uploading...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-2">
          <Upload size={20} className="text-[#5C5A56]" />
          <p className="text-xs text-[#A09D98]">
            {isDragActive ? 'Drop file here' : 'Drag & drop or click to upload'}
          </p>
          <p className="text-[10px] text-[#5C5A56]">PDF, DOCX, PNG, JPG — max 10 MB</p>
        </div>
      )}
    </div>
  )
}
