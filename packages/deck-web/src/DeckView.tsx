import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimationDriver,
  CardData,
  CardLayout,
  CardState,
  DeckState,
  resolveCardBackAsset,
  useDeck
} from '@deck/core';
import { CardView } from './CardView';
import { CardAnimationTarget, CardRenderProps, DeckViewProps } from './types';
import { WebMotionDriver } from './drivers/WebMotionDriver';

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
  autoFan = false,
  onDeckReady,
  className
}) => {
  const animationDriver: AnimationDriver = useMemo(
    () => driver ?? new WebMotionDriver(),
    [driver]
  );
  const deckHook = useDeck(cards, animationDriver, { drawLimit, defaultBackAsset });
  const { deck, fan, shuffle, resetStack, flip, selectCard, drawCard, animateTo } = deckHook;
  const [loadedBackAssets, setLoadedBackAssets] = useState<Record<string, boolean>>({});

  // Initial fan is handled by the next effect on first render (cards.length stable)

  // Re-fan when the number of cards in the deck changes (e.g., draw/remove)
  const lastFannedLengthRef = useRef<number | null>(null);
  useEffect(() => {
    if (!autoFan) {
      return;
    }
    if (lastFannedLengthRef.current === deck.cards.length) {
      return;
    }
    lastFannedLengthRef.current = deck.cards.length;
    void fan();
  }, [autoFan, deck.cards.length, fan]);

  useEffect(() => {
    if (onDeckReady) {
      const wrappedAnimateTo = async (cardId: string, target: CardAnimationTarget) => {
        await animateTo(cardId, target);
      };
      onDeckReady({
        fan,
        shuffle,
        flip,
        animateTo: wrappedAnimateTo,
        selectCard,
        drawCard,
        resetStack
      });
    }
  }, [onDeckReady, fan, shuffle, flip, animateTo, selectCard, drawCard, resetStack]);

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

  const layout: DeckState['positions'] = deck.positions;
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
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {deck.cards.map((card) => (
        <CardView
          key={card.id}
          state={card}
          layout={layout[card.id] as CardLayout}
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
              if (drawn) {
                onSelectCard?.(card.id, true);
                onDrawCard?.(drawn as CardState);
              }
            } catch (error) {
              console.error('[DeckView] draw error', error);
              throw error;
            }
          }}
          renderFace={renderCardFace}
          renderBack={effectiveRenderBack}
        />
      ))}
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
