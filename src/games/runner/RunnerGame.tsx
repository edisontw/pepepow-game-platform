"use client";

import { useRef } from "react";

export default function RunnerGame() {
  const shellRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = async () => {
    if (!shellRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await shellRef.current.requestFullscreen();
  };

  return (
    <div className="runner-shell" ref={shellRef}>
      <div className="runner-topbar">
        <div><small>PEPEPOW ARCADE / GAME 01</small><strong>AUTO-SHOOTING RUNNER</strong></div>
        <button type="button" onClick={toggleFullscreen} aria-label="Toggle fullscreen">⛶</button>
      </div>
      <div className="runner-embed">
      <iframe
        src="/games/runner/index.html"
        title="PEPEPOW Auto-Shooting Runner v0.7"
        allow="autoplay; fullscreen"
        allowFullScreen
      />
      </div>
    </div>
  );
}
