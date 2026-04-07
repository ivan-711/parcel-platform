import { Navigate } from 'react-router-dom'

/**
 * Password reset is now handled by Clerk.
 * Redirect to login where Clerk's SignIn component provides the reset flow.
 */
export default function ResetPassword() {
  return <Navigate to="/login" replace />
}
