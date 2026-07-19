import React, { useEffect, useRef } from 'react';

export default function NodeGridCanvas({ isSuccess = false }) {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Number of nodes (fewer on mobile to prevent clutter)
    const count = width < 600 ? 14 : 20;
    const nodes = [];

    // Generate random nodes across canvas
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * (width - 100) + 50,
        y: Math.random() * (height - 100) + 50,
        radius: Math.random() * 2 + 3.5,
        // Stagger activation time: 0 to 2.2 seconds
        activateTime: prefersReducedMotion ? 0 : (i / count) * 2200,
        active: prefersReducedMotion,
        alpha: prefersReducedMotion ? 0.8 : 0.2,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    const startTime = Date.now();
    const connectionDist = width < 600 ? 140 : 210;

    function render() {
      const elapsed = Date.now() - startTime;
      ctx.clearRect(0, 0, width, height);

      // Primary accent color: bright lime green #9BFF4D
      const limeHex = '#9BFF4D';
      const activeColor = limeHex;

      // Update node states
      nodes.forEach((node) => {
        if (!prefersReducedMotion) {
          if (elapsed >= node.activateTime) {
            node.active = true;
            // Ramp alpha up
            if (node.alpha < 0.85) {
              node.alpha += 0.035;
            }
          }
        }
      });

      // Draw connecting lines between active nearby nodes
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];

          if ((n1.active && n2.active) || isSuccess) {
            const dx = n1.x - n2.x;
            const dy = n1.y - n2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < connectionDist) {
              const lineAlpha = (1 - dist / connectionDist) * 0.4 * (isSuccess ? 1.6 : Math.min(n1.alpha, n2.alpha));
              ctx.beginPath();
              ctx.moveTo(n1.x, n1.y);
              ctx.lineTo(n2.x, n2.y);
              ctx.strokeStyle = isSuccess
                ? `rgba(155, 255, 77, ${lineAlpha})`
                : `rgba(155, 255, 77, ${lineAlpha})`;
              ctx.lineWidth = isSuccess ? 2 : 1;
              ctx.stroke();
            }
          }
        }
      }

      // Draw nodes
      nodes.forEach((node) => {
        let alpha = node.alpha;

        // Add subtle idle pulse once active
        if (node.active && !isSuccess && elapsed > 2500 && !prefersReducedMotion) {
          const pulse = Math.sin((elapsed / 1000) * 2 + node.pulseOffset) * 0.15;
          alpha = Math.max(0.25, Math.min(1, alpha + pulse));
        }

        if (isSuccess) alpha = 1;

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = activeColor;
        ctx.globalAlpha = alpha;
        ctx.fill();

        // Node glow aura
        if (node.active || isSuccess) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius * 2.4, 0, Math.PI * 2);
          ctx.fillStyle = activeColor;
          ctx.globalAlpha = alpha * 0.3;
          ctx.fill();
        }

        ctx.globalAlpha = 1.0;
      });

      animationFrameRef.current = requestAnimationFrame(render);
    }

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSuccess]);

  return <canvas ref={canvasRef} className="node-grid-canvas" />;
}
