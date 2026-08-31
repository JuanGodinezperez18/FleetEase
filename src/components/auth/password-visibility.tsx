"use client";

import { useEffect, type ReactNode } from 'react';

type Props = { children: ReactNode };

/** Añade un control Mostrar/Ocultar a todos los inputs de contraseña del formulario. */
export function PasswordVisibility({ children }: Props) {
  useEffect(() => {
    const root = document.querySelector('.fleetease-password-visibility-root');
    if (!root) return;

    const enhance = () => {
      root.querySelectorAll<HTMLInputElement>('input[type="password"], input[data-password-field="true"]').forEach((input) => {
        if (input.dataset.visibilityReady === 'true') return;
        input.dataset.visibilityReady = 'true';

        const wrapper = document.createElement('div');
        wrapper.className = 'relative';
        input.parentNode?.insertBefore(wrapper, input);
        wrapper.appendChild(input);

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-md px-2 py-1 text-xs font-semibold text-white/45 hover:text-[#d7ff3f] transition-colors';
        button.setAttribute('aria-label', 'Mostrar contraseña');
        button.textContent = 'Mostrar';

        const sync = () => {
          const visible = input.type === 'text';
          button.textContent = visible ? 'Ocultar' : 'Mostrar';
          button.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
        };

        button.addEventListener('click', () => {
          input.type = input.type === 'password' ? 'text' : 'password';
          sync();
          input.focus();
        });

        wrapper.appendChild(button);
        input.classList.add('pr-20');
        sync();
      });
    };

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return <div className="fleetease-password-visibility-root">{children}</div>;
}
