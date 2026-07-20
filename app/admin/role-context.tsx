'use client'

import { createContext, useContext } from 'react'

export type AdminRole = 'admin' | 'editor'

export const RoleContext = createContext<AdminRole>('editor')
export const useAdminRole = () => useContext(RoleContext)
