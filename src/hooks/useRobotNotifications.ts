// src/hooks/useRobotNotifications.ts
// Browser push notifications for robot events

import { useEffect, useRef, useCallback } from 'react';
import { useAutopilotStore } from '@/store/autopilotStore';
import { toast } from 'sonner';

interface NotificationOptions {
  enabled: boolean;
  onNewPosition?: boolean;
  onPositionClosed?: boolean;
  onKillSwitch?: boolean;
  onFundingCollected?: boolean;
}

const defaultOptions: NotificationOptions = {
  enabled: true,
  onNewPosition: true,
  onPositionClosed: true,
  onKillSwitch: true,
  onFundingCollected: false, // Too noisy by default
};

export function useRobotNotifications(options: Partial<NotificationOptions> = {}) {
  const config = { ...defaultOptions, ...options };
  const { positions, killSwitchActive, killSwitchReason } = useAutopilotStore();
  
  const prevPositionsCount = useRef(positions.length);
  const prevKillSwitch = useRef(killSwitchActive);
  const permissionGranted = useRef(false);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      permissionGranted.current = true;
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      permissionGranted.current = permission === 'granted';
      return permissionGranted.current;
    }

    return false;
  }, []);

  // Send notification
  const notify = useCallback((title: string, body: string, icon?: string) => {
    // Always show toast
    toast(title, { description: body });

    // Try browser notification if permitted
    if (permissionGranted.current && document.hidden) {
      try {
        new Notification(title, {
          body,
          icon: icon || '/favicon.jpg',
          badge: '/favicon.jpg',
          tag: 'robot-notification',
        });
      } catch (e) {
        console.log('Notification failed:', e);
      }
    }
  }, []);

  // Initialize
  useEffect(() => {
    if (config.enabled) {
      requestPermission();
    }
  }, [config.enabled, requestPermission]);

  // Watch for position changes
  useEffect(() => {
    if (!config.enabled) return;

    const openPositions = positions.filter(p => p.status === 'open');
    const currentCount = openPositions.length;

    // New position opened
    if (config.onNewPosition && currentCount > prevPositionsCount.current) {
      const newPosition = openPositions[0]; // Most recent
      if (newPosition) {
        notify(
          '🤖 New Position Opened',
          `${newPosition.symbol}: Long ${newPosition.long_exchange} / Short ${newPosition.short_exchange} (€${newPosition.size_eur})`
        );
      }
    }

    // Position closed
    if (config.onPositionClosed && currentCount < prevPositionsCount.current) {
      const diff = prevPositionsCount.current - currentCount;
      notify(
        '✅ Position Closed',
        `${diff} position${diff > 1 ? 's' : ''} closed`
      );
    }

    prevPositionsCount.current = currentCount;
  }, [positions, config.enabled, config.onNewPosition, config.onPositionClosed, notify]);

  // Watch for kill switch
  useEffect(() => {
    if (!config.enabled || !config.onKillSwitch) return;

    if (killSwitchActive && !prevKillSwitch.current) {
      notify(
        '🚨 Kill Switch Activated',
        killSwitchReason || 'Risk limit reached - all trading paused'
      );
    }

    prevKillSwitch.current = killSwitchActive;
  }, [killSwitchActive, killSwitchReason, config.enabled, config.onKillSwitch, notify]);

  return {
    requestPermission,
    notify,
    isPermissionGranted: permissionGranted.current,
  };
}
