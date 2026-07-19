import React from 'react';

function formatBytes(bytes) {
  const b = Number(bytes);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function QuotaBar({ usedBytes, quotaBytes }) {
  const used = Number(usedBytes || 0);
  const quota = Number(quotaBytes || 524288000);
  const pct = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;
  const fillClass = pct >= 90 ? 'full' : pct >= 70 ? 'warn' : '';

  return (
    <div className="quota-bar-wrap">
      <div className="quota-labels">
        <span>{formatBytes(used)} used</span>
        <span>{formatBytes(quota)} total</span>
      </div>
      <div className="quota-track">
        <div
          className={`quota-fill ${fillClass}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
        {pct.toFixed(1)}% used · {formatBytes(quota - used)} available
      </div>
    </div>
  );
}
