import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

type OrientationType = 'portrait' | 'landscape';

interface OrientationInfo {
  type: OrientationType;
  angle: 0 | 90 | 180 | 270;
}

interface Size {
  width: number;
  height: number;
}

export interface OrientationManagerConfig {
  /**
   * Temps (ms) pendant lequel on attend la stabilisation des dimensions avant de valider la rotation.
   */
  settleDelay?: number;
  /**
   * Tolérance (px) pour ignorer les variations insignifiantes de dimensions.
   */
  threshold?: number;
}

export interface OrientationManagerState {
  orientation: OrientationInfo;
  stableDimensions: Size;
  pendingDimensions: Size | null;
  isTransitioning: boolean;
  transitionId: number;
  /**
   * Enregistre une nouvelle mesure de dimensions (ex: onLayout, Dimensions change, props).
   */
  observe: (dimensions: Size, source?: string) => void;
}

const DEFAULT_SETTLE_DELAY = 240;
const DEFAULT_THRESHOLD = 0.75;

const computeOrientation = (width: number, height: number): OrientationInfo => {
  if (width === 0 && height === 0) {
    return { type: 'portrait', angle: 0 };
  }
  if (width === height) {
    // Carré: garder la dernière orientation connue (par défaut portrait).
    return { type: height >= width ? 'portrait' : 'landscape', angle: 0 };
  }

  if (width > height) {
    return { type: 'landscape', angle: 90 };
  }
  return { type: 'portrait', angle: 0 };
};

const normalizeSize = (size: Size): Size => {
  return {
    width: Math.max(0, Math.round(size.width * 1000) / 1000),
    height: Math.max(0, Math.round(size.height * 1000) / 1000)
  };
};

export function useOrientationManager(config: OrientationManagerConfig = {}): OrientationManagerState {
  const settleDelay = config.settleDelay ?? DEFAULT_SETTLE_DELAY;
  const threshold = config.threshold ?? DEFAULT_THRESHOLD;

  const initialWindow = Dimensions.get('window');
  const initialNormalized = normalizeSize({ width: initialWindow.width, height: initialWindow.height });

  const [orientation, setOrientation] = useState<OrientationInfo>(() => computeOrientation(initialNormalized.width, initialNormalized.height));
  const [stableDimensions, setStableDimensions] = useState<Size>(() => initialNormalized);
  const [pendingDimensions, setPendingDimensions] = useState<Size | null>(null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [transitionId, setTransitionId] = useState<number>(0);

  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Size | null>(null);
  const stableRef = useRef<Size>(initialNormalized);
  const transitionRef = useRef<boolean>(false);

  useEffect(() => {
    stableRef.current = stableDimensions;
  }, [stableDimensions]);

  useEffect(() => {
    transitionRef.current = isTransitioning;
  }, [isTransitioning]);

  const finalizeTransition = useCallback((finalDimensions: Size) => {
    const normalized = normalizeSize(finalDimensions);
    setStableDimensions(normalized);
    stableRef.current = normalized;
    setOrientation(computeOrientation(normalized.width, normalized.height));
    setPendingDimensions(null);
    pendingRef.current = null;
    setIsTransitioning(false);
    transitionRef.current = false;
    setTransitionId((prev) => prev + 1);
  }, []);

  const observe = useCallback(
    (dimensions: Size, _source: string = 'unknown') => {
      const normalized = normalizeSize(dimensions);
      if (normalized.width <= 0 || normalized.height <= 0) {
        return;
      }

      const currentStable = stableRef.current;
      const diffFromStable = Math.max(
        Math.abs(currentStable.width - normalized.width),
        Math.abs(currentStable.height - normalized.height)
      );

      // Première mesure: adopter immédiatement.
      if (currentStable.width === 0 && currentStable.height === 0 && !transitionRef.current) {
        finalizeTransition(normalized);
        return;
      }

      // Mesure quasiment identique -> pas de transition.
      if (diffFromStable <= threshold && !transitionRef.current) {
        return;
      }

      const currentPending = pendingRef.current;
      const diffFromPending = currentPending
        ? Math.max(
            Math.abs(currentPending.width - normalized.width),
            Math.abs(currentPending.height - normalized.height)
          )
        : Number.POSITIVE_INFINITY;

      if (!currentPending || diffFromPending > threshold / 2) {
        pendingRef.current = normalized;
        setPendingDimensions(normalized);
      }

      if (!transitionRef.current) {
        transitionRef.current = true;
        setIsTransitioning(true);
      }

      if (settleTimeoutRef.current) {
        clearTimeout(settleTimeoutRef.current);
      }

      settleTimeoutRef.current = setTimeout(() => {
        const finalDims = pendingRef.current ?? normalized;
        finalizeTransition(finalDims);
      }, settleDelay);
    },
    [finalizeTransition, settleDelay, threshold]
  );

  useEffect(() => {
    const handleDimensionsChange = ({ window }: { window: ScaledSize }) => {
      observe({ width: window.width, height: window.height }, 'Dimensions');
    };

    const subscription = Dimensions.addEventListener('change', handleDimensionsChange);

    return () => {
      if (typeof subscription?.remove === 'function') {
        subscription.remove();
      } else {
        // Fallback RN < 0.65
        // @ts-expect-error removeEventListener deprecated but kept for backwards compat
        Dimensions.removeEventListener('change', handleDimensionsChange);
      }
    };
  }, [observe]);

  useEffect(() => {
    return () => {
      if (settleTimeoutRef.current) {
        clearTimeout(settleTimeoutRef.current);
      }
      settleTimeoutRef.current = null;
      pendingRef.current = null;
      transitionRef.current = false;
    };
  }, []);

  return useMemo(
    () => ({
      orientation,
      stableDimensions,
      pendingDimensions,
      isTransitioning,
      transitionId,
      observe
    }),
    [orientation, stableDimensions, pendingDimensions, isTransitioning, transitionId, observe]
  );
}









