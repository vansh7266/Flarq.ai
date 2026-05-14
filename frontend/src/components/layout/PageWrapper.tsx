import { motion } from 'framer-motion'
import { type ReactNode } from 'react'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'

interface PageWrapperProps {
  children: ReactNode
  withSidebar?: boolean
}

export function PageWrapper({ children, withSidebar = true }: PageWrapperProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <div className="flex flex-1">
        {withSidebar ? <Sidebar /> : null}
        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex-1 px-4 py-8"
        >
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </motion.main>
      </div>
    </div>
  )
}
