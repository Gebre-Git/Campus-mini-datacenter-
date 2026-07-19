import React from 'react';

export default function BrandLogo({ size = 32, showText = true, className = '' }) {
  return (
    <div
      className={`brand-logo ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Top-left long bar */}
        <path
          d="M 22 58 L 58 22"
          stroke="var(--accent-lime)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Top-right short bar */}
        <path
          d="M 56 44 L 74 26"
          stroke="var(--accent-lime)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Bottom chevron */}
        <path
          d="M 32 76 L 48 60 L 64 76"
          stroke="var(--accent-lime)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showText && (
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '1.35rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.15rem',
          }}
        >
          <span style={{ color: 'var(--text-primary)' }}>MINI</span>
          <span style={{ color: 'var(--accent-lime)' }}>CLOUD</span>
        </span>
      )}
    </div>
  );
}
