import * as React from 'react'
import { cn } from '../../lib/utils'

const Switch = React.forwardRef(({ checked = false, className, ...props }, ref) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      ref={ref}
      className={cn(
        'h-6 w-12 rounded-full p-1 transition',
        checked ? 'bg-cyan-500' : 'bg-slate-700',
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'block h-4 w-4 rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-0'
        )}
      />
    </button>
  )
})
Switch.displayName = 'Switch'

export { Switch }
