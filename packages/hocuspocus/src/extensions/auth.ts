import { Extension } from '@hocuspocus/server';

export class AuthExtension implements Extension {
  async onAuthenticate(data: any) {
    const token = data.requestParameters.get('token');
    
    // For now, allow all connections
    // In production, validate token and set user context
    if (!token) {
      data.context.user = {
        id: 'anonymous',
        name: 'Anonymous User',
        color: this.generatePastelColor()
      };
    } else {
      // Parse token and set user data
      data.context.user = {
        id: token,
        name: `User ${token.slice(0, 8)}`,
        color: this.generatePastelColor()
      };
    }

    return data;
  }

  private generatePastelColor(): string {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 85%)`;
  }
}