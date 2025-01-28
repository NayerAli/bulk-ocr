import { create } from 'zustand'
import type { FileType } from '@/lib/types'

interface UploadState {
  files: UploadFile[]
  isUploading: boolean
  progress: number
  error: string | null
}

interface UploadFile {
  id: string
  file: File
  progress: number
  error?: string
  status: 'pending' | 'uploading' | 'success' | 'error'
}

interface UploadStore extends UploadState {
  addFiles: (files: File[]) => void
  removeFile: (id: string) => void
  updateFileProgress: (id: string, progress: number) => void
  setFileError: (id: string, error: string) => void
  setFileStatus: (id: string, status: UploadFile['status']) => void
  reset: () => void
}

const initialState: UploadState = {
  files: [],
  isUploading: false,
  progress: 0,
  error: null
}

export const useUploadStore = create<UploadStore>((set, get) => ({
  ...initialState,

  addFiles: (files) => {
    const newFiles = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: 'pending' as const
    }))

    set(state => ({
      files: [...state.files, ...newFiles],
      error: null
    }))
  },

  removeFile: (id) => {
    set(state => ({
      files: state.files.filter(f => f.id !== id)
    }))
  },

  updateFileProgress: (id, progress) => {
    set(state => ({
      files: state.files.map(f => 
        f.id === id ? { ...f, progress } : f
      ),
      progress: state.files.reduce((acc, f) => acc + f.progress, 0) / state.files.length
    }))
  },

  setFileError: (id, error) => {
    set(state => ({
      files: state.files.map(f =>
        f.id === id ? { ...f, error, status: 'error' } : f
      ),
      error: `Failed to upload ${state.files.find(f => f.id === id)?.file.name}: ${error}`
    }))
  },

  setFileStatus: (id, status) => {
    set(state => ({
      files: state.files.map(f =>
        f.id === id ? { ...f, status } : f
      )
    }))
  },

  reset: () => {
    set(initialState)
  }
})) 