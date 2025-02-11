import { clamp } from "./math";

export class Color {
    constructor(
        readonly r: number,
        readonly g: number,
        readonly b: number,
        readonly a: number = 1,
    ) { }

    static from_hex(hex: string): Color | null {
        if (!/^#[0-9a-f]+$/.test(hex)) return null
        const hex_ = hex.substring(1)
        if (hex_.length === 3 || hex_.length === 4) {
            const [r, g, b, a] = hex_.split("")
                .map(v => parseInt(v, 16) / 15) as [number, number, number, number | undefined]
            return new Color(r, g, b, a)

        } else if (hex_.length === 6 || hex_.length === 8) {
            const [r, g, b, a] = new Array(hex_.length / 2).fill(0)
                .map((_, i) => parseInt(hex_.substring(i * 2, i * 2 + 2), 16) / 255) as [number, number, number, number | undefined]
            return new Color(r, g, b, a)
        } else {
            return null
        }
    }
    blend_to_white(amt: number): Color {
        return new Color(
            1 - (1 - this.r) * (1 - amt),
            1 - (1 - this.g) * (1 - amt),
            1 - (1 - this.b) * (1 - amt),
            this.a,
        )
    }
    blend_to_black(amt: number): Color {
        return new Color(
            this.r * (1 - amt),
            this.g * (1 - amt),
            this.b * (1 - amt),
            this.a,
        )
    }

    contrasting_text_color() {
        // https://stackoverflow.com/questions/596216/formula-to-determine-perceived-brightness-of-rgb-color
        const luma = Math.sqrt(0.299 * this.r * this.r + 0.587 * this.g * this.g + 0.114 * this.b * this.b)
        return luma > 0.75 ? new Color(0, 0, 0) : new Color(1, 1, 1)
    }

    to_hex(alpha = this.a): string {
        return `#${clamp(Math.floor(this.r * 256), 0, 255).toString(16).padStart(2, "0")
            }${clamp(Math.floor(this.g * 256), 0, 255).toString(16).padStart(2, "0")
            }${clamp(Math.floor(this.b * 256), 0, 255).toString(16).padStart(2, "0")
            }${clamp(Math.floor(alpha * 256), 0, 255).toString(16).padStart(2, "0")}`
    }
}