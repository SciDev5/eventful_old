import { Color } from "@/common/util/Color";
import style from "./Chip.module.css"
import { css_vars } from "@/util/css";

export function Chip({ color, children }: { color: Color, children: JSX.Element | string }) {
    return (
        <div className={style.chip} style={css_vars({ chip_bg: color.to_hex(0.5), chip_fg: color.blend_to_white(0.75).to_hex(), chip_border: color.blend_to_white(0.25).to_hex() })}>
            {children}
        </div>
    )
}