export class Chart {
  constructor(ctx, config) {
    this.ctx = ctx
    this.config = config
    return new ChartJS(ctx, config)
  }
}

// Dummy implementations to satisfy imports.  These are not used.
class ChartJS {
  constructor(ctx, config) {
    this.ctx = ctx
    this.config = config
  }

  destroy() {}
}

export const ChartContainer = () => null
export const ChartTooltip = () => null
export const ChartTooltipContent = () => null
export const ChartLegend = () => null
export const ChartLegendContent = () => null
export const ChartStyle = () => null

