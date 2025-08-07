export interface ShareNoteData {
	title: string;
	content: string;
	htmlContent?: string;
}

export interface ShareNoteResponse {
	shareId: string;
	viewUrl: string;
	editUrl: string;
	title: string;
}

export class BackendAPI {
	private baseUrl: string;

	constructor(baseUrl: string) {
		this.baseUrl = baseUrl;
	}

	async shareNote(data: ShareNoteData): Promise<ShareNoteResponse> {
		try {
			const response = await fetch(`${this.baseUrl}/api/notes/share`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data)
			});

			if (!response || !response.ok) {
				const errorData = response ? await response.json().catch(() => ({})) : {};
				throw new Error(errorData.message || `HTTP ${response?.status || 'unknown'}: ${response?.statusText || 'Network error'}`);
			}

			const result = await response.json();

			// Validate response format
			if (!result.shareId || !result.viewUrl) {
				throw new Error('Invalid response from backend');
			}

			return result;
		} catch (error) {
			// Re-throw with proper error message
			throw error;
		}
	}

	async deleteShare(shareId: string): Promise<void> {
		const response = await fetch(`${this.baseUrl}/api/notes/${shareId}`, {
			method: 'DELETE'
		});

		if (!response || !response.ok) {
			throw new Error(`Failed to delete: ${response?.statusText || 'Network error'}`);
		}
	}
}