'use client';

import { ButtonHTMLAttributes } from 'react';

export function ConfirmSubmit({ message, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { message: string }) {
  return (
    <button
      {...props}
      onClick={(event) => {
        if (!confirm(message)) {
          event.preventDefault();
        }
      }}
    />
  );
}
