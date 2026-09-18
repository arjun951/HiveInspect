/**
 * Decode HTML entities in a string using the browser's own HTML parser.
 * Handles &amp;, &lt;, &gt;, &#39;, &quot;, numeric entities, etc.
 * Safe to call on any string; returns the input unchanged if falsy.
 */
export function decodeEntities(str) {
  if (!str) return str;
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}
