import { Navigate } from 'react-router-dom'

/**
 * Password reset is now handled by Clerk.
 * Redirect to login where Clerk's SignIn component provides "Forgot password?" flow.
 */
export default function ForgotPassword() {
  return <Navigate to="/login" replace />
}
