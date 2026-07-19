import React from 'react';

function formatBytes(bytes) {
  const b = Number(bytes);
  if (isNaN(b) || b < 0) return '0.0 B';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function QuotaBar({ usedBytes, quotaBytes }) {
  const used = Number(usedBytes || 0);
  const quota = Number(quotaBytes || 524288000);
  const pct = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;
  const isExceeded = pct > 90;

  return (
    <div className="quota-wrap">
      <div className="quota-meta">
        <div className="quota-numbers mono-text" style={{ fontSize: '1rem' }}>
          <span style={{ fontWeight: 700, color: isExceeded ? 'var(--state-danger)' : 'var(--accent-lime)' }}>
            {formatBytes(used)}
          </span>
          <span style={{ color: 'var(--text-muted)' }}> / {formatBytes(quota)}</span>
        </div>
        <div
          className="quota-percentage mono-text"
          style={{
            fontSize: '0.95rem',
            fontWeight: 700,
            color: isExceeded ? 'var(--state-danger)' : 'var(--accent-lime)',
          }}
        >
          {pct.toFixed(1)}% USED
        </div>
      </div>

      <div className="quota-track-bg">
        <div
          className={`quota-bar-fill ${isExceeded ? 'exceeded' : ''}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      <div
        style={{
          fontSize: '0.85rem', /* 13.6px - crisp legible muted text */
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          marginTop: '0.3rem',
        }}
      >
        {formatBytes(Math.max(0, quota - used))} remaining capacity
      </div>
    </div>
  );
}
