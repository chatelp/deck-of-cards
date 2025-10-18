import { CardState, ResolvedDeckStateConfig } from './models';

export interface ResolveCardBackAssetOptions {
  defaultAsset?: string;
}

/**
 * Resolve the appropriate back asset for a given card.
 * - Prefer the card's own `data.backAsset`
 * - Then fallback to the deck config's `defaultBackAsset`
 * - Finally fallback to an optional caller-supplied asset
 */
export function resolveCardBackAsset(
  card: CardState,
  config?: Pick<ResolvedDeckStateConfig, 'defaultBackAsset'>,
  options?: ResolveCardBackAssetOptions
): string | undefined {
  const candidate = card.data?.backAsset;
  if (candidate && candidate.trim().length > 0) {
    return candidate;
  }

  const configAsset = config?.defaultBackAsset;
  if (configAsset && configAsset.trim().length > 0) {
    return configAsset;
  }

  const optionAsset = options?.defaultAsset;
  if (optionAsset && optionAsset.trim().length > 0) {
    return optionAsset;
  }

  return undefined;
}
