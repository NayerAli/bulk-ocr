import { create } from "zustand"

interface Job {
  id: string
  fileName: string
  totalPages: number
  processedPages: number
  status: "queued" | "processing" | "completed" | "failed"
  progress: number
  error?: string
  createdAt: Date
}

interface QueueStore {
  jobs: Job[]
  activeJobs: number
  addJob: (job: Omit<Job, "progress" | "processedPages">) => void
  updateJob: (id: string, updates: Partial<Job>) => void
  removeJob: (id: string) => void
}

export const useQueue = create<QueueStore>((set) => ({
  jobs: [],
  activeJobs: 0,
  addJob: (job) =>
    set((state) => ({
      jobs: [...state.jobs, { ...job, progress: 0, processedPages: 0 }],
      activeJobs: state.activeJobs + 1,
    })),
  updateJob: (id, updates) =>
    set((state) => ({
      jobs: state.jobs.map((job) => (job.id === id ? { ...job, ...updates } : job)),
      activeJobs:
        updates.status === "completed" || updates.status === "failed" ? state.activeJobs - 1 : state.activeJobs,
    })),
  removeJob: (id) =>
    set((state) => ({
      jobs: state.jobs.filter((job) => job.id !== id),
      activeJobs: state.activeJobs - 1,
    })),
}))

