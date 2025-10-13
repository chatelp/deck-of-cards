const defaultConfig = {
    fanAngle: Math.PI / 2,
    fanRadius: 180,
    spacing: 24,
    seed: Date.now()
};
export function createDeckState(cards, config = {}) {
    const mergedConfig = { ...defaultConfig, ...config };
    const cardStates = cards.map((card) => ({
        id: card.id,
        faceUp: false,
        selected: false,
        draggable: true,
        data: card
    }));
    const positions = {};
    cardStates.forEach((card, index) => {
        positions[card.id] = {
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            zIndex: index
        };
    });
    return {
        cards: cardStates,
        positions,
        config: mergedConfig
    };
}
export function updateCardState(deck, cardId, updater) {
    const cards = deck.cards.map((card) => (card.id === cardId ? { ...card, ...updater } : card));
    return { ...deck, cards };
}
export function updateCardLayout(deck, cardId, layout) {
    const positions = {
        ...deck.positions,
        [cardId]: {
            ...deck.positions[cardId],
            ...layout
        }
    };
    return { ...deck, positions };
}
export function setDeckPositions(deck, positions) {
    return { ...deck, positions };
}
export function setDeckConfig(deck, config) {
    return { ...deck, config: { ...deck.config, ...config } };
}
export function getHandOrigin(size, index, spacing, origin = { x: 0, y: 0 }) {
    const totalWidth = (size - 1) * spacing;
    const startX = origin.x - totalWidth / 2;
    return {
        x: startX + index * spacing,
        y: origin.y
    };
}
