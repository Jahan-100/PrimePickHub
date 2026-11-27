// api/geo.js
module.exports = function handler(req, res) {
    const country = req.headers['x-vercel-ip-country'] || 'Unknown';
    const city = req.headers['x-vercel-ip-city'] || 'Unknown';
    const decodedCity = city !== 'Unknown' ? decodeURIComponent(city) : 'Unknown';
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).json({ country, city: decodedCity });
};
