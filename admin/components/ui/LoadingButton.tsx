'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = {
  loading?: boolean;
  children: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export default function LoadingButton({ loading, children, className, disabled, type = 'button', ...rest }: Props) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      className={(className || 'btn-primary') + (loading ? ' is-loading' : '')}
      disabled={isDisabled}
      aria-busy={loading ? true : undefined}
      {...rest}
    >
      {loading && (
        <span className="spinner" aria-hidden="true" />
      )}
      <span className="btn-label">{children}</span>
    </button>
  );
}
