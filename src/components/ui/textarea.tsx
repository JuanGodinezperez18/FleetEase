import * as React from 'react';

import {cn} from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({className, ...props}, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[96px] w-full resize-y rounded-[var(--fe-radius-sm)] border border-[var(--fe-border)] bg-[var(--fe-input-bg)] px-3 py-2.5 text-[14px] text-[var(--fe-text)] shadow-[inset_0_1px_0_rgba(255,255,255,.025)] outline-none transition-[border-color,background-color,box-shadow] duration-[var(--fe-motion-fast)] placeholder:text-[var(--fe-text-muted)] hover:border-[var(--fe-border-strong)] hover:bg-[var(--fe-hover)] focus-visible:border-[var(--fe-lime)] focus-visible:bg-[var(--fe-hover)] focus-visible:ring-2 focus-visible:ring-[var(--fe-focus-ring)] disabled:cursor-not-allowed disabled:opacity-45 md:text-sm',
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
