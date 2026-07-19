import React from 'react';

export default function BrandLogo({ size = 32, text = 'minicloud', showText = true, className = '' }) {
  return (
    <div className={`brand-logo ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}>
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
          stroke="var(--accent)"
          strokeWidth="11"
          strokeLinecap="round"
        />
        {/* Top-right short bar */}
        <path
          d="M 56 44 L 74 26"
          stroke="var(--accent)"
          strokeWidth="11"
          strokeLinecap="round"
        />
        {/* Bottom chevron */}
        <path
          d="M 32 76 L 48 60 L 64 76"
          stroke="var(--accent)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showText && (
        <span className="brand-text">
          <span className="brand-text-main">mini</span>
          <span className="brand-text-accent">cloud</span>
        </span>
      )}
    </div>
  );
}
