import { create } from 'zustand'
import type { JobApplication } from '../types/application.types'

interface ApplicationState {
  applications: JobApplication[]
  setApplications: (items: JobApplication[]) => void
}

export const useApplicationStore = create<ApplicationState>((set) => ({
  applications: [],
  setApplications: (items) => {
    set({ applications: items })
  },
}))
