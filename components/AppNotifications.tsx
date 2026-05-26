"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";

function playNotificationSound() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextConstructor) {
    return;
  }

  const audioContext = new AudioContextConstructor();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
  gain.gain.setValueAtTime(0.08, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.35);
}

async function requestBrowserNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }

  if (Notification.permission !== "default") {
    return Notification.permission;
  }

  return await Notification.requestPermission();
}

async function showBrowserNotification({
  title,
  body,
  tag,
  href,
}: {
  title: string;
  body: string;
  tag: string;
  href: string;
}) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  const permission = await requestBrowserNotificationPermission();

  if (permission !== "granted") {
    return;
  }

  const notification = new Notification(title, { body, tag });

  notification.onclick = () => {
    window.focus();
    window.location.assign(href);
    notification.close();
  };
}

export function AppNotifications() {
  const pendingSummary = useQuery(api.news.getPendingApprovalSummary);
  const hasInitializedPressApprovals = useRef(false);
  const lastPressApprovalId = useRef<string | null>(null);

  useEffect(() => {
    if (pendingSummary === undefined || pendingSummary === null) {
      return;
    }

    const latest = pendingSummary.latest;
    const latestId = latest?._id ?? null;

    if (!hasInitializedPressApprovals.current) {
      hasInitializedPressApprovals.current = true;
      lastPressApprovalId.current = latestId;

      if (latest) {
        void requestBrowserNotificationPermission();
      }

      return;
    }

    if (!latest || latestId === lastPressApprovalId.current) {
      return;
    }

    lastPressApprovalId.current = latestId;

    const approvalHref = `/press/approvals?_id=${latest._id}`;
    const isOnApprovalPage = window.location.pathname.startsWith("/press/approvals");

    if (!isOnApprovalPage) {
      try {
        playNotificationSound();
      } catch {
        // Browsers may block audio before user interaction.
      }
    }

    void showBrowserNotification({
      title: "Nova notícia para aprovação",
      body: latest.title,
      tag: `press-news-${latest._id}`,
      href: approvalHref,
    });
  }, [pendingSummary]);

  return null;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
