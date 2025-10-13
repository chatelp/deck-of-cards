import { getHandOrigin } from './state';
export function computeFanLayout(deck, options = {}) {
    const { cards, config } = deck;
    const origin = options.origin ?? { x: 0, y: 0 };
    const spreadAngle = options.spreadAngle ?? config.fanAngle;
    const radius = options.radius ?? config.fanRadius;
    const middle = (cards.length - 1) / 2;
    const layouts = {};
    cards.forEach((card, index) => {
        const angleOffset = (index - middle) * (spreadAngle / Math.max(cards.length - 1, 1));
        const rad = angleOffset;
        const x = origin.x + radius * Math.sin(rad);
        const y = origin.y - radius * (1 - Math.cos(rad));
        layouts[card.id] = {
            x,
            y,
            rotation: (rad * 180) / Math.PI,
            scale: 1,
            zIndex: index
        };
    });
    return layouts;
}
export function computeStackLayout(deck) {
    const { cards } = deck;
    const layouts = {};
    cards.forEach((card, index) => {
        layouts[card.id] = {
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            zIndex: index
        };
    });
    return layouts;
}
export function computeLineLayout(deck, spacing = deck.config.spacing) {
    const { cards } = deck;
    const layouts = {};
    cards.forEach((card, index) => {
        const { x, y } = getHandOrigin(cards.length, index, spacing);
        layouts[card.id] = {
            x,
            y,
            rotation: 0,
            scale: 1,
            zIndex: index
        };
    });
    return layouts;
}
