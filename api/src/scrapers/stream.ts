import { Request } from 'express';
import cheerio from 'cheerio';
import { AxiosResponse } from 'axios';
import { IStreamSources } from '@/types';

/**
 * Scrape stream sources asynchronously
 * @param {Request} ExpressRequest
 * @param {AxiosResponse} AxiosResponse
 * @returns {Promise.<IStreamSources[]>} array of stream sources objects
 */
export const scrapeStreamSources = async (
    req: Request,
    res: AxiosResponse
): Promise<IStreamSources[]> => {
    const $: cheerio.Root = cheerio.load(res.data);
    const payload: IStreamSources[] = [];

    $('ul#player-list > li > a').each((i, el) => {
        const obj = {} as IStreamSources;

        const resolutions: string[] = ['720p', '1080p']; // Resolutions are no longer explicitly stated per player

        obj['provider'] = $(el).text().trim() || $(el).attr('data-server')?.toUpperCase() || 'P2P';
        obj['url'] = $(el).attr('data-url') || $(el).attr('href') || '';
        obj['resolutions'] = resolutions;

        if (obj['url']) {
            payload.push(obj);
        }
    });

    return payload;
};
