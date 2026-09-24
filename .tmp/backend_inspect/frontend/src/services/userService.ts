import type { ManagedUserForm, ManagedUserListResponse, ManagedUserResponse } from '@/types/userManagement'
import { $api } from '@/utils/api'

export const userService = {
  async list(query?: { q?: string; per_page?: number }) {
    return await $api<ManagedUserListResponse>('users', { query })
  },

  async get(id: string) {
    return await $api<ManagedUserResponse>(`users/${id}`)
  },

  async create(data: ManagedUserForm) {
    return await $api<ManagedUserResponse>('users', { method: 'POST', body: data })
  },

  async update(id: string, data: ManagedUserForm) {
    return await $api<ManagedUserResponse>(`users/${id}`, { method: 'PUT', body: data })
  },
}
