export class ValidationError extends Error {
  public details: Array<{ field: string; message: string }> | undefined;

  constructor(details: Array<{ field: string; message: string }> | string) {
    if (typeof details === 'string') {
      super(details);
      this.details = undefined;
    } else {
      super('Validation error');
      this.details = details;
    }
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}