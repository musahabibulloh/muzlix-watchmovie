import cheerio from 'cheerio';
import { AxiosResponse } from 'axios';
import { Request } from 'express';
import { ISetOfGenres } from '@/types';
import genres from '@/json/genres.json';

/**
 * Scrape a set of genres asynchronously
 * @param {Request} ExpressRequest
 * @param {AxiosResponse} AxiosResponse
 * @returns {Promise.<ISetOfGenres[]>} a set of genres
 */
export const scrapeSetOfGenres = async (
    req: Request,
    res: AxiosResponse
): Promise<ISetOfGenres[]> => {
    const $: cheerio.Root = cheerio.load(res.data);
    const payload: ISetOfGenres[] = [];
    const {
        headers: { host },
        protocol,
    } = req;

    genres.map((genre) => {
        const obj = {} as ISetOfGenres;
        obj['parameter'] = genre;
        obj['name'] = genre.charAt(0).toUpperCase() + genre.slice(1);
        obj['numberOfContents'] = 0; // Unknown since we can't scrape
        obj['url'] = `${protocol}://${host}/genres/${genre}`;
        payload.push(obj);
    });

    return payload;
};
