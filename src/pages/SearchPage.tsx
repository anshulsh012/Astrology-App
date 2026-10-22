import { Navigate, useSearchParams } from 'react-router-dom'

export function SearchPage() {
  const [params] = useSearchParams()
  const next = params.toString()
  return <Navigate to={next ? `/astrologers?${next}` : '/astrologers'} replace />
}
