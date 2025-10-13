import { CardState } from './models';

export function shuffleArray(cards: CardState[], seed?: number, iterations = 3): CardState[] {
  let result = [...cards];
  let random = seededRandom(seed ?? Date.now());

  for (let i = 0; i < iterations; i += 1) {
    result = fisherYates(result, random);
    random = seededRandom(random() * Number.MAX_SAFE_INTEGER);
  }

  return result;
}

function fisherYates<T>(array: T[], random: () => number): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function seededRandom(seed: number): () => number {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}
