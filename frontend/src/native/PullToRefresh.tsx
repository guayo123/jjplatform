import { useRef, useState, type ReactNode } from 'react';
import { getPlatformInfo } from './usePlatform';
import { tapLight } from './haptics';

interface Props {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
}

const THRESHOLD = 70; // px the user must pull before a refresh triggers
const MAX_PULL = 110;

/**
 * Lightweight touch pull-to-refresh for the native app. Only active when the
 * scroll container is at the top. On web it renders children unchanged.
 */
export default function PullToRefresh({ onRefresh, children }: Props) {
  const native = getPlatformInfo().isNative;
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  if (!native) return <>{children}</>;

  const onTouchStart = (e: React.TouchEvent) => {
    if (refreshing) return;
    // Only engage when scrolled to the very top.
    if (window.scrollY > 0 || document.documentElement.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current == null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) {
      setPull(0);
      return;
    }
    // Dampen the drag for a rubber-band feel.
    setPull(Math.min(MAX_PULL, delta * 0.5));
  };

  const onTouchEnd = async () => {
    if (startY.current == null) return;
    const shouldRefresh = pull >= THRESHOLD;
    startY.current = null;
    if (shouldRefresh && !refreshing) {
      setRefreshing(true);
      void tapLight();
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  };

  const indicatorHeight = refreshing ? 44 : pull;

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-150"
        style={{ height: indicatorHeight }}
      >
        <div
          className={`w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full ${refreshing ? 'animate-spin' : ''}`}
          style={{ opacity: indicatorHeight > 8 ? 1 : 0, transform: `rotate(${pull * 3}deg)` }}
        />
      </div>
      {children}
    </div>
  );
}
