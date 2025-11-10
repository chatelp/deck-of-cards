import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimationDriver,
  CardLayout,
  CardState,
  DeckState,
  calculateDeckBounds,
  resolveCardBackAsset,
  useDeck,
  computeFanLayout
} from '@deck/core';
import { CardView, CARD_HEIGHT, CARD_WIDTH } from './CardView';
import { CardAnimationTarget, CardRenderProps, DeckViewProps } from './types';
import { WebMotionDriver } from './drivers/WebMotionDriver';

const BOUNDARY_PADDING = 24;

export const DeckView: React.FC<DeckViewProps> = ({
  cards,
  driver,
  selectedIds,
  onSelectCard,
  onDrawCard,
  onFlipCard,
  onDeckStateChange,
  drawLimit,
  renderCardFace,
  renderCardBack,
  defaultBackAsset,
  ringRadius,
  autoFan = false,
  onDeckReady,
  className
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const animationDriver: AnimationDriver = useMemo(
    () => driver ?? new WebMotionDriver(),
    [driver]
  );
  const deckHook = useDeck(cards, animationDriver, { drawLimit, defaultBackAsset, ringRadius });
  const { deck, fan, ring, shuffle, resetStack, flip, selectCard, drawCard, animateTo } = deckHook;
  const [loadedBackAssets, setLoadedBackAssets] = useState<Record<string, boolean>>({});

  // Initial fan is handled by the next effect on first render (cards.length stable)

  // Re-fan when the number of cards in the deck changes (e.g., draw/remove)
  const lastFannedLengthRef = useRef<number | null>(null);
  useEffect(() => {
    if (!autoFan) {
      return;
    }
    if (deck.layoutMode === 'ring') {
      return;
    }
    if (lastFannedLengthRef.current === deck.cards.length) {
      return;
    }
    lastFannedLengthRef.current = deck.cards.length;
    void fan();
  }, [autoFan, deck.cards.length, deck.layoutMode, fan]);

  useEffect(() => {
    if (onDeckReady) {
      const wrappedAnimateTo = async (cardId: string, target: CardAnimationTarget) => animateTo(cardId, target);
      onDeckReady({
        fan,
        ring,
        shuffle,
        flip,
        animateTo: wrappedAnimateTo,
        selectCard,
        drawCard,
        resetStack
      });
    }
  }, [onDeckReady, fan, ring, shuffle, flip, animateTo, selectCard, drawCard, resetStack]);

  useEffect(() => {
    onDeckStateChange?.(deck);
  }, [deck, onDeckStateChange]);

  useEffect(() => {
    const assetsToLoad = new Set<string>();
    deck.cards.forEach((card) => {
      const asset = resolveCardBackAsset(card, { defaultBackAsset: deck.config.defaultBackAsset }, { defaultAsset: defaultBackAsset });
      if (typeof asset === 'string' && asset && loadedBackAssets[asset] !== true) {
        assetsToLoad.add(asset);
      }
    });

    assetsToLoad.forEach((asset) => {
      const image = new Image();
      image.onload = () => {
        setLoadedBackAssets((prev) => {
          if (prev[asset] === true) {
            return prev;
          }
          return { ...prev, [asset]: true };
        });
      };
      image.onerror = () => {
        setLoadedBackAssets((prev) => {
          if (prev[asset] === false) {
            return prev;
          }
          return { ...prev, [asset]: false };
        });
      };
      image.src = asset;
    });
  }, [deck.cards, deck.config.defaultBackAsset, defaultBackAsset, loadedBackAssets]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof window === 'undefined') {
      return undefined;
    }

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setContainerSize((prev) => {
        if (prev.width === rect.width && prev.height === rect.height) {
          return prev;
        }
        return { width: rect.width, height: rect.height };
      });
    };

    updateSize();

    const globalWindow = window as typeof window & {
      ResizeObserver?: new (...args: any[]) => {
        observe: (target: Element) => void;
        disconnect: () => void;
      };
      addEventListener?: (type: string, listener: () => void) => void;
      removeEventListener?: (type: string, listener: () => void) => void;
    };

    const ResizeObserverCtor = globalWindow.ResizeObserver;
    if (ResizeObserverCtor) {
      const observer = new ResizeObserverCtor((entries: Array<{ target: Element; contentRect: DOMRectReadOnly }>) => {
        entries.forEach((entry) => {
          if (entry.target === element) {
            const { width, height } = entry.contentRect;
            setContainerSize((prev) => {
              if (prev.width === width && prev.height === height) {
                return prev;
              }
              return { width, height };
            });
          }
        });
      });
      observer.observe(element);
      return () => {
        observer.disconnect();
      };
    }

    globalWindow.addEventListener?.('resize', updateSize);
    return () => {
      globalWindow.removeEventListener?.('resize', updateSize);
    };
  }, []);

  const fallbackFanPositions = useMemo(() => {
    if (deck.cards.length === 0) {
      return {};
    }
    return computeFanLayout(deck);
  }, [deck]);

  const effectivePositions = useMemo(() => {
    if (Object.keys(deck.positions).length > 0) {
      return deck.positions;
    }
    return fallbackFanPositions;
  }, [deck.positions, fallbackFanPositions]);

  const deckBounds = useMemo(
    () =>
      calculateDeckBounds(deck.cards, effectivePositions, {
        width: CARD_WIDTH,
        height: CARD_HEIGHT
      }),
    [deck.cards, effectivePositions]
  );

  const deckTransform = useMemo(() => {
    if (deckBounds.width === 0 || deckBounds.height === 0) {
      return { translateX: 0, translateY: 0, scale: 1 };
    }
    const paddedWidth = deckBounds.width + BOUNDARY_PADDING * 2;
    const paddedHeight = deckBounds.height + BOUNDARY_PADDING * 2;
    const { width: availableWidth, height: availableHeight } = containerSize;
    if (availableWidth <= 0 || availableHeight <= 0) {
      return {
        translateX: -deckBounds.centerX,
        translateY: -deckBounds.centerY,
        scale: 1
      };
    }
    const scaleX = availableWidth / paddedWidth;
    const scaleY = availableHeight / paddedHeight;
    const scale = Math.min(1, scaleX, scaleY);
    return {
      translateX: -deckBounds.centerX,
      translateY: -deckBounds.centerY,
      scale: Number.isFinite(scale) && scale > 0 ? scale : 1
    };
  }, [deckBounds, containerSize]);

  const canvasStyle = useMemo<React.CSSProperties>(() => {
    const transforms: string[] = [];
    if (deckTransform.translateX !== 0 || deckTransform.translateY !== 0) {
      transforms.push(`translate3d(${deckTransform.translateX}px, ${deckTransform.translateY}px, 0)`);
    }
    if (deckTransform.scale !== 1) {
      transforms.push(`scale(${deckTransform.scale})`);
    }
    const transform = transforms.length > 0 ? transforms.join(' ') : undefined;
    return {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'auto',
      transformOrigin: '50% 50%',
      transform
    };
  }, [deckTransform]);

  const layout: DeckState['positions'] = effectivePositions;
  const fallbackRenderBack = useCallback(
    ({ state, data }: CardRenderProps) => {
      const asset = resolveCardBackAsset(state, { defaultBackAsset: deck.config.defaultBackAsset }, { defaultAsset: defaultBackAsset });

      return (
        <CardBackArtwork
          asset={asset}
          label={data.name ?? 'Card back'}
          fallbackInitial={data.name?.[0]?.toUpperCase() ?? '🂠'}
          isAssetPreloaded={typeof asset === 'string' ? loadedBackAssets[asset] === true : undefined}
        />
      );
    },
    [deck.config.defaultBackAsset, defaultBackAsset, loadedBackAssets]
  );
  const effectiveRenderBack = renderCardBack ?? fallbackRenderBack;

  return (
    <div ref={containerRef} className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={canvasStyle}>
        {deck.cards.map((card) => {
          const cardLayout = layout[card.id] as CardLayout | undefined;
          if (!cardLayout) {
            return null;
          }
          return (
            <CardView
              key={card.id}
              state={card}
              layout={cardLayout}
              isSelected={selectedIds ? selectedIds.includes(card.id) : card.selected}
              driver={animationDriver instanceof WebMotionDriver ? animationDriver : undefined}
              onFlip={async () => {
                const willBeFaceUp = !card.faceUp;
                try {
                  await flip(card.id);
                  onFlipCard?.(card.id, willBeFaceUp);
                } catch (error) {
                  console.error('[DeckView] flip error', error);
                  throw error;
                }
              }}
              onSelect={async () => {
                try {
                  const drawn = await drawCard(card.id);
                  if (drawn?.card) {
                    onSelectCard?.(card.id, true);
                    onDrawCard?.(drawn.card);
                  }
                } catch (error) {
                  console.error('[DeckView] draw error', error);
                  throw error;
                }
              }}
              renderFace={renderCardFace}
              renderBack={effectiveRenderBack}
            />
          );
        })}
      </div>
    </div>
  );
};

interface CardBackArtworkProps {
  asset?: string | number;
  label: string;
  fallbackInitial: string;
  isAssetPreloaded?: boolean;
}

const CardBackArtwork: React.FC<CardBackArtworkProps> = ({ asset, label, fallbackInitial, isAssetPreloaded }) => {
  const resolvedAsset = typeof asset === 'number' ? undefined : asset;
  const [isLoaded, setIsLoaded] = useState(isAssetPreloaded ?? !resolvedAsset);

  const loaderShadowStyle = useMemo<React.CSSProperties>(
    () => ({
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(140deg, rgba(24,32,52,0.9) 0%, rgba(17,24,39,0.9) 100%)',
      pointerEvents: 'none'
    }),
    []
  );

  const wrapperStyle: React.CSSProperties = useMemo(
    () => ({
      position: 'relative',
      width: '100%',
      height: '100%',
      borderRadius: 12,
      overflow: 'hidden',
      background: 'linear-gradient(140deg, #161e33 0%, #0f172a 35%, #10182c 100%)'
    }),
    []
  );

  useEffect(() => {
    if (isAssetPreloaded) {
      setIsLoaded(true);
    }
  }, [isAssetPreloaded]);

  useEffect(() => {
    setIsLoaded(isAssetPreloaded ?? !resolvedAsset);
  }, [resolvedAsset, isAssetPreloaded]);

  return (
    <div style={wrapperStyle}>
      {resolvedAsset ? (
        <img
          src={resolvedAsset}
          alt={`${label} card back`}
          draggable={false}
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 220ms ease-out'
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f9fafb',
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: 1
          }}
        >
          {fallbackInitial}
        </div>
      )}
      {resolvedAsset && !isLoaded && <div style={loaderShadowStyle} />}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.22) 60%, rgba(0,0,0,0.5) 100%)',
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 220ms ease-out'
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 42% 25%, rgba(255,255,255,0.18), transparent 58%)',
          mixBlendMode: 'soft-light',
          pointerEvents: 'none',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 220ms ease-out'
        }}
      />
    </div>
  );
};
