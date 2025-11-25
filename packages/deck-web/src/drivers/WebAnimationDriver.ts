import type { AnimationDriver, AnimationSequence, CardId, CardLayout, CardTransform } from '@deck/core';
import { getEasing } from './easings';

/**
 * Internal state for an active animation
 */
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
 * WebAnimationDriver implements AnimationDriver using DOM/CSS and requestAnimationFrame
 * 
 * This driver:
 * - Registers DOM elements for each card
 * - Animates cards using CSS transforms (translate, rotate, scale)
 * - Uses requestAnimationFrame for smooth 60fps animations
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
          const values = matrixMatch[2].split(',').map(v => parseFloat(v.trim()));
          if (values.length >= 6) {
            // matrix(a, b, c, d, e, f)
            // e = translateX, f = translateY
            x = values[4] || 0;
            y = values[5] || 0;
            // Calculate scale and rotation from matrix values
            const a = values[0];
            const b = values[1];
            scale = Math.sqrt(a * a + b * b);
            rotation = Math.atan2(b, a) * (180 / Math.PI);
          }
        }
      }
    }

    const state = { x: x + offsetX, y: y + offsetY, scale, rotation, zIndex };
    // Cache the parsed state
    this.cardStates.set(cardId, state);
    return state;
  }

  /**
   * Apply transform to DOM element
   * Preserves rotateY if it exists (for card flip)
   */
  private applyTransform(cardId: CardId, layout: CardLayout): void {
    const entry = this.cardElements.get(cardId);
    if (!entry) {
      return;
    }
    const { element, offsetX, offsetY } = entry;
    const { x, y, rotation, scale } = layout;
    
    // Check if element has rotateY in current transform (for flip)
    const currentTransform = element.style.transform || '';
    let rotateY = '';
    if (currentTransform) {
      const rotateYMatch = currentTransform.match(/rotateY\([^)]+\)/);
      if (rotateYMatch) {
        rotateY = rotateYMatch[0];
      }
    }
    
    // Build transform string
    const transforms: string[] = [];
    const translateX = x - offsetX;
    const translateY = y - offsetY;
    if (translateX !== 0 || translateY !== 0) {
      transforms.push(`translate3d(${translateX}px, ${translateY}px, 0)`);
    }
    if (rotation !== 0) {
      transforms.push(`rotate(${rotation}deg)`);
    }
    if (scale !== 1) {
      transforms.push(`scale(${scale})`);
    }
    // Preserve rotateY if it exists (for card flip)
    if (rotateY) {
      transforms.push(rotateY);
    }

    element.style.transform = transforms.length > 0 ? transforms.join(' ') : 'none';
  }

  /**
   * Interpolate between start and target states
   */
  private interpolate(
    start: CardLayout,
    target: CardTransform,
    progress: number,
    easingFn: (t: number) => number
  ): CardLayout {
    const eased = easingFn(progress);
    
    return {
      x: start.x + (target.x - start.x) * eased,
      y: start.y + (target.y - start.y) * eased,
      rotation: start.rotation + (target.rotation - start.rotation) * eased,
      scale: start.scale + (target.scale - start.scale) * eased,
      zIndex: target.zIndex // zIndex is not interpolated, set immediately
    };
  }

  /**
   * Animation loop using requestAnimationFrame
   */
  private animate(): void {
    const now = performance.now();
    const animationsToComplete: ActiveAnimation[] = [];

    // Update all active animations
    for (const [cardId, animation] of this.activeAnimations.entries()) {
      const elapsed = now - animation.startTime;
      const delay = animation.target.delay || 0;
      
      // Check if animation should start (delay)
      if (elapsed < delay) {
        continue; // Still waiting for delay
      }

      const adjustedElapsed = elapsed - delay;
      const duration = animation.target.duration || 0;
      const progress = Math.min(adjustedElapsed / duration, 1);

      // Interpolate and apply transform
      const currentLayout = this.interpolate(
        animation.startState,
        animation.target,
        progress,
        animation.easingFn
      );
      this.applyTransform(cardId, currentLayout);
      
      // Update stored state
      this.cardStates.set(cardId, currentLayout);

      // Check if animation is complete
      if (progress >= 1) {
        animationsToComplete.push(animation);
      }
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

    // Cancel any existing animations for cards in this sequence
    const cardIds = sequence.steps.map(step => step.cardId);
    this.cancel(cardIds);

    // Create promises for each animation step
    const promises: Promise<void>[] = [];

    for (const step of sequence.steps) {
      const entry = this.cardElements.get(step.cardId);
      if (!entry) {
        // Card not registered, skip
        console.warn(`[WebAnimationDriver] Card ${step.cardId} not registered, skipping animation`);
        continue;
      }

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
