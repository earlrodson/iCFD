import { create } from 'zustand'

interface DrawerStore {
  open: boolean
  openDrawer: () => void
  closeDrawer: () => void
}

export const useDrawerStore = create<DrawerStore>((set) => ({
  open: false,
  openDrawer: () => set({ open: true }),
  closeDrawer: () => set({ open: false }),
}))
