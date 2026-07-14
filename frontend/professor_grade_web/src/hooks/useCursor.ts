import { useState, useEffect, useRef } from 'react';

export function useCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [cursorHovered, setCursorHovered] = useState<boolean>(false);
  const [cursorVisible, setCursorVisible] = useState<boolean>(false);

  // Custom transparent cursor tracker follower with inertia/damping
  useEffect(() => {
    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;
    let isMoving = false;
    let animationFrameId: number;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isMoving) {
        setCursorVisible(true);
        isMoving = true;
      }
    };

    const onMouseLeave = () => {
      setCursorVisible(false);
      isMoving = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);

    const updateCursor = () => {
      const dx = mouseX - cursorX;
      const dy = mouseY - cursorY;
      
      // Fluid damping factor (0.15 gives a highly responsive yet smooth trail)
      cursorX += dx * 0.15;
      cursorY += dy * 0.15;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
      }
      animationFrameId = requestAnimationFrame(updateCursor);
    };
    updateCursor();

    // Hover detection for interactive items
    const handleMouseEnter = () => setCursorHovered(true);
    const handleMouseLeave = () => setCursorHovered(false);

    const bindHoverListeners = () => {
      const targets = document.querySelectorAll(
        'button, a, input, select, textarea, [role="button"], .grade-record-card, .filter-pill, .nav-btn, .bottom-nav-btn, .action-btn'
      );
      targets.forEach(el => {
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
        el.addEventListener('mouseenter', handleMouseEnter);
        el.addEventListener('mouseleave', handleMouseLeave);
      });
    };

    bindHoverListeners();

    // Re-bind when DOM updates dynamically to capture newly mounted elements
    const observer = new MutationObserver(() => {
      bindHoverListeners();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
    };
  }, []);

  return { cursorRef, cursorHovered, cursorVisible };
}
