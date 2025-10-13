import { computeFanLayout, computeStackLayout } from './layout';
import { setDeckPositions, updateCardState } from './state';
import { shuffleArray } from './shuffle';
export function fan(deck) {
    const layouts = computeFanLayout(deck);
    const sequence = {
        steps: Object.entries(layouts).map(([cardId, target]) => ({
            cardId,
            target: { ...target, duration: 400, easing: 'easeOut' }
        }))
    };
    return {
        deck: setDeckPositions(deck, layouts),
        sequence
    };
}
export function stack(deck) {
    const layouts = computeStackLayout(deck);
    const sequence = {
        steps: Object.entries(layouts).map(([cardId, target]) => ({
            cardId,
            target: { ...target, duration: 300, easing: 'easeInOut' }
        }))
    };
    return {
        deck: setDeckPositions(deck, layouts),
        sequence
    };
}
export function shuffle(deck, options = {}) {
    const cards = shuffleArray(deck.cards, options.seed, options.iterations);
    const layouts = computeStackLayout({ ...deck, cards });
    const sequence = {
        steps: cards.map((card, index) => ({
            cardId: card.id,
            target: {
                ...layouts[card.id],
                duration: 500,
                easing: 'spring',
                delay: index * 20
            }
        })),
        stagger: 20
    };
    return {
        deck: {
            ...deck,
            cards,
            positions: layouts
        },
        sequence
    };
}
export function animateTo(deck, cardId, target, options = {}) {
    const { duration = target.duration, easing = target.easing, delay = target.delay } = options;
    return {
        deck,
        sequence: {
            steps: [
                {
                    cardId,
                    target: { ...target, duration, easing, delay }
                }
            ]
        }
    };
}
export function flip(deck, cardId, options = {}) {
    const card = deck.cards.find((c) => c.id === cardId);
    if (!card) {
        return { deck, sequence: { steps: [] } };
    }
    const updatedDeck = updateCardState(deck, cardId, { faceUp: !card.faceUp });
    const sequence = {
        steps: [
            {
                cardId,
                target: {
                    ...deck.positions[cardId],
                    rotation: deck.positions[cardId].rotation,
                    scale: 1,
                    zIndex: deck.positions[cardId].zIndex,
                    duration: options.duration ?? 400,
                    easing: options.easing ?? 'easeInOut'
                }
            }
        ],
        meta: {
            type: 'flip'
        }
    };
    return { deck: updatedDeck, sequence };
}
