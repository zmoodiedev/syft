import axios from 'axios';
import { delay } from './utils';
import * as cheerio from 'cheerio';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

interface ScrapedRecipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  sourceUrl: string;
  sourceName: string;
}

interface RecipeSchema {
  '@type': string;
  name?: string;
  recipeIngredient?: string[];
  recipeInstructions?: Array<{ text?: string } | string>;
}

class RecipeScraper {
  private static readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/91.0.864.59',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
  ];

  private static readonly REFERRERS = [
    'https://www.google.com/',
    'https://www.bing.com/',
    'https://www.yahoo.com/',
    'https://www.facebook.com/',
    'https://www.pinterest.com/',
    'https://www.reddit.com/',
    'https://www.tiktok.com/',
    'https://www.instagram.com/'
  ];

  private static readonly ACCEPT_LANGUAGES = [
    'en-US,en;q=0.9',
    'en-GB,en;q=0.9',
    'en-CA,en;q=0.9',
    'en-AU,en;q=0.9',
    'en-NZ,en;q=0.9',
    'fr-FR,fr;q=0.9,en;q=0.8',
    'de-DE,de;q=0.9,en;q=0.8'
  ];

  private static readonly BLOCKED_WEBSITES = [
    'canadianliving.com',
    'allrecipes.com',
    'foodnetwork.com'
  ];

  private static getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private static async getHeaders() {
    return {
      'User-Agent': this.getRandomElement(this.USER_AGENTS),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': this.getRandomElement(this.ACCEPT_LANGUAGES),
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
      'Referer': this.getRandomElement(this.REFERRERS),
      'DNT': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="91", "Chromium";v="91"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'Pragma': 'no-cache',
      'TE': 'trailers'
    };
  }

  private static async fetchWithRetry(url: string, maxRetries = 3): Promise<string> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const headers = await this.getHeaders();
        
        await delay(Math.random() * 2000 + 1000);

        const response = await axios.get(url, {
          headers,
          timeout: 10000,
          validateStatus: (status: number) => status < 500,
          maxRedirects: 5,
          decompress: true,
          withCredentials: true
        });

        if (response.status === 200) {
          const html = response.data;
          if (this.isBlockedContent(html)) {
            throw new Error('Website is blocking automated access');
          }
          return html;
        }

        if (response.status === 429) {
          await delay(5000 * Math.pow(2, attempt - 1));
          continue;
        }

        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        if (attempt === maxRetries) throw error;
        await delay(2000 * attempt + Math.random() * 1000);
      }
    }
    throw new Error('Max retries exceeded');
  }

  private static isBlockedContent(html: string): boolean {
    const blockedIndicators = [
      'Access Denied',
      'Please enable JavaScript',
      'bot detection',
      'security check',
      'redirect count exceeded',
      'Cloudflare',
      'Please verify you are a human',
      'CAPTCHA',
      'Security check',
      'Your request has been blocked',
      'Rate limit exceeded',
      'Too many requests'
    ];

    return blockedIndicators.some(indicator => 
      html.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  private static extractSourceName(url: string): string {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '').split('.')[0];
    } catch {
      return 'Unknown Source';
    }
  }

  private static isBlockedWebsite(url: string): boolean {
    try {
      const hostname = new URL(url).hostname;
      return this.BLOCKED_WEBSITES.some(blocked => hostname.includes(blocked));
    } catch {
      return false;
    }
  }

  private static async extractRecipeData(html: string, url: string): Promise<ScrapedRecipe> {
    const $ = cheerio.load(html);
    
    const schemaScript = $('script[type="application/ld+json"]').first().text();
    if (schemaScript) {
      try {
        const schema = JSON.parse(schemaScript) as RecipeSchema;
        if (schema['@type'] === 'Recipe') {
          return {
            title: schema.name || 'Untitled Recipe',
            ingredients: Array.isArray(schema.recipeIngredient) ? schema.recipeIngredient : [],
            instructions: Array.isArray(schema.recipeInstructions) 
              ? schema.recipeInstructions.map(step => typeof step === 'string' ? step : step.text || '')
              : [],
            sourceUrl: url,
            sourceName: this.extractSourceName(url)
          };
        }
      } catch (e) {
        console.warn('Failed to parse schema:', e);
      }
    }

    const title = this.extractTitle($);
    const ingredients = this.extractIngredients($);
    const instructions = this.extractInstructions($);

    return {
      title,
      ingredients,
      instructions,
      sourceUrl: url,
      sourceName: this.extractSourceName(url)
    };
  }

  private static extractTitle($: cheerio.CheerioAPI): string {
    const titleSelectors = [
      'h1',
      '[itemprop="name"]',
      '.recipe-title',
      '.post-title',
      'article h1',
      'main h1',
      '.entry-title'
    ];

    for (const selector of titleSelectors) {
      const title = $(selector).first().text().trim();
      if (title) return title;
    }

    return 'Untitled Recipe';
  }

  private static extractIngredients($: cheerio.CheerioAPI): string[] {
    const ingredientSelectors = [
      '[itemprop="recipeIngredient"]',
      '.ingredients li',
      '.recipe-ingredients li',
      '[class*="ingredient"] li',
      'ul.ingredients li',
      'div.ingredients li',
      'div[class*="ingredients"] li',
      'li[class*="ingredient"]',
      'div[class*="ingredients"] p',
      'div[class*="ingredients"] div'
    ];

    const ingredients: string[] = [];
    for (const selector of ingredientSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        elements.each((_, el) => {
          const text = $(el).text().trim();
          if (text) ingredients.push(text);
        });
        break;
      }
    }

    return ingredients;
  }

  private static extractInstructions($: cheerio.CheerioAPI): string[] {
    const instructionSelectors = [
      '[itemprop="recipeInstructions"] li',
      '.instructions li',
      '.recipe-steps li',
      '[class*="instruction"] li',
      'ol.instructions li',
      'div.instructions li',
      'div[class*="instructions"] li',
      'li[class*="instruction"]',
      'div[class*="instructions"] p',
      'div[class*="instructions"] div'
    ];

    const instructions: string[] = [];
    for (const selector of instructionSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        elements.each((_, el) => {
          const text = $(el).text().trim();
          if (text) instructions.push(text);
        });
        break;
      }
    }

    return instructions;
  }

  public static async scrapeRecipe(url: string): Promise<ScrapedRecipe> {
    try {
      if (this.isBlockedWebsite(url)) {
        throw new Error(
          `This website (${new URL(url).hostname}) is known to block automated recipe scraping. ` +
          'Please copy the recipe manually or try a different recipe website.'
        );
      }

      const html = await this.fetchWithRetry(url);
      const recipe = await this.extractRecipeData(html, url);

      if (!recipe.title || recipe.title === 'Untitled Recipe') {
        throw new Error('Could not find recipe title on the page');
      }

      if (recipe.ingredients.length === 0) {
        throw new Error('Could not find any ingredients on the page');
      }

      if (recipe.instructions.length === 0) {
        throw new Error('Could not find any instructions on the page');
      }

      return recipe;
    } catch (error) {
      console.error('Error scraping recipe:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('known to block automated recipe scraping')) {
          throw error;
        } else if (error.message.includes('Could not find')) {
          throw new Error(
            `${error.message}. This might be because:\n` +
            '1. The URL does not point to a recipe page\n' +
            '2. The website uses a different format than we support\n' +
            '3. The website is blocking our access\n\n' +
            'Please try a different recipe or website.'
          );
        } else if (error.message.includes('HTTP')) {
          throw new Error(
            `The website returned an error (${error.message}). This usually means:\n` +
            '1. The website is temporarily unavailable\n' +
            '2. The website is blocking our access\n' +
            '3. The URL is incorrect\n\n' +
            'Please try again later or use a different recipe URL.'
          );
        } else if (error.message.includes('timeout')) {
          throw new Error(
            'The website took too long to respond. This could be because:\n' +
            '1. The website is experiencing high traffic\n' +
            '2. Your internet connection is slow\n' +
            '3. The website is blocking our access\n\n' +
            'Please try again later or use a different recipe URL.'
          );
        }
      }

      throw new Error(
        'Failed to scrape the recipe. This could be because:\n' +
        '1. The website is blocking automated access\n' +
        '2. The recipe format is not supported\n' +
        '3. The URL is incorrect\n\n' +
        'Please try a different recipe or website.'
      );
    }
  }
}

export default RecipeScraper; 