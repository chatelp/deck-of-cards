import type { AnimationDriver, AnimationSequence, CardId, CardLayout, CardTransform } from '@deck/core';
import { getEasing } from './easings';

interface ActiveAnimation {
  cardId: CardId;
  startTime: number;
  startState: CardLayout;
  target: CardTransform;
  easingFn: (t: number) => number;
  resolve: () => void;
  animationFrameId: number | null;
}

interface RegisteredCard {
  element: HTMLElement;
  offsetX: number;
  offsetY: number;
}

/**
 * Web-compatible animation driver using DOM/CSS and requestAnimationFrame
 * Replaces Reanimated for web platform to avoid React 19 / Next.js 15 conflicts
 * 
 * Features:
 * - Manages a registry of DOM elements (cards)
 * - Handles simple interpolation of layout properties
 * - Supports stagger, delays, and custom easings
 */
export class WebAnimationDriver implements AnimationDriver {
  private cardElements: Map<CardId, RegisteredCard> = new Map();
  private cardStates: Map<CardId, CardLayout> = new Map(); // Track current state of each card
  private activeAnimations: Map<CardId, ActiveAnimation> = new Map();
  private animationFrameId: number | null = null;

  /**
   * Register a DOM element for a card
   * Optionally provide initial layout state (if not provided, will be read from DOM)
   */
  register(
    cardId: CardId,
    element: HTMLElement,
    initialState?: CardLayout,
    options?: { offsetX?: number; offsetY?: number }
  ): void {
    const registered: RegisteredCard = {
      element,
      offsetX: options?.offsetX ?? 0,
      offsetY: options?.offsetY ?? 0
    };
    this.cardElements.set(cardId, registered);
    if (initialState) {
      this.cardStates.set(cardId, initialState);
      this.applyTransform(cardId, initialState);
    } else {
      const currentState = this.getCurrentLayout(cardId);
      this.cardStates.set(cardId, currentState);
    }
  }

  /**
   * Unregister a card's DOM element
   */
  unregister(cardId: CardId): void {
    // Cancel any active animation for this card
    this.cancel([cardId]);
    // Remove the element reference and state
    this.cardElements.delete(cardId);
    this.cardStates.delete(cardId);
  }

  /**
   * Get current layout state from DOM element's computed style
   * Falls back to stored state if parsing fails
   */
  private getCurrentLayout(cardId: CardId): CardLayout {
    const entry = this.cardElements.get(cardId);
    if (!entry) {
      return this.cardStates.get(cardId) ?? { x: 0, y: 0, rotation: 0, scale: 1, zIndex: 0 };
    }
    const { element, offsetX, offsetY } = entry;
    
    // Try to get stored state first
    const storedState = this.cardStates.get(cardId);
    if (storedState) {
      return storedState;
    }
    
    // Parse from DOM
    const style = window.getComputedStyle(element);
    const transform = style.transform || element.style.transform || 'none';
    
    // Default: element is at its natural position (0,0) with scale 1, rotation 0
    let x = 0;
    let y = 0;
    let scale = 1;
    let rotation = 0;
    let zIndex = parseInt(style.zIndex || element.style.zIndex || '0', 10);

    if (transform !== 'none' && transform !== '') {
      // Try to parse individual transform functions first (more reliable)
      const translateMatch = transform.match(/translate3d\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
      const translateMatch2 = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
      const rotateMatch = transform.match(/rotate\(([^)]+)\)/);
      const scaleMatch = transform.match(/scale\(([^)]+)\)/);

      if (translateMatch) {
        x = parseFloat(translateMatch[1].trim().replace('px', ''));
        y = parseFloat(translateMatch[2].trim().replace('px', ''));
      } else if (translateMatch2) {
        x = parseFloat(translateMatch2[1].trim().replace('px', ''));
        y = parseFloat(translateMatch2[2].trim().replace('px', ''));
      }

      if (rotateMatch) {
        const rotValue = rotateMatch[1].trim();
        rotation = parseFloat(rotValue.replace('deg', ''));
      }

      if (scaleMatch) {
        scale = parseFloat(scaleMatch[1].trim());
      }

      // Fallback to matrix parsing if individual functions not found
      if (!translateMatch && !translateMatch2) {
        const matrixMatch = transform.match(/matrix(3d)?\(([^)]+)\)/);
        if (matrixMatch) {
          const values = matrixMatch[2].split(',').map(s => parseFloat(s.trim()));
          if (matrixMatch[1]) { // matrix3d
            x = values[12];
            y = values[13];
            // rotation/scale extraction from matrix is complex, use stored state or defaults
          } else { // matrix
            x = values[4];
            y = values[5];
          }
        }
      }
    }

    // Convert CSS top-left coordinates back to center coordinates
    return {
      x: x + offsetX,
      y: y + offsetY,
      rotation,
      scale,
      zIndex
    };
  }

  /**
   * Apply a layout to a card's DOM element
   */
  private applyTransform(cardId: CardId, layout: CardLayout): void {
    const entry = this.cardElements.get(cardId);
    if (!entry) {
      return;
    }
    const { element, offsetX, offsetY } = entry;

    // Convert center coordinates to CSS top-left coordinates
    const cssX = layout.x - offsetX;
    const cssY = layout.y - offsetY;

    const transformParts: string[] = [];
    transformParts.push(`translate3d(${cssX}px, ${cssY}px, 0)`);
    if (layout.rotation !== 0) {
      transformParts.push(`rotate(${layout.rotation}deg)`);
    }
    if (layout.scale !== 1) {
      transformParts.push(`scale(${layout.scale})`);
    }

    // Preserve existing rotateY (flip) if present in inline style or class
    // We don't want to overwrite the flip animation which is handled by a child element usually,
    // but if the flip was on this element, we would need to be careful.
    // However, in CardView, the flip is on .card-inner, while this driver drives the container <button>
    // So we are safe to overwrite transform on the container.
    
    element.style.transform = transformParts.join(' ');
    
    // Note: zIndex is managed by CardView based on selection/interaction state
    // We only update it if it's explicitly part of the animation target (which usually isn't for zIndex)
    // But for shuffle/reorder, we might want to update it.
    // Let's defer zIndex to the React component mostly, but if layout has it, we sync it?
    // CardView.tsx logic: cardRef.current.style.zIndex = (layout.zIndex ...).toString();
    // So we don't need to set it here, React will update it on render. 
    // BUT during animation, React might not re-render.
    // So we SHOULD update it here for smooth z-index transitions if needed, 
    // or at least set it at the end.
    // For now, let's leave zIndex to React or strict layout updates.
  }

  /**
   * Interpolate between two layouts
   */
  private interpolate(
    start: CardLayout,
    target: CardTransform,
    progress: number,
    easingFn: (t: number) => number
  ): CardLayout {
    const t = easingFn(progress);
    
    return {
      x: start.x + (target.x - start.x) * t,
      y: start.y + (target.y - start.y) * t,
      rotation: start.rotation + (target.rotation - start.rotation) * t,
      scale: start.scale + ((target.scale ?? 1) - start.scale) * t,
      zIndex: target.zIndex ?? start.zIndex
    };
  }

  /**
   * Main animation loop
   */
  private animate(): void {
    const now = performance.now();
    const animationsToComplete: ActiveAnimation[] = [];
    const ids = Array.from(this.activeAnimations.keys()); // Create copy of keys to avoid iteration issues

    for (const cardId of ids) {
      const animation = this.activeAnimations.get(cardId);
      if (!animation) continue;

      const { startTime, startState, target, easingFn, resolve } = animation;
      
      // Calculate progress
      const delay = target.delay ?? 0;
      const duration = target.duration ?? 0;
      const elapsed = now - startTime;
      
      if (elapsed < delay) {
        // Waiting for delay
        continue;
      }

      const timeInAnimation = elapsed - delay;
      let progress = duration > 0 ? timeInAnimation / duration : 1;
      
      if (progress >= 1) {
        progress = 1;
        animationsToComplete.push(animation);
      }

      // Interpolate and apply
      const currentLayout = this.interpolate(startState, target, progress, easingFn);
      
      // Update state
      this.cardStates.set(cardId, currentLayout);
      
      // Apply to DOM
      this.applyTransform(cardId, currentLayout);
    }

    // Complete finished animations
    for (const animation of animationsToComplete) {
      this.activeAnimations.delete(animation.cardId);
      animation.resolve();
    }

    // Continue animation loop if there are active animations
    if (this.activeAnimations.size > 0) {
      this.animationFrameId = requestAnimationFrame(() => this.animate());
    } else {
      this.animationFrameId = null;
    }
  }

  /**
   * Start animation loop if not already running
   */
  private startAnimationLoop(): void {
    if (this.animationFrameId === null) {
      this.animationFrameId = requestAnimationFrame(() => this.animate());
    }
  }

  /**
   * Play an animation sequence
   */
  async play(sequence: AnimationSequence): Promise<void> {
    if (!sequence.steps || sequence.steps.length === 0) {
      return Promise.resolve();
    }

    console.log(`[WebAnimationDriver] Playing sequence with ${sequence.steps.length} steps. Registered cards: ${this.cardElements.size}`);

    // Cancel any existing animations for cards in this sequence
    const cardIds = sequence.steps.map(step => step.cardId);
    this.cancel(cardIds);

    // Create promises for each animation step
    const promises: Promise<void>[] = [];
    let registeredCount = 0;

    for (const step of sequence.steps) {
      const entry = this.cardElements.get(step.cardId);
      if (!entry) {
        // Card not registered, skip
        console.warn(`[WebAnimationDriver] Card ${step.cardId} not registered, skipping animation`);
        continue;
      }
      registeredCount++;

      // Get current state
      const startState = this.getCurrentLayout(step.cardId);
      
      // Get easing function
      const easingFn = getEasing(step.target.easing || 'linear');

      // Create promise that resolves when animation completes
      let resolve: () => void;
      const promise = new Promise<void>((res) => {
        resolve = res;
      });

      // Create animation state
      const animation: ActiveAnimation = {
        cardId: step.cardId,
        startTime: performance.now(),
        startState,
        target: step.target,
        easingFn,
        resolve: resolve!,
        animationFrameId: null
      };

      this.activeAnimations.set(step.cardId, animation);
      promises.push(promise);
    }

    console.log(`[WebAnimationDriver] Started ${registeredCount} animations.`);

    // Start animation loop
    this.startAnimationLoop();

    // Wait for all animations to complete
    // Note: stagger is handled by individual delays in the sequence steps
    await Promise.all(promises);
  }

  /**
   * Cancel active animations
   */
  cancel(cardIds?: CardId[]): void {
    if (cardIds) {
      // Cancel specific cards
      for (const cardId of cardIds) {
        const animation = this.activeAnimations.get(cardId);
        if (animation) {
          this.activeAnimations.delete(cardId);
          // Resolve promise to prevent hanging
          animation.resolve();
        }
      }
    } else {
      // Cancel all animations
      for (const animation of this.activeAnimations.values()) {
        animation.resolve();
      }
      this.activeAnimations.clear();
    }

    // Stop animation loop if no animations remain
    if (this.activeAnimations.size === 0 && this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
