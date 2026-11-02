import type { Range } from "../../../generator/params";
import { useSlider } from "../../hooks/slider";
import { nameToLabel } from "../input";

export const RangeInput = ({ range }: { range: Range }) => {
	const min = useSlider(range.min, -Infinity, Infinity, "y");
	const max = useSlider(range.max, -Infinity, Infinity, "y");

	const update = ([x, y]: [number, number]) => {
		min.set(x);
		max.set(y);
		range.state = [x, y];
	};

	return (
		<div className="input-field vec2">
			<div className="label">{nameToLabel(range.name)}:</div>
			<div className="inputs">
				<div className="input">
					<div className="label min" onMouseDown={min.onMouseDown}>x</div>
					<input value={min.size} id={range.name + ".min"} name={range.name + ".min"} placeholder={name + ".min"} type="number" onChange={(e) => update([+e.target.value, max.size])} />
				</div>
				<div className="input" >
					<div className="label max" onMouseDown={max.onMouseDown}>y</div>
					<input value={max.size} id={range.name + ".max"} name={range.name + ".max"} placeholder={name + ".max"} type="number" onChange={(e) => update([min.size, +e.target.value])} />
				</div>
			</div>
		</div>
	);
};