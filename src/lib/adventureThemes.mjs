// Themes only change scenery. Route geometry lives once in adventure.mjs.
export const ADVENTURE_THEMES = [
    { id: 'mountain', name: 'Mountain Meadow', destination: 'Meadow lookout', description: 'Fresh air & alpine flowers' },
    { id: 'forest', name: 'Forest Explorer', destination: 'Treetop lookout', description: 'Woodland trails & waterfalls' },
    { id: 'coast', name: 'Coastal Cove', destination: 'Lighthouse lookout', description: 'Ocean blues & palm-lined paths' },
    { id: 'canyon', name: 'Sunset Canyon', destination: 'Sunset lookout', description: 'Golden skies & red-rock trails' },
].map(theme => ({ ...theme, image: `/assets/brand/adventure/${theme.id}-standard-trail.webp`, thumbnail: `/assets/brand/adventure/${theme.id}-standard-thumb.webp` }));
export function getAdventureTheme(id) {
    return ADVENTURE_THEMES.find(theme => theme.id === id) ?? ADVENTURE_THEMES[0];
}
