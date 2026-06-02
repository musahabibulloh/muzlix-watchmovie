import cheerio from 'cheerio';
import axios, { AxiosResponse } from 'axios';
import { Request } from 'express';
import { ISearchedMoviesOrSeries } from '@/types';

/**
 * Scrape searched movies or series
 * @param {Request} req
 * @param {AxiosResponse} res
 * @returns {Promise.<ISearchedMoviesOrSeries[]>} array of movies or series
 */
export const scrapeSearchedMoviesOrSeries = async (
    req: Request,
    res: AxiosResponse
): Promise<ISearchedMoviesOrSeries[]> => {
    const $: cheerio.Root = cheerio.load(res.data);
    const payload: ISearchedMoviesOrSeries[] = [];
    const {
        headers: { host },
        protocol,
    } = req;
    const { title = '' } = req.params;

    const searchUrl = $('body').attr('data-search_url') || 'https://gudangvape.com/';
    const thumbnailUrl = $('body').attr('data-thumbnail_url') || 'https://poster.showcdnx.com/wp-content/uploads/';

    try {
        const jsonResponse = await axios.get(
            `${searchUrl}search.php?s=${encodeURIComponent(title)}&page=1`,
            {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    Referer: `${process.env.LK21_URL || 'https://lk21.de'}/`,
                },
            }
        );

        if (jsonResponse.data && Array.isArray(jsonResponse.data.data)) {
            jsonResponse.data.data.forEach((item: any) => {
                const type = item.type === 'series' ? 'series' : 'movie';
                payload.push({
                    _id: item.slug || '',
                    title: item.title || '',
                    type: type,
                    posterImg: item.poster ? `${thumbnailUrl}${item.poster}` : '',
                    url: `${protocol}://${host}/${type}/${item.slug || ''}`,
                    genres: [],
                    directors: [],
                    casts: [],
                });
            });
        }
    } catch (err) {
        console.error('Error fetching search JSON:', err);
    }

    return payload;
};
