"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useArcadeFullscreen<T extends HTMLElement>() {
  const shellRef = useRef<T>(null);
  const [immersive, setImmersive] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);

  const syncViewport = useCallback(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const viewport = window.visualViewport;
    const height = viewport?.height ?? window.innerHeight;
    const width = viewport?.width ?? window.innerWidth;
    shell.style.setProperty("--game-viewport-height", `${Math.round(height)}px`);
    shell.style.setProperty("--game-viewport-width", `${Math.round(width)}px`);
    shell.style.setProperty("--game-viewport-top", `${Math.round(viewport?.offsetTop ?? 0)}px`);
    shell.style.setProperty("--game-viewport-left", `${Math.round(viewport?.offsetLeft ?? 0)}px`);
  }, []);

  const leaveFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch {}
    }
    setImmersive(false);
    setNativeFullscreen(false);
  }, []);

  const enterFullscreen = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell) return;
    syncViewport();
    // Enter the CSS fallback immediately so the control is reliable even when
    // a browser exposes requestFullscreen() but leaves its promise pending.
    setImmersive(true);
    if (shell.requestFullscreen) {
      try {
        await Promise.race([
          shell.requestFullscreen(),
          new Promise<void>(resolve => window.setTimeout(resolve, 250)),
        ]);
        if (document.fullscreenElement === shell) return;
      } catch {
        // iOS and some embedded browsers only allow media elements fullscreen.
      }
    }
  }, [syncViewport]);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement || shellRef.current?.classList.contains("is-immersive")) await leaveFullscreen();
    else await enterFullscreen();
  }, [enterFullscreen, leaveFullscreen]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const active = document.fullscreenElement === shellRef.current;
      setNativeFullscreen(active);
      if (active) setImmersive(false);
      syncViewport();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && shellRef.current?.classList.contains("is-immersive")) void leaveFullscreen();
    };

    syncViewport();
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("resize", syncViewport);
    window.addEventListener("orientationchange", syncViewport);
    window.addEventListener("keydown", onKeyDown);
    window.visualViewport?.addEventListener("resize", syncViewport);
    window.visualViewport?.addEventListener("scroll", syncViewport);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
      window.removeEventListener("keydown", onKeyDown);
      window.visualViewport?.removeEventListener("resize", syncViewport);
      window.visualViewport?.removeEventListener("scroll", syncViewport);
      document.documentElement.classList.remove("arcade-immersive-active");
    };
  }, [leaveFullscreen, syncViewport]);

  useEffect(() => {
    document.documentElement.classList.toggle("arcade-immersive-active", immersive || nativeFullscreen);
    syncViewport();
    return () => document.documentElement.classList.remove("arcade-immersive-active");
  }, [immersive, nativeFullscreen, syncViewport]);

  return { shellRef, immersive, fullscreenActive: immersive || nativeFullscreen, toggleFullscreen };
}
