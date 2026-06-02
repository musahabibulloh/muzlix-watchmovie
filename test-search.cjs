const { scrapeSearchedMoviesOrSeries } = require('./api/dist/scrapers/search');
const axios = require('axios');

async function test() {
    const resHTML = await axios.get('https://lk21.de/?s=mario');
    const res = await scrapeSearchedMoviesOrSeries(
        { headers: { host: 'localhost' }, protocol: 'http', params: { title: 'mario' } },
        resHTML
    );
    console.log(JSON.stringify(res, null, 2));
}

test().catch(console.error);
