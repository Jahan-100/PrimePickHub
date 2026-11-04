// api/geo.js
export default function handler(req, res) {
    // Vercel headers se location nikalna
    const country = req.headers['x-vercel-ip-country'] || 'Unknown';
    const city = req.headers['x-vercel-ip-city'] || 'Unknown';
    
    // Agar city encoded hai toh decode karein
    const decodedCity = city !== 'Unknown' ? decodeURIComponent(city) : 'Unknown';

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({
        country: country,
        city: decodedCity
    });
}
