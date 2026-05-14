import { motion } from 'framer-motion'
import { type ReactNode } from 'react'
import { Navbar } from './Navbar'

interface PageWrapperProps {
  children: ReactNode
  wide?: boolean
}

export function PageWrapper({ children, wide = false }: PageWrapperProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex-1 px-4 py-8 sm:px-6 lg:px-8"
      >
        <div className={wide ? 'mx-auto w-full max-w-[1440px]' : 'mx-auto w-full max-w-7xl'}>
          {children}
        </div>
      </motion.main>
    </div>
  )
}
