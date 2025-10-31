import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Image, Text, LayoutChangeEvent, ViewStyle } from 'react-native';
import {
  AnimationDriver,
  CardData,
  CardLayout,
  CardState,
  DeckState,
  calculateDeckBounds,
  resolveCardBackAsset,
  useDeck
} from '@deck/core';
import { CardView, CARD_HEIGHT, CARD_WIDTH } from './CardView';
import { ReanimatedDriver } from './drivers/ReanimatedDriver';
import { RN_DECK_VERSION } from './version';
import { CardAnimationTarget, CardRenderProps, DeckViewProps } from './types';

/**
 * REFACTORED DeckView - Architecture Simplifiée
 * 
 * Principe: Single Source of Truth
 * - DeckView gère TOUT le responsive
 * - Dimensions de base constantes (CARD_WIDTH/HEIGHT)
 * - Scale unique calculé pour fit
 * - Pas de double responsabilité avec App.tsx
 */

// Dimensions de base constantes - DOIVENT correspondre aux constantes de CardView
// Le core calcule les positions relatives à ces dimensions
const BASE_CARD_WIDTH = CARD_WIDTH;   // 160px
const BASE_CARD_HEIGHT = CARD_HEIGHT; // 240px

// Padding interne fixe pour éviter que les cartes touchent les bords du container
const LAYOUT_PADDING = 16; // px

// Marge de sécurité pour compenser les arrondis et les rotations de cartes
const SAFETY_MARGIN = 8; // px

export const DeckView: React.FC<DeckViewProps> = ({
  cards,
  driver,
  selectedIds,
  onSelectCard,
  onDrawCard,
  onFlipCard,
  onDeckStateChange,
  renderCardFace,
  renderCardBack,
  drawLimit,
  defaultBackAsset,
  autoFan = false,
  style,
  onDeckReady,
  debugLogs,
  containerSize: containerSizeProp
}) => {
  const [internalContainerSize, setInternalContainerSize] = useState<{ width: number; height: number }>({ 
    width: 0, 
    height: 0 
  });

  // Container size (externe ou interne)
  const effectiveContainerSize = containerSizeProp ?? internalContainerSize;
  const containerWidth = effectiveContainerSize.width;
  const containerHeight = effectiveContainerSize.height;

  // Espace intérieur disponible (après padding)
  const innerWidth = Math.max(0, containerWidth - LAYOUT_PADDING * 2);
  const innerHeight = Math.max(0, containerHeight - LAYOUT_PADDING * 2);

  // Calcul des paramètres de layout ADAPTATIFS au container
  // CRITIQUE: Ces valeurs sont calculées pour que le layout rentre dans le container
  // AVANT même que le core génère les positions. Cela évite les débordements.
  const layoutParams = useMemo(() => {
    if (innerWidth <= 0 || innerHeight <= 0 || cards.length === 0) {
      // Valeurs par défaut si pas de container ou pas de cartes
      return { 
        fanRadius: 240, 
        ringRadius: 260, 
        fanOrigin: { x: 0, y: 144 }, // 0.6 × 240
        fanSpread: Math.PI  // 180°
      };
    }

    // Espace effectif disponible avec safety margins pour rotation
    const effectiveInnerWidth = innerWidth - SAFETY_MARGIN * 2;
    const effectiveInnerHeight = innerHeight - SAFETY_MARGIN * 2;

    // Calcul adaptatif de fanRadius
    // Pour un fan à 180°, la largeur max ≈ 2 × fanRadius + largeur_carte
    // On veut : 2 × fanRadius + BASE_CARD_WIDTH ≤ effectiveInnerWidth
    const maxFanRadiusByWidth = (effectiveInnerWidth - BASE_CARD_WIDTH) / 2;
    
    // Aussi limiter par la hauteur (60% de la hauteur disponible)
    const maxFanRadiusByHeight = effectiveInnerHeight * 0.6;
    
    // Prendre le minimum pour garantir que le fan rentre
    const fanRadius = Math.max(
      60,  // Minimum raisonnable
      Math.min(maxFanRadiusByWidth, maxFanRadiusByHeight, 240)  // Max 240 comme fallback
    );
    
    // Point d'origine : légèrement au-dessus du centre vertical
    const fanOriginY = fanRadius * 0.6;
    const fanSpread = Math.PI;  // 180° - angle standard pour éventail

    // Calcul adaptatif de ringRadius
    // Pour n cartes, circonférence = 2π × radius
    // Espace par carte ≈ circonférence / n
    // Pour éviter chevauchement : espace_par_carte ≥ diagonale_carte
    // Donc : (2π × radius) / n ≥ diagonale_carte
    // Donc : radius ≥ (n × diagonale_carte) / (2π)
    const cardDiagonal = Math.sqrt(BASE_CARD_WIDTH ** 2 + BASE_CARD_HEIGHT ** 2);
    const minRadiusForNoOverlap = (cards.length * cardDiagonal) / (2 * Math.PI);
    
    // Aussi : radius ne peut pas dépasser la moitié de la dimension minimale
    // Moins la moitié de la diagonale pour laisser de l'espace
    const maxRingRadius = Math.min(effectiveInnerWidth, effectiveInnerHeight) / 2 - cardDiagonal / 2;
    
    // Calculer ringRadius : max entre minimum pour non-chevauchant et contraintes
    let ringRadius = Math.max(minRadiusForNoOverlap, 60);  // Minimum 60px
    
    // Si le ringRadius minimum est impossible (trop grand), utiliser fitScale plus tard
    if (ringRadius > maxRingRadius && maxRingRadius > 0) {
      // Utiliser le maximum possible, le fitScale compensera
      ringRadius = maxRingRadius;
    } else if (maxRingRadius <= 0 || ringRadius > maxRingRadius) {
      // Sur très petit écran avec beaucoup de cartes, utiliser minimum
      ringRadius = Math.max(60, Math.min(effectiveInnerWidth, effectiveInnerHeight) / 2 - 20);
    }
    
    if (__DEV__ && debugLogs) {
      console.log('[DeckView] layoutParams adaptive', {
        innerWidth,
        innerHeight,
        effectiveInnerWidth,
        effectiveInnerHeight,
        cardCount: cards.length,
        fanRadius,
        ringRadius,
        cardDiagonal,
        minRadiusForNoOverlap,
        maxRingRadius
      });
    }
    
    return {
      fanRadius,
      ringRadius,
      fanOrigin: { x: 0, y: fanOriginY },
      fanSpread
    };
  }, [innerWidth, innerHeight, cards.length, debugLogs]);

  const animationDriver: AnimationDriver = useMemo(
    () => driver ?? new ReanimatedDriver(),
    [driver]
  );

  const deckHook = useDeck(cards, animationDriver, {
    drawLimit,
    defaultBackAsset,
    ringRadius: layoutParams.ringRadius,
    fanRadius: layoutParams.fanRadius,
    fanAngle: layoutParams.fanSpread
  });

  const { deck, fan, ring, shuffle, resetStack, flip, selectCard, drawCard, animateTo } = deckHook;
  const [prefetchedBackAssets, setPrefetchedBackAssets] = useState<Record<string, boolean>>({});
  const lastFannedLengthRef = useRef<number | null>(null);

  // Sanity check
  useEffect(() => {
    if (!__DEV__ || !debugLogs) return;
    console.log('[DeckView:REFACTORED] version=%s', RN_DECK_VERSION);
    console.log('[DeckView:REFACTORED] layoutParams', layoutParams);
  }, [debugLogs, layoutParams]);

  // Auto-fan
  useEffect(() => {
    if (!autoFan) {
      if (__DEV__ && debugLogs) {
        console.log('[DeckView:REFACTORED] autoFan disabled');
      }
      return;
    }
    if (deck.layoutMode === 'ring') {
      if (__DEV__ && debugLogs) {
        console.log('[DeckView:REFACTORED] autoFan skipped (ring mode)');
      }
      return;
    }
    if (lastFannedLengthRef.current === deck.cards.length) {
      if (__DEV__ && debugLogs) {
        console.log('[DeckView:REFACTORED] autoFan skipped (already fanned)');
      }
      return;
    }
    if (__DEV__ && debugLogs) {
      console.log('[DeckView:REFACTORED] autoFan executing', { 
        cardCount: deck.cards.length, 
        layoutMode: deck.layoutMode 
      });
    }
    lastFannedLengthRef.current = deck.cards.length;
    void fan();
  }, [autoFan, deck.cards.length, deck.layoutMode, fan, debugLogs]);

  useEffect(() => {
    if (onDeckReady) {
      const wrappedAnimateTo = async (cardId: string, target: CardAnimationTarget) => {
        await animateTo(cardId, target);
      };
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

  // ÉTAPE 1: Calcul des bounds NON-SCALÉS (avec dimensions de base)
  const unscaledBounds = useMemo(
    () => {
      if (__DEV__ && debugLogs) {
        const firstCardId = deck.cards[0]?.id;
        const firstCardPos = firstCardId ? deck.positions[firstCardId] : null;
        console.log('[DeckView:REFACTORED] calculating bounds', {
          cardCount: deck.cards.length,
          layoutMode: deck.layoutMode,
          hasPositions: Object.keys(deck.positions).length > 0,
          firstCardPos: firstCardPos ? `(${firstCardPos.x.toFixed(1)}, ${firstCardPos.y.toFixed(1)})` : 'null'
        });
      }
      return calculateDeckBounds(deck.cards, deck.positions, {
        width: BASE_CARD_WIDTH,
        height: BASE_CARD_HEIGHT
      });
    },
    [deck.cards, deck.positions, deck.layoutMode, debugLogs]
  );

  // ÉTAPE 2: Calcul du SCALE unique pour fit dans l'espace disponible
  // Note: Même avec des paramètres adaptatifs, on peut avoir besoin d'un scale supplémentaire
  // pour les cas limites (petit écran, beaucoup de cartes, rotations)
  const fitScale = useMemo(() => {
    if (unscaledBounds.width === 0 || unscaledBounds.height === 0 || innerWidth <= 0 || innerHeight <= 0) {
      return 1;
    }

    // Utiliser l'espace effectif avec safety margins pour garantir que rien ne dépasse
    const effectiveInnerWidth = innerWidth - SAFETY_MARGIN * 2;
    const effectiveInnerHeight = innerHeight - SAFETY_MARGIN * 2;

    // Si les bounds sont déjà plus petits que l'espace disponible, pas besoin de scale
    if (unscaledBounds.width <= effectiveInnerWidth && unscaledBounds.height <= effectiveInnerHeight) {
      return 1;
    }

    const scaleX = effectiveInnerWidth / unscaledBounds.width;
    const scaleY = effectiveInnerHeight / unscaledBounds.height;
    
    // Prendre le plus petit scale pour garantir que tout fit, et ne jamais agrandir (max 1)
    const scale = Math.min(scaleX, scaleY, 1);
    
    // Bornes de sécurité : minimum 0.1 pour éviter layouts invalides
    const finalScale = Math.max(0.1, Math.min(scale, 1));
    
    if (__DEV__ && debugLogs && finalScale < 1) {
      console.log('[DeckView] fitScale applied', {
        unscaledBounds: { w: unscaledBounds.width, h: unscaledBounds.height },
        effectiveInner: { w: effectiveInnerWidth, h: effectiveInnerHeight },
        scaleX,
        scaleY,
        finalScale
      });
    }
    
    return finalScale;
  }, [unscaledBounds, innerWidth, innerHeight, debugLogs]);

  // ÉTAPE 3: Application du scale aux POSITIONS
  // Note: Rotation n'est PAS scalée (correct), seul x/y sont scalés
  const scaledPositions = useMemo(() => {
    const result: Record<string, CardLayout> = {};
    deck.cards.forEach((card) => {
      const position = deck.positions[card.id];
      if (!position) return;
      
      // Arrondir à 2 décimales pour éviter les décalages d'arrondi
      result[card.id] = {
        ...position,
        x: Math.round(position.x * fitScale * 100) / 100,
        y: Math.round(position.y * fitScale * 100) / 100,
        rotation: position.rotation,  // Rotation NON scalée (correct)
        scale: (position.scale ?? 1) * fitScale  // Scale composite si présent
      };
    });
    return result;
  }, [deck.cards, deck.positions, fitScale]);

  // ÉTAPE 4: Application du scale aux DIMENSIONS
  const scaledCardDimensions = useMemo(
    () => ({
      width: BASE_CARD_WIDTH * fitScale,
      height: BASE_CARD_HEIGHT * fitScale
    }),
    [fitScale]
  );

  // ÉTAPE 5: Calcul des bounds SCALÉS (pour le centrage)
  const scaledBounds = useMemo(
    () => {
      const bounds = calculateDeckBounds(deck.cards, scaledPositions, scaledCardDimensions);
      
      // Validation en DEV
      if (__DEV__ && debugLogs) {
        const effectiveInnerWidth = innerWidth - SAFETY_MARGIN * 2;
        const effectiveInnerHeight = innerHeight - SAFETY_MARGIN * 2;
        
        // Valider que les bounds scalés rentrent dans l'espace disponible
        if (bounds.width > effectiveInnerWidth || bounds.height > effectiveInnerHeight) {
          console.warn('[DeckView] scaledBounds still exceed container!', {
            scaledBounds: { w: bounds.width, h: bounds.height },
            effectiveInner: { w: effectiveInnerWidth, h: effectiveInnerHeight },
            overflow: {
              w: bounds.width - effectiveInnerWidth,
              h: bounds.height - effectiveInnerHeight
            },
            layoutMode: deck.layoutMode
          });
        }
        
        // Valider cohérence du scaling
        const expectedWidth = unscaledBounds.width * fitScale;
        const expectedHeight = unscaledBounds.height * fitScale;
        const widthRatio = bounds.width / expectedWidth;
        const heightRatio = bounds.height / expectedHeight;
        
        if (Math.abs(widthRatio - 1) > 0.1 || Math.abs(heightRatio - 1) > 0.1) {
          console.warn('[DeckView] Scale inconsistency detected', {
            expected: { w: expectedWidth, h: expectedHeight },
            actual: { w: bounds.width, h: bounds.height },
            ratio: { w: widthRatio, h: heightRatio },
            fitScale
          });
        }
      }
      
      return bounds;
    },
    [deck.cards, scaledPositions, scaledCardDimensions, innerWidth, innerHeight, unscaledBounds, fitScale, deck.layoutMode, debugLogs]
  );

  // ÉTAPE 6: Calcul du CENTRAGE
  const deckTransform = useMemo(() => {
    if (containerWidth <= 0 || containerHeight <= 0) {
      return {
        translateX: 0,
        translateY: 0,
        anchorLeft: 0,
        anchorTop: 0
      };
    }

    // Point d'ancrage: centre exact du conteneur
    // IMPORTANT: On utilise containerWidth/Height (pas innerWidth/Height) car le point d'ancrage
    // doit être au centre du container visible, pas de l'espace interne
    const anchorLeft = containerWidth / 2;
    const anchorTop = containerHeight / 2;

    // Translation pour centrer le deck
    // STRATÉGIE : Utiliser la MOYENNE DES POSITIONS (centres des cartes) plutôt que les bounds
    // Car les bounds peuvent être visuellement trompeurs à cause des rotations
    // Les positions moyennes représentent mieux le "centre de masse visuel"
    
    const positionsArray = deck.cards
      .map(card => scaledPositions[card.id])
      .filter((pos): pos is CardLayout => pos !== undefined);
    
    let translateX = 0;
    let translateY = 0;
    
    if (positionsArray.length > 0) {
      // Moyenne des centres des cartes (centres réels, pas bounds)
      const avgX = positionsArray.reduce((sum, pos) => sum + pos.x, 0) / positionsArray.length;
      const avgY = positionsArray.reduce((sum, pos) => sum + pos.y, 0) / positionsArray.length;
      
      // Centrer sur la moyenne des positions (plus fiable visuellement)
      translateX = -avgX;
      translateY = -avgY;
      
      // Vérifier aussi les bounds pour comparaison
      const boundsSumX = scaledBounds.minX + scaledBounds.maxX;
      const boundsSumY = scaledBounds.minY + scaledBounds.maxY;
      const boundsOffsetX = Math.abs(boundsSumX);
      const boundsOffsetY = Math.abs(boundsSumY);
      
      // Si les bounds ne sont pas symétriques ET que la différence est significative,
      // faire un compromis entre avgCenter et boundsCenter
      if ((deck.layoutMode === 'fan' || deck.layoutMode === 'ring') && boundsOffsetX > 2) {
        // Les bounds ne sont pas symétriques, ajuster légèrement
        const boundsAdjustmentX = boundsSumX / 2;
        translateX -= boundsAdjustmentX;
        
        if (__DEV__ && debugLogs) {
          console.log('[DeckView] Adjusting for bounds asymmetry', {
            avgX,
            boundsSumX,
            boundsAdjustmentX,
            finalTranslateX: translateX
          });
        }
      }
      
      if ((deck.layoutMode === 'fan' || deck.layoutMode === 'ring') && boundsOffsetY > 2) {
        const boundsAdjustmentY = boundsSumY / 2;
        translateY -= boundsAdjustmentY;
      }
    } else {
      // Fallback si pas de positions
      translateX = -scaledBounds.centerX;
      translateY = -scaledBounds.centerY;
    }
    
    if (__DEV__ && debugLogs) {
      const avgX = positionsArray.length > 0 
        ? positionsArray.reduce((sum, pos) => sum + pos.x, 0) / positionsArray.length 
        : 0;
      const avgY = positionsArray.length > 0
        ? positionsArray.reduce((sum, pos) => sum + pos.y, 0) / positionsArray.length
        : 0;
      
      console.log('[DeckView] CENTERING DEBUG', {
        layoutMode: deck.layoutMode,
        cardCount: positionsArray.length,
        // Moyenne des positions (utilisée pour centrage)
        avgCenter: { 
          x: avgX.toFixed(2), 
          y: avgY.toFixed(2) 
        },
        // Centre des bounds (pour comparaison)
        boundsCenter: { 
          x: scaledBounds.centerX.toFixed(2), 
          y: scaledBounds.centerY.toFixed(2) 
        },
        // Différence
        diff: {
          x: (avgX - scaledBounds.centerX).toFixed(2),
          y: (avgY - scaledBounds.centerY).toFixed(2)
        },
        // Symétrie des bounds
        boundsSymmetry: {
          minX: scaledBounds.minX.toFixed(2),
          maxX: scaledBounds.maxX.toFixed(2),
          sumX: (scaledBounds.minX + scaledBounds.maxX).toFixed(2),
          minY: scaledBounds.minY.toFixed(2),
          maxY: scaledBounds.maxY.toFixed(2),
          sumY: (scaledBounds.minY + scaledBounds.maxY).toFixed(2)
        },
        // Translation appliquée
        translate: { 
          x: translateX.toFixed(2), 
          y: translateY.toFixed(2) 
        },
        // Container info
        container: {
          width: containerWidth,
          height: containerHeight,
          center: { x: anchorLeft, y: anchorTop }
        }
      });
    }
    
    // Après translation, vérifier la symétrie effective (post-translation)
    const postMinX = scaledBounds.minX + translateX;
    const postMaxX = scaledBounds.maxX + translateX;
    const postMinY = scaledBounds.minY + translateY;
    const postMaxY = scaledBounds.maxY + translateY;
    const postHorizontalDiff = Math.abs(postMinX) - Math.abs(postMaxX);
    const postVerticalDiff = Math.abs(postMinY) - Math.abs(postMaxY);
    
    if (Math.abs(postHorizontalDiff) > 0.5) {
      translateX += postHorizontalDiff / 2;
      if (__DEV__ && debugLogs) {
        console.log('[DeckView] Post-translation horizontal correction applied', {
          postMinX,
          postMaxX,
          postHorizontalDiff,
          correction: postHorizontalDiff / 2,
          newTranslateX: translateX
        });
      }
    }
    
    if (Math.abs(postVerticalDiff) > 0.5) {
      translateY += postVerticalDiff / 2;
      if (__DEV__ && debugLogs) {
        console.log('[DeckView] Post-translation vertical correction applied', {
          postMinY,
          postMaxY,
          postVerticalDiff,
          correction: postVerticalDiff / 2,
          newTranslateY: translateY
        });
      }
    }
    
    // Arrondir à 1 décimale pour éviter micro-décalages
    translateX = Math.round(translateX * 10) / 10;
    translateY = Math.round(translateY * 10) / 10;
    
    if (__DEV__ && debugLogs) {
      console.log('[DeckView] Final translate applied', {
        translateX: translateX.toFixed(2),
        translateY: translateY.toFixed(2),
        anchor: { x: anchorLeft, y: anchorTop }
      });
    }
    
    // Validation que le centrage est correct
    // Après translation, le centre du bounds devrait être à (0, 0) dans le système relatif
    // ce qui correspond à (anchorLeft, anchorTop) dans le container
    if (__DEV__ && debugLogs) {
      // Calculer si le deck est bien centré après translation
      const expectedCenterX = anchorLeft; // Dans container
      const expectedCenterY = anchorTop;
      console.log('[DeckView] centering debug', {
        anchor: { x: anchorLeft, y: anchorTop },
        boundsCenter: { x: scaledBounds.centerX, y: scaledBounds.centerY },
        translate: { x: translateX, y: translateY },
        boundsSize: { w: scaledBounds.width, h: scaledBounds.height },
        boundsMin: { x: scaledBounds.minX, y: scaledBounds.minY },
        boundsMax: { x: scaledBounds.maxX, y: scaledBounds.maxY }
      });
    }

    if (__DEV__ && debugLogs) {
      console.log('[DeckView:REFACTORED] container', { containerWidth, containerHeight });
      console.log('[DeckView:REFACTORED] inner', { innerWidth, innerHeight, padding: LAYOUT_PADDING });
      console.log('[DeckView:REFACTORED] unscaledBounds', { 
        w: unscaledBounds.width, 
        h: unscaledBounds.height 
      });
      console.log('[DeckView:REFACTORED] scale', { fitScale });
      console.log('[DeckView:REFACTORED] scaledBounds', { 
        w: scaledBounds.width, 
        h: scaledBounds.height,
        cx: scaledBounds.centerX,
        cy: scaledBounds.centerY
      });
      console.log('[DeckView:REFACTORED] transform', { 
        anchorLeft, 
        anchorTop, 
        translateX, 
        translateY 
      });
      console.log('[DeckView:REFACTORED] cardDimensions', scaledCardDimensions);
    }

    return {
      translateX,
      translateY,
      anchorLeft,
      anchorTop
    };
  }, [containerWidth, containerHeight, innerWidth, innerHeight, scaledBounds, unscaledBounds, fitScale, scaledCardDimensions, debugLogs]);

  // Transform style pour le wrapper des cartes
  const deckContentTransformStyle = useMemo<ViewStyle>(() => {
    const style = {
      transform: [
        { translateX: deckTransform.translateX },
        { translateY: deckTransform.translateY }
      ]
    };
    
    if (__DEV__ && debugLogs) {
      console.log('[DeckView] Transform style applied', {
        translateX: deckTransform.translateX,
        translateY: deckTransform.translateY,
        anchor: { x: deckTransform.anchorLeft, y: deckTransform.anchorTop },
        layoutMode: deck.layoutMode
      });
    }
    
    return style;
  }, [deckTransform, deck.layoutMode, debugLogs]);

  // Handle container layout
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (containerSizeProp) {
        if (__DEV__ && debugLogs) {
          const { width, height } = event.nativeEvent.layout;
          console.log('[DeckView:REFACTORED] onLayout (ignored, external size)', { width, height });
        }
        return;
      }

      const { width, height } = event.nativeEvent.layout;
      setInternalContainerSize((prev) => {
        if (prev.width === width && prev.height === height) {
          return prev;
        }
        if (__DEV__ && debugLogs) {
          console.log('[DeckView:REFACTORED] onLayout', { width, height });
        }
        return { width, height };
      });
    },
    [debugLogs, containerSizeProp]
  );

  // Prefetch card backs
  useEffect(() => {
    deck.cards.forEach((card) => {
      const asset = resolveCardBackAsset(
        card,
        { defaultBackAsset: deck.config.defaultBackAsset },
        { defaultAsset: defaultBackAsset }
      );
      if (typeof asset === 'string' && prefetchedBackAssets[asset] !== true) {
        Image.prefetch(asset)
          .then(() => {
            setPrefetchedBackAssets((prev) => {
              if (prev[asset] === true) return prev;
              return { ...prev, [asset]: true };
            });
          })
          .catch(() => {
            setPrefetchedBackAssets((prev) => {
              if (prev[asset] === false) return prev;
              return { ...prev, [asset]: false };
            });
          });
      }
    });
  }, [deck.cards, deck.config.defaultBackAsset, defaultBackAsset, prefetchedBackAssets]);

  const fallbackRenderBack = useCallback(
    ({ state, data }: CardRenderProps) => {
      const asset = resolveCardBackAsset(
        state,
        { defaultBackAsset: deck.config.defaultBackAsset },
        { defaultAsset: defaultBackAsset }
      );
      return (
        <CardBackArtwork
          asset={asset}
          label={data.name ?? 'Card back'}
          fallbackInitial={data.name?.[0]?.toUpperCase() ?? '🂠'}
          isAssetPreloaded={typeof asset === 'string' ? prefetchedBackAssets[asset] === true : undefined}
        />
      );
    },
    [deck.config.defaultBackAsset, defaultBackAsset, prefetchedBackAssets]
  );

  const effectiveRenderBack = renderCardBack ?? fallbackRenderBack;

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      {/* Canvas absolu qui remplit le conteneur */}
      <View style={styles.deckCanvas}>
        {/* Point d'ancrage au centre du conteneur */}
        {/* IMPORTANT: Le View d'ancrage doit avoir une taille pour que le transform fonctionne correctement */}
        <View
          style={[
            styles.centerAnchor,
            {
              left: deckTransform.anchorLeft,
              top: deckTransform.anchorTop,
              width: 0,
              height: 0
            }
          ]}
        >
          {/* Content wrapper avec translation vers origine */}
          {/* Le transform translateX/Y est appliqué ici pour centrer le deck */}
          <View style={deckContentTransformStyle}>
            {deck.cards.map((card) => (
              <CardView
                key={card.id}
                state={card}
                layout={scaledPositions[card.id] as CardLayout}
                isSelected={selectedIds ? selectedIds.includes(card.id) : card.selected}
                driver={animationDriver instanceof ReanimatedDriver ? animationDriver : undefined}
                cardDimensions={scaledCardDimensions}
                onFlip={async () => {
                  await flip(card.id);
                  onFlipCard?.(card.id, !card.faceUp);
                }}
                onSelect={async () => {
                  const drawn = await drawCard(card.id);
                  if (drawn) {
                    onSelectCard?.(card.id, true);
                    onDrawCard?.(drawn as CardState);
                  }
                }}
                renderFace={renderCardFace}
                renderBack={effectiveRenderBack}
                debugLogs={debugLogs}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%'
  },
  deckCanvas: {
    ...StyleSheet.absoluteFillObject
  },
  centerAnchor: {
    position: 'absolute'
  },
  cardBackWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111'
  },
  cardBackImage: {
    width: '100%',
    height: '100%'
  },
  cardBackOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    backgroundColor: 'rgba(9, 13, 24, 0.35)'
  },
  cardBackHighlight: {
    position: 'absolute',
    top: '12%',
    left: '12%',
    right: '12%',
    bottom: '38%',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 12,
    opacity: 0.6
  },
  cardBackPlaceholder: {
    backgroundColor: '#1f2937'
  },
  cardBackPlaceholderContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardBackInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc'
  }
});

interface CardBackArtworkProps {
  asset?: string | number;
  label: string;
  fallbackInitial: string;
  isAssetPreloaded?: boolean;
}

const CardBackArtwork: React.FC<CardBackArtworkProps> = ({ 
  asset, 
  label, 
  fallbackInitial, 
  isAssetPreloaded 
}) => {
  const hasAsset = asset !== undefined && asset !== null;
  const isLocalAsset = typeof asset === 'number';
  const [isLoaded, setIsLoaded] = useState(isLocalAsset || (isAssetPreloaded ?? !hasAsset));
  
  const imageSource = useMemo(() => {
    if (typeof asset === 'number') return asset;
    if (typeof asset === 'string') return { uri: asset };
    return undefined;
  }, [asset]);

  useEffect(() => {
    if (isAssetPreloaded) setIsLoaded(true);
  }, [isAssetPreloaded]);

  useEffect(() => {
    setIsLoaded(isLocalAsset || (isAssetPreloaded ?? !hasAsset));
  }, [hasAsset, isAssetPreloaded, isLocalAsset]);

  return (
    <View style={[styles.cardBackWrapper, !hasAsset && styles.cardBackPlaceholder]}>
      {imageSource ? (
        <Image
          source={imageSource}
          style={[styles.cardBackImage, { opacity: isLoaded ? 1 : 0 }]}
          resizeMode="cover"
          onLoadEnd={() => setIsLoaded(true)}
          accessible
          accessibilityLabel={`${label} card back`}
        />
      ) : null}

      {(!isLoaded || !hasAsset) && (
        <View style={styles.cardBackPlaceholderContent} pointerEvents="none">
          <Text style={styles.cardBackInitial}>{fallbackInitial}</Text>
        </View>
      )}

      <View style={[styles.cardBackOverlay, { opacity: isLoaded ? 1 : 0 }]} pointerEvents="none" />
      <View style={[styles.cardBackHighlight, { opacity: isLoaded ? 1 : 0.8 }]} pointerEvents="none" />
    </View>
  );
};

