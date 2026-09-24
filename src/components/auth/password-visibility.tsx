"use client";

import { useEffect, type ReactNode } from 'react';

type Props = { children: ReactNode };

/**
 * Añade un control Mostrar/Ocultar sin reparentar inputs administrados por React.
 * Reparentar nodos DOM que React creó puede provocar NotFoundError/removeChild
 * durante la navegación o desmontaje de la página de autenticación.
 */
export function PasswordVisibility({ children }: Props) {
  useEffect(() => {
    const root = document.querySelector('.fleetease-password-visibility-root');
    if (!root) return;

    const enhance = () => {
      root.querySelectorAll<HTMLInputElement>(
        'input[type="password"], input[data-password-field="true"]'
      ).forEach((input) => {
        if (input.dataset.visibilityReady === 'true') return;

        const parent = input.parentElement;
        if (!parent) return;

        input.dataset.visibilityReady = 'true';
        parent.classList.add('relative');

        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.fleeteasePasswordToggle = 'true';
        button.className =
          'absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-md px-2 py-1 text-xs font-semibold text-white/45 hover:text-[#d7ff3f] transition-colors';
        button.setAttribute('aria-label', 'Mostrar contraseña');
        button.textContent = 'Mostrar';

        const sync = () => {
          const visible = input.type === 'text';
          button.textContent = visible ? 'Ocultar' : 'Mostrar';
          button.setAttribute(
            'aria-label',
            visible ? 'Ocultar contraseña' : 'Mostrar contraseña'
          );
        };

        const handleClick = () => {
          input.type = input.type === 'password' ? 'text' : 'password';
          sync();
          input.focus();
        };

        button.addEventListener('click', handleClick);
        parent.appendChild(button);
        input.classList.add('pr-20');
        sync();
      });
    };

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      root.querySelectorAll<HTMLElement>('[data-fleetease-password-toggle="true"]').forEach((button) => {
        button.remove();
      });
    };
  }, []);

  return <div className="fleetease-password-visibility-root">{children}</div>;
}
