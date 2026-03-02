/** Shared constants and animation presets for the documents page. */

export const ACCEPTED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024

export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { duration: 0.2 },
}
