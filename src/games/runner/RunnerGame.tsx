"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function RunnerGame() {
  const shellRef = useRef<HTMLDivElement>(null);
  const [immersive, setImmersive] = useState(false);

  const syncViewportHeight = useCallback(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const viewport = window.visualViewport;
    const height = viewport?.height ?? window.innerHeight;
    const width = viewport?.width ?? window.innerWidth;
    shell.style.setProperty("--runner-viewport-height", `${Math.round(height)}px`);
    shell.style.setProperty("--runner-viewport-width", `${Math.round(width)}px`);
    shell.style.setProperty("--runner-viewport-top", `${Math.round(viewport?.offsetTop ?? 0)}px`);
    shell.style.setProperty("--runner-viewport-left", `${Math.round(viewport?.offsetLeft ?? 0)}px`);
  }, []);

  const postFullscreenState = useCallback((active: boolean) => {
    shellRef.current?.querySelector("iframe")?.contentWindow?.postMessage(
      { type: "pepepow-runner-fullscreen-state", active },
      window.location.origin,
    );
  }, []);

  const leaveFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch {}
    }
    setImmersive(false);
  }, []);

  const enterFullscreen = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell) return;
    syncViewportHeight();
    if (shell.requestFullscreen) {
      try {
        await shell.requestFullscreen();
        return;
      } catch {
        // iOS and some embedded browsers only support fullscreen for media.
      }
    }
    setImmersive(true);
  }, [syncViewportHeight]);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement || immersive) await leaveFullscreen();
    else await enterFullscreen();
  }, [enterFullscreen, immersive, leaveFullscreen]);

  useEffect(() => {
    const onFullscreenChange = () => {
      syncViewportHeight();
      if (document.fullscreenElement) setImmersive(false);
      postFullscreenState(Boolean(document.fullscreenElement));
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== shellRef.current?.querySelector("iframe")?.contentWindow) return;
      if (event.data?.type === "pepepow-runner-fullscreen-toggle") void toggleFullscreen();
      if (event.data?.type === "pepepow-runner-fullscreen-enter") void enterFullscreen();
      if (event.data?.type === "pepepow-runner-fullscreen-exit") void leaveFullscreen();
    };

    syncViewportHeight();
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("resize", syncViewportHeight);
    window.addEventListener("orientationchange", syncViewportHeight);
    window.addEventListener("message", onMessage);
    window.visualViewport?.addEventListener("resize", syncViewportHeight);
    window.visualViewport?.addEventListener("scroll", syncViewportHeight);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("resize", syncViewportHeight);
      window.removeEventListener("orientationchange", syncViewportHeight);
      window.removeEventListener("message", onMessage);
      window.visualViewport?.removeEventListener("resize", syncViewportHeight);
      window.visualViewport?.removeEventListener("scroll", syncViewportHeight);
      document.documentElement.classList.remove("runner-immersive-active");
    };
  }, [enterFullscreen, leaveFullscreen, postFullscreenState, syncViewportHeight, toggleFullscreen]);

  useEffect(() => {
    document.documentElement.classList.toggle("runner-immersive-active", immersive);
    syncViewportHeight();
    postFullscreenState(immersive || Boolean(document.fullscreenElement));
    return () => document.documentElement.classList.remove("runner-immersive-active");
  }, [immersive, postFullscreenState, syncViewportHeight]);

  return (
    <div className={`runner-shell${immersive ? " is-immersive" : ""}`} ref={shellRef}>
      <div className="runner-topbar">
        <div><small>PEPEPOW ARCADE / GAME 01</small><strong>AUTO-SHOOTING RUNNER</strong></div>
        <button type="button" onClick={toggleFullscreen} aria-label="Toggle fullscreen">⛶</button>
      </div>
      <div className="runner-embed">
      <iframe
        src="/games/runner/index.html"
        title="PEPEPOW Auto-Shooting Runner v0.13"
        allow="autoplay; fullscreen"
        allowFullScreen
      />
      </div>
    </div>
  );
}
