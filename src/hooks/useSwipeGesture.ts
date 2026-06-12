// useSwipeGesture.ts
// Hook xu ly cu chi vuot (swipe) de mo/dong sidebar tren thiet bi cam ung.
// Vuot phai tu ria trai man hinh: mo sidebar.
// Vuot trai bat ky dau tren man hinh khi sidebar dang mo: dong sidebar.

import { useEffect, useRef } from 'react';

interface SwipeGestureOptions {
  onSwipeRight: () => void; // Goi khi vuot phai (mo sidebar)
  onSwipeLeft: () => void;  // Goi khi vuot trai (dong sidebar)
  isSidebarOpen: boolean;
  // Bien ria trai (px) de bat dau ghi nhan cu chi mo sidebar
  edgeThreshold?: number;
  // Khoang cach ngang toi thieu (px) duoc coi la "vuot"
  minSwipeDistance?: number;
  // Goc lech toi da (do) so voi truc ngang duoc coi la vuot ngang
  maxAngleDegrees?: number;
}

export function useSwipeGesture({
  onSwipeRight,
  onSwipeLeft,
  isSidebarOpen,
  edgeThreshold = 30,
  minSwipeDistance = 60,
  maxAngleDegrees = 35,
}: SwipeGestureOptions): void {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isEdgeSwipe = useRef(false);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      // Chi ghi nhan cu chi mo sidebar neu bat dau tu ria trai
      isEdgeSwipe.current = touch.clientX <= edgeThreshold;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      // Tinh goc lech de loai tru cu chi vuot doc (cuon trang)
      const angleRad = Math.atan2(Math.abs(deltaY), Math.abs(deltaX));
      const angleDeg = (angleRad * 180) / Math.PI;

      touchStartX.current = null;
      touchStartY.current = null;

      // Neu goc lech qua lon (vuot doc) thi bo qua
      if (angleDeg > maxAngleDegrees) return;

      const absX = Math.abs(deltaX);
      if (absX < minSwipeDistance) return;

      if (deltaX > 0 && isEdgeSwipe.current && !isSidebarOpen) {
        // Vuot phai tu ria trai: mo sidebar
        onSwipeRight();
      } else if (deltaX < 0 && isSidebarOpen) {
        // Vuot trai: dong sidebar
        onSwipeLeft();
      }
    };

    // Su dung passive: true de khong anh huong den hieu nang cuon trang
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isSidebarOpen, onSwipeRight, onSwipeLeft, edgeThreshold, minSwipeDistance, maxAngleDegrees]);
}
