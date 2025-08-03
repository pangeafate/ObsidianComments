export class ValidationError extends Error {
  public details: Array<{ field: string; message: string }>;

  constructor(details: Array<{ field: string; message: string }>) {
    super('Validation error');
    this.name = 'ValidationError';
    this.details = details;
  }
}