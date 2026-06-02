const { scrapeStreamSources } = require('./api/dist/scrapers/stream');
const fs = require('fs');

async function test() {
    const html = fs.readFileSync('movie-details.html', 'utf8');
    const res = await scrapeStreamSources({ }, { data: html });
    console.log(JSON.stringify(res, null, 2));
}

test();
