import * as React from 'react'
import { cn } from '../../lib/utils'

const Select = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        'h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-500/30 focus-visible:ring-2',
        className
      )}
      {...props}
    />
  )
})
Select.displayName = 'Select'

export { Select }
