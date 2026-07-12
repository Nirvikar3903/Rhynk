/**
 * Renders a template string by replacing {{variable}} placeholders with values.
 * If the value is missing or undefined, it preserves the placeholder.
 */
export function renderTemplate(templateStr, data = {}) {
  if (!templateStr) return '';
  return templateStr.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}
