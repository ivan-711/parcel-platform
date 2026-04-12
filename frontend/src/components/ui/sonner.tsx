import { useEffect, useState } from 'react'
import { Toaster as Sonner } from 'sonner'
import { CircleCheck, Info, TriangleAlert, OctagonX, LoaderCircle } from 'lucide-react'

function useTheme(): 'dark' | 'light' {
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    document.documentElement.classList.contains('light') ? 'light' : 'dark'
  )

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains('light') ? 'light' : 'dark')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return theme
}

function Toaster() {
  const theme = useTheme()

  return (
    <Sonner
      theme={theme}
      position="bottom-right"
      className="toaster group"
      icons={{
        success: <CircleCheck size={18} />,
        info: <Info size={18} />,
        warning: <TriangleAlert size={18} />,
        error: <OctagonX size={18} />,
        loading: <LoaderCircle size={18} className="animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-app-elevated group-[.toaster]:text-text-primary group-[.toaster]:border-border-default group-[.toaster]:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] group-[.toaster]:rounded-lg',
          description: 'group-[.toast]:text-text-secondary',
          actionButton:
            'group-[.toast]:bg-violet-400 group-[.toast]:text-accent-text-on-accent group-[.toast]:rounded-md group-[.toast]:text-xs group-[.toast]:font-medium',
          cancelButton:
            'group-[.toast]:bg-black/[0.04] dark:group-[.toast]:bg-layer-3 group-[.toast]:text-text-secondary group-[.toast]:rounded-md group-[.toast]:text-xs',
          success: 'group-[.toaster]:bg-[rgba(109,190,163,0.06)]',
          error: 'group-[.toaster]:bg-[rgba(212,118,106,0.06)]',
          warning: 'group-[.toaster]:bg-[rgba(212,168,103,0.06)]',
          info: 'group-[.toaster]:bg-[rgba(123,159,204,0.06)]',
        },
      }}
    />
  )
}

export { Toaster }
