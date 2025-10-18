import { CardState, ResolvedDeckStateConfig } from './models';

export interface ResolveCardBackAssetOptions {
  defaultAsset?: string | number;
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
): string | number | undefined {
  const candidate = card.data?.backAsset;
  if (isValidAsset(candidate)) {
    return candidate;
  }

  const configAsset = config?.defaultBackAsset;
  if (isValidAsset(configAsset)) {
    return configAsset;
  }

  const optionAsset = options?.defaultAsset;
  if (isValidAsset(optionAsset)) {
    return optionAsset;
  }

  return undefined;
}

function isValidAsset(value: string | number | undefined): value is string | number {
  if (typeof value === 'number') {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return false;
}
