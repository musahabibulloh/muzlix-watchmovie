const { scrapeMovieDetails } = require('./api/dist/scrapers/movie');
const fs = require('fs');

async function test() {
    const html = fs.readFileSync('movie-details.html', 'utf8');
    const res = await scrapeMovieDetails({ originalUrl: '/movies/mortal-kombat-ii-2026' }, { data: html });
    console.log(JSON.stringify(res, null, 2));
}

test();
