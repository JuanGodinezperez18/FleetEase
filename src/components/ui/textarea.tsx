import * as React from 'react';

import {cn} from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({className, ...props}, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[96px] w-full resize-y rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-[14px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.025)] outline-none transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-white/30 hover:border-white/[0.13] hover:bg-white/[0.045] focus-visible:border-[#d7ff3f]/50 focus-visible:bg-white/[0.055] focus-visible:ring-2 focus-visible:ring-[#d7ff3f]/10 disabled:cursor-not-allowed disabled:opacity-45 md:text-sm',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea"

export {Textarea};
