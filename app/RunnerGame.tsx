"use client";

export default function RunnerGame() {
  return (
    <div className="runner-embed" id="play-game">
      <iframe
        src="/runner/index.html"
        title="PEPEPOW Auto-Shooting Runner v0.3"
        allow="autoplay; fullscreen"
        allowFullScreen
      />
    </div>
  );
}
