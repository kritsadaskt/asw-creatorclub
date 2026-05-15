/** Strip HTML tags for safe use in document title, notifications, etc. */
export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}
