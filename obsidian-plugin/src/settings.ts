export interface ShareNoteSettings {
	backendUrl: string;
	copyToClipboard: boolean;
	showNotifications: boolean;
	openInBrowser: boolean;
}

export const DEFAULT_SETTINGS: ShareNoteSettings = {
	backendUrl: 'https://obsidiancomments.serverado.app',
	copyToClipboard: true,
	showNotifications: true,
	openInBrowser: false
};