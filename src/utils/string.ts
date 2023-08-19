export function generateStructuredText(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/{([^{}]+)}/g, (_, key) => values[key] || '');
}
