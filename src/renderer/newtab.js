// The search engine comes from the main process through the ?engine= query parameter.
const param = new URLSearchParams(location.search).get('engine') ?? '';
const engine = param.startsWith('https://') ? param : 'https://duckduckgo.com/?q=';

document.getElementById('search').addEventListener('submit', (e) => {
  e.preventDefault();
  const query = document.getElementById('query').value.trim();
  if (query) location.href = engine + encodeURIComponent(query);
});
