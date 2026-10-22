export type AuthRole = 'customer' | 'astrologer' | 'admin'

export type AuthUser = {
  id: number
  email: string
  role: AuthRole
  is_active: boolean
  created_at: string
}

export type AuthArea = '/customer' | '/astrologer' | '/admin'

export type LoginPayload = {
  email: string
  password: string
}

export type RegisterPayload = {
  email: string
  password: string
}
