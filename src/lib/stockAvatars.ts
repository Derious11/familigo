export const stockAvatars = ['GoGo', 'Tiko', 'Zippy', 'Luna', 'Buddy'].map(name => ({name, src: `/assets/avatars/${name.toLowerCase()}.png`}));

export async function createStockAvatar(avatar: typeof stockAvatars[number]): Promise<Blob> {
    const response = await fetch(avatar.src);
    if (!response.ok) throw new Error('Could not load this avatar.');
    const blob = await response.blob();
    if (blob.type !== 'image/png') throw new Error('Invalid avatar image.');
    return blob;
}
