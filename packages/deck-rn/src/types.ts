import { ReactNode } from 'react';
import {
  AnimationDriver,
  CardData,
  CardLayout,
  CardState,
  CardTransform,
  DeckState,
  FanOptions,
  RingOptions,
  ShuffleOptions
} from '@deck/core';
import { StyleProp, ViewStyle } from 'react-native';

export interface CardRenderProps {
  state: CardState;
  data: CardData;
  layout: CardLayout;
  isSelected: boolean;
}

export type CardAnimationTarget = CardTransform;

export interface CardViewProps {
  state: CardState;
  layout: CardLayout;
  isSelected: boolean;
  style?: StyleProp<ViewStyle>;
  driver?: AnimationDriver;
  cardDimensions?: { width: number; height: number };
  debugLogs?: boolean;
  onFlip?: () => void | Promise<void>;
  onSelect?: () => void | Promise<void>;
  renderFace: (props: CardRenderProps) => ReactNode;
  renderBack: (props: CardRenderProps) => ReactNode;
  isResizing?: boolean;
}

export interface DeckViewActions {
  fan: (options?: FanOptions) => Promise<void>;
  ring: (options?: RingOptions) => Promise<void>;
  shuffle: (options?: ShuffleOptions) => Promise<void>;
  flip: (cardId: string) => Promise<void>;
  animateTo: (cardId: string, target: CardAnimationTarget) => Promise<void>;
  selectCard: (cardId: string) => Promise<boolean | undefined>;
  drawCard: (cardId: string) => Promise<CardState | undefined>;
  resetStack: () => Promise<void>;
}

export interface DeckViewProps {
  // Core data
  cards: CardData[];
  
  // Behavior
  autoFan?: boolean;
  drawLimit?: number;
  
  // Assets
  defaultBackAsset?: string | number;
  
  // Styling
  style?: StyleProp<ViewStyle>;
  
  // Dimension (external container size)
  containerSize?: { width: number; height: number };
  
  // Callbacks
  onSelectCard?: (cardId: string, selected: boolean) => void;
  onDrawCard?: (card: CardState) => void;
  onFlipCard?: (cardId: string, faceUp: boolean) => void;
  onDeckStateChange?: (state: DeckState) => void;
  onDeckReady?: (actions: DeckViewActions) => void;
  
  // Rendering
  renderCardFace: (props: CardRenderProps) => ReactNode;
  renderCardBack?: (props: CardRenderProps) => ReactNode;
  
  // Advanced
  driver?: AnimationDriver;
  selectedIds?: string[];
  debugLogs?: boolean;
}
