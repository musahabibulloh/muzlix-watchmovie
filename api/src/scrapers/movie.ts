import { Request } from 'express';
import cheerio from 'cheerio';
import { AxiosResponse } from 'axios';
import { IMovies, IMovieDetails } from '@/types';

/**
 * Scrape movies asynchronously
 * @param {Request} ExpressRequest
 * @param {AxiosResponse} AxiosResponse
 * @returns {Promise.<IMovies[]>} array of movies objects
 */
export const scrapeMovies = async (
    req: Request,
    res: AxiosResponse
): Promise<IMovies[]> => {
    const $: cheerio.Root = cheerio.load(res.data);
    const payload: IMovies[] = [];
    const {
        protocol,
        headers: { host },
    } = req;

    $('div.gallery-grid')
        .find('article')
        .each((i, el) => {
            const parent: cheerio.Cheerio = $(el);
            const genres: string[] = parent.find('figcaption > div.genre').text().split(',').map(g => g.trim()).filter(Boolean);

            const movieId: string =
                parent
                    .find('figure > a')
                    .attr('href')
                    ?.split('/')
                    .filter(Boolean)
                    .pop() ?? '';

            const obj = {} as IMovies;

            obj['_id'] = movieId;
            obj['title'] =
                parent.find('h3.poster-title').text().trim() ?? '';
            obj['type'] = 'movie';
            
            let poster = parent.find('figure > a > div.poster > picture > img').attr('src') || '';
            if (poster && !poster.startsWith('http')) {
                poster = 'https:' + poster;
            }
            obj['posterImg'] = poster;
            
            obj['rating'] = parent.find('span[itemprop="ratingValue"]').text().trim() || 'N/A';
            obj['url'] = `${protocol}://${host}/movies/${movieId}`;
            obj['qualityResolution'] = parent.find('span.label').text().trim();
            obj['genres'] = genres;

            payload.push(obj);
        });

    return payload;
};

/**
 * Scrape movie details asynchronously
 * @param {Request} ExpressRequest
 * @param {AxiosResponse} AxiosResponse
 * @returns {Promise.<IMovieDetails>} movie details object
 */
export const scrapeMovieDetails = async (
    req: Request,
    res: AxiosResponse
): Promise<IMovieDetails> => {
    const { originalUrl } = req;

    const $: cheerio.Root = cheerio.load(res.data);
    const obj = {} as IMovieDetails;

    const genres: string[] = [];
    const directors: string[] = [];
    const countries: string[] = [];
    const casts: string[] = [];

    // Extract JSON metadata injected in the HTML
    let jsonData: any = {};
    const scriptText = $('script#watch-history-data').text();
    if (scriptText) {
        try {
            jsonData = JSON.parse(scriptText);
        } catch (e) {}
    }

    $('div.tag-list > span.tag > a').each((i, el) => {
        const text = $(el).text().trim();
        const href = $(el).attr('href') || '';
        // Add to genres if it is under /genre/ directory
        if (href.includes('/genre/')) {
            genres.push(text);
        }
    });

    let releaseDate = 'N/A';
    let quality = 'N/A';

    $('div.detail > p').each((i, el) => {
        const pText = $(el).text();
        if (pText.includes('Sutradara:')) {
            $(el).find('a').each((_, a) => directors.push($(a).text().trim()));
        } else if (pText.includes('Bintang Film:')) {
            $(el).find('a').each((_, a) => casts.push($(a).text().trim()));
        } else if (pText.includes('Negara:')) {
            $(el).find('a').each((_, a) => countries.push($(a).text().trim()));
        } else if (pText.includes('Release:')) {
            releaseDate = pText.replace('Release:', '').trim();
        }
    });

    $('div.info-tag > span').each((i, el) => {
        const text = $(el).text().trim();
        if (text && !text.includes('h ') && !text.includes('m') && !$(el).find('i.fa-star').length) {
            quality = text;
        }
    });

    obj['_id'] = jsonData.slug || originalUrl.split('/').filter(Boolean).pop() || '';
    obj['title'] = jsonData.title || $('div.movie-info > h1').text().replace('Nonton ', '').replace(/ di Lk21$/i, '').trim() || '';
    obj['type'] = 'movie';
    obj['posterImg'] = jsonData.poster || $('div.detail > a > picture > img').attr('data-src') || $('div.detail > a > picture > img').attr('src') || '';
    obj['rating'] = jsonData.rating || $('div.info-tag strong').text().trim() || 'N/A';
    obj['duration'] = jsonData.runtime || 'N/A';
    obj['releaseDate'] = releaseDate;
    obj['quality'] = quality;
    obj['synopsis'] = $('div.synopsis').text().trim() || '';
    
    let trailer = $('a.yt-lightbox').attr('href') || '';
    if (trailer === '#') trailer = '';
    obj['trailerUrl'] = trailer || ($('a.yt-lightbox').attr('data-title') ? 'https://www.youtube.com/watch?v=zva2PQ-ud5Y' : '');

    obj['genres'] = genres;
    obj['directors'] = directors;
    obj['countries'] = countries;
    obj['casts'] = casts;

    return obj;
};
