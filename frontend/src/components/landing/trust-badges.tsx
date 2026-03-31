/** TrustBadges — trust signal pills with Shield and Lock icons. */

import { Shield, Lock } from 'lucide-react'

export function TrustBadges() {
  return (
    <div className="flex items-center gap-3 flex-wrap justify-center">
      <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
        <Shield size={12} className="text-gray-300" />
        <span>Bank-level encryption</span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
        <Lock size={12} className="text-gray-300" />
        <span>SOC 2 compliant</span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
        <Shield size={12} className="text-gray-300" />
        <span>No credit card required</span>
      </div>
    </div>
  )
}
