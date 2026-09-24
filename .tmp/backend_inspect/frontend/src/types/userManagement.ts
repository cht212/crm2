export interface ManagedUser {
  id: string
  name: string
  email: string
  phone: string | null
  customer_id: number | null
  is_active: boolean
  customer?: {
    id: number
    company_name: string
  }
  roles?: Array<{ id: number; name: string }>
}

export interface ManagedUserForm {
  name: string
  email: string
  phone: string
  customer_id: number | null
  role: string
  is_active: boolean
  password: string
  password_confirmation: string
}

export interface ManagedUserResponse {
  user: ManagedUser
}

export interface ManagedUserListResponse {
  users: {
    data: ManagedUser[]
    total: number
    current_page: number
    per_page: number
  }
}
