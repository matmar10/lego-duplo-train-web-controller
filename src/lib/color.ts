import Bottleneck from 'bottleneck';

export interface ColorRange {
  readonly min: number;
  readonly max: number;
}

export interface RGBColorRangeItem {
  [key: string]: ColorRange
}

export interface RGBColorRange extends RGBColorRangeItem {
  readonly red: ColorRange;
  readonly green: ColorRange;
  readonly blue: ColorRange;
}

export interface RGBColorComponent {
  [key: string]: number;
}

export interface RGBColor extends RGBColorComponent {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

export const TileColorName = {
  WHITE: 'WHITE',
  RED: 'RED',
  BLUE: 'BLUE',
  YELLOW: 'YELLOW'
}

export interface TileColorValueInterface {
  [key: string]: RGBColor
}

export const TileColorValues: TileColorValueInterface = {
  [TileColorName.WHITE]: {
    red: 255,
    green: 255,
    blue: 255,
  },
  [TileColorName.RED]: {
    red: 255,
    green: 0,
    blue: 0,
  },
  [TileColorName.BLUE]: {
    red: 0,
    green: 0,
    blue: 255,
  },
  [TileColorName.YELLOW]: {
    red: 255,
    green: 255,
    blue: 0,
  },
};

export const TileColorRange: {
  [key: string]: RGBColorRange
} = {
  [TileColorName.WHITE]: {
    red: {
      min: 180,
      max: Infinity
    },
    green: {
      min: 180,
      max: Infinity
    },
    blue: {
      min: 210,
      max: Infinity
    }
  },
  [TileColorName.RED]: {
    red: {
      min: 125,
      max: Infinity
    },
    green: {
      min: 15,
      max: 40
    },
    blue: {
      min: 15,
      max: 40
    }
  },
  [TileColorName.BLUE]: {
    red: {
      min: 20,
      max: 40
    },
    green: {
      min: 45,
      max: 70
    },
    blue: {
      min: 110,
      max: Infinity
    }
  },
  [TileColorName.YELLOW]: {
    red: {
      min: 175,
      max: Infinity
    },
    green: {
      min: 80,
      max: 120
    },
    blue: {
      min: 0,
      max: 60
    }
  }
}

export const ColorEmoji = {
  [TileColorName.WHITE]: '⚪',
  [TileColorName.RED]: '🔴',
  [TileColorName.BLUE]: '🔵',
  [TileColorName.YELLOW]: '🉑',
};

export class TileName {

  static getTileName(color: RGBColor): string {
    let matchedTile: string = '';
    const tileNames = Object.keys(TileColorName);
    tileNames.forEach((tileName) => {
      const range = TileColorRange[tileName];
      if (TileName.matchesRange(color, range)) {
        matchedTile = tileName;
      }
    });
    return matchedTile;
  }

  static matchesRange(color: RGBColor, range: RGBColorRange): boolean {
    const matched: { [key: string]: boolean } = {
      red: false,
      green: false,
      blue: false,
    };
    const keys = Object.keys(matched);
    keys.forEach((colorName: string) => {
      const {min, max} = range[colorName];
      const value = color[colorName];
      matched[colorName] = value >= min && value <= max;
    });
    return matched.red && matched.green && matched.blue;
  }
}

export function buildThrottledNotifyTileDetected() {

  const checkColorLimiter = new Bottleneck({
    maxConcurrent: 1,
    highWater: 0,
    minTime: 333
  });
  const triggerTileLimiter = new Bottleneck({
    maxConcurrent: 1,
    highWater: 0,
    minTime: 500
  });

  const triggerTileLimited = triggerTileLimiter.wrap(async (tileName: string, fn: Function) => {
    try {
      fn(tileName);
    } catch (err) { }
  });

  const checkColorLimited = checkColorLimiter.wrap(async (ev: any) => {
    try {
      const adjusted = {
        red: ev.red / 2,
        green: ev.green / 2,
        blue: ev.blue / 2
      };
      const tileName = TileName.getTileName(adjusted);
      // console.log(`Color: ${adjusted.red}:${adjusted.green}:${adjusted.blue} Tile: ${tileName}`);
      return tileName;
    } catch (err) {
      return '';
    }
  });

  return async function(ev: RGBColor, callback: Function) {
    try {
      const tileName = await checkColorLimited(ev);
      if (tileName) {
        await triggerTileLimited(tileName, callback);
      }
    } catch (err) { }
  };
}
