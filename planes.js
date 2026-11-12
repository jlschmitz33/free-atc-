// Vercel serverless function: GET /api/planes?lat=44.88&lon=-93.22&nm=50
// Fetches live aircraft from free ADS-B feeds (no key), trying backups in order.
export default async function handler(req, res) {
  const lat = Number(req.query.lat), lon = Number(req.query.lon);
  const nm = Math.min(250, Math.max(1, Number(req.query.nm) || 50));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: 'lat and lon required' });
  }
  const sources = [
    `https://api.adsb.lol/v2/point/${lat}/${lon}/${nm}`,
    `https://api.airplanes.live/v2/point/${lat}/${lon}/${nm}`,
    `https://opendata.adsb.fi/api/v3/lat/${lat}/lon/${lon}/dist/${nm}`,
  ];
  for (const url of sources) {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'free-atc-personal/1.0' },
        signal: AbortSignal.timeout(5000),
      });
      if (!r.ok) continue;
      const data = await r.json();
      res.setHeader('Cache-Control', 's-maxage=3');
      return res.status(200).json({ ac: data.ac || data.aircraft || [], source: new URL(url).host });
    } catch (e) { /* try next source */ }
  }
  res.status(502).json({ error: 'all aircraft feeds unreachable' });
}
