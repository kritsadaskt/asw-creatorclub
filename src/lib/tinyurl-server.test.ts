import { describe, expect, it } from 'vitest';
import { parseShortlinkAlias } from './tinyurl-server';

describe('parseShortlinkAlias', () => {
  it('parses branded TinyURL at domain root', () => {
    expect(parseShortlinkAlias('https://link.assetwise.co.th/7Wysn')).toEqual({
      alias: '7Wysn',
      domain: 'link.assetwise.co.th',
    });
  });

  it('parses legacy Shlink /c URLs', () => {
    expect(parseShortlinkAlias('https://assetwise.co.th/c/N8x3U')).toEqual({
      alias: 'N8x3U',
      domain: 'link.assetwise.co.th',
    });
  });
});
