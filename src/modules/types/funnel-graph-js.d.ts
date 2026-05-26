declare module 'funnel-graph-js' {
  type FunnelGraphDirection = 'vertical' | 'horizontal';
  type GradientDirection = 'vertical' | 'horizontal';

  type FunnelGraphData = {
    labels?: string[];
    subLabels?: string[];
    values: number[] | number[][];
    colors?: Array<string | string[]>;
  };

  export type FunnelGraphOptions = {
    container: string | HTMLElement;
    data: FunnelGraphData;
    direction?: FunnelGraphDirection;
    gradientDirection?: GradientDirection;
    displayPercent?: boolean;
    width?: number;
    height?: number;
    subLabelValue?: 'percent' | 'raw';
  };

  export default class FunnelGraph {
    constructor(options: FunnelGraphOptions);
    draw(): void;
    makeVertical(): void;
    makeHorizontal(): void;
    toggleDirection(): void;
    gradientMakeVertical(): void;
    gradientMakeHorizontal(): void;
    gradientToggleDirection(): void;
    updateHeight(height: number): void;
    updateWidth(width: number): void;
    updateData({ data }: { data: FunnelGraphData }): void;
    update({ options }: { options: Partial<FunnelGraphOptions> }): void;
  }
}

