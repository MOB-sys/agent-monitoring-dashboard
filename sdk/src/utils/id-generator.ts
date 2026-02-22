let counter = 0;

export function generateId(prefix: string = 'id'): string {
  counter++;
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}-${counter}`;
}

export function generateTraceId(): string {
  return generateId('trace');
}

export function generateStepId(): string {
  return generateId('step');
}
