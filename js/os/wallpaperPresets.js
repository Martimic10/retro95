export const WALLPAPER_PRESETS = [
    { id: 'teal', name: 'Teal', color: '#008080' },
    { id: 'classic', name: 'Classic Teal', color: '#0a7f7f' },
    { id: 'navy', name: 'Navy', color: '#001f5c' },
    { id: 'slate', name: 'Slate', color: '#4e5d6c' },
    { id: 'charcoal', name: 'Charcoal', color: '#3b3b3b' },
    { id: 'forest', name: 'Forest', color: '#1f5a39' },
    { id: 'olive', name: 'Olive', color: '#556b2f' },
    { id: 'plum', name: 'Plum', color: '#5d4a66' },
    { id: 'maroon', name: 'Maroon', color: '#6b2d2d' },
    { id: 'steel', name: 'Steel Blue', color: '#3f6f98' },
    { id: 'indigo', name: 'Indigo', color: '#3f3f8f' },
    { id: 'moss', name: 'Moss', color: '#4d664d' }
];

export function getPresetById(id) {
    return WALLPAPER_PRESETS.find((preset) => preset.id === id) || WALLPAPER_PRESETS[0];
}
