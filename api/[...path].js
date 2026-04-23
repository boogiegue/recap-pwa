export default async function handler(req, res) {
  const token = process.env.VITE_GITHUB_TOKEN;
  
  // Build the GitHub API URL from the request path
  const githubPath = req.url.replace('/api/github', '');
  const githubUrl = `https://api.github.com${githubPath}`;

  const response = await fetch(githubUrl, {
    method: req.method,
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
  });

  const data = await response.json();
  res.status(response.status).json(data);
}