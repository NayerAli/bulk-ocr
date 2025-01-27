import { create } from "zustand"
import type { ProcessingJob } from "../types/settings"
import { ProcessingWorker } from "../services/processing-worker"

interface ProcessingStore {
  worker: ProcessingWorker
  jobs: ProcessingJob[]
  activeJobs: number
  addJob: (job: ProcessingJob) => void
  updateJob: (jobId: string, updates: Partial<ProcessingJob>) => void
  removeJob: (jobId: string) => void
}

export const useProcessingStore = create<ProcessingStore>((set, get) => ({
  worker: new ProcessingWorker(),
  jobs: [],
  activeJobs: 0,

  addJob: (job) => {
    set((state) => ({
      jobs: [...state.jobs, job],
      activeJobs: state.activeJobs + 1,
    }))
    get().worker.addJob(job)
  },

  updateJob: (jobId, updates) => {
    set((state) => ({
      jobs: state.jobs.map((job) => (job.id === jobId ? { ...job, ...updates } : job)),
      activeJobs:
        updates.status === "completed" || updates.status === "failed" ? state.activeJobs - 1 : state.activeJobs,
    }))
  },

  removeJob: (jobId) => {
    set((state) => ({
      jobs: state.jobs.filter((job) => job.id !== jobId),
      activeJobs: state.activeJobs - 1,
    }))
  },
}))

