import { useState, useRef, useEffect } from "react";
import { nameToLabel, type InputComponent } from "./input";
import { useSlider } from "../../hooks/slider";
import { clamp } from "../../../utils";

import "./styles/input.scss";

export const NumberInput: InputComponent<number, NumberProps> = ({ onChange, value, ...props }) => {
	const slider = useSlider(value, -Infinity, Infinity, "y", -1);

	const [val, set] = useState(value.toString());
	const prevX = useRef(val);

	const update = (v: string) => {
		const val = clamp(parseFloat(v), props.min || -Infinity, props.max || Infinity);
		set(val.toString());
		
		if (Number.isFinite(val) && !Number.isNaN(val)) {
			slider.set(val);
			onChange?.(value);
		}
	};

	useEffect(() => {
		const vx = val.toString();
		if (prevX.current !== vx) {
			prevX.current = vx;
			update(vx);
			onChange?.(value);
		}

	}, [value]);

	useEffect(() => {
		const vx = slider.size.toString();
		if (prevX.current !== vx) {
			prevX.current = vx;
			update(vx);
		}

	}, [slider.size])

	const fixInput = () => {
		const inputX = parseFloat(val);

		if (val.length === 0 || Number.isNaN(inputX) || !Number.isFinite(inputX)) {
			update(props.min ? props.min.toString() : "0");
		} else if (inputX.toString() !== val) {
			update(inputX.toString());
		}
	};

	return (
		<div className="input-field">
			<div className="label" onMouseDown={slider.onMouseDown}>{nameToLabel(props.name)}:</div>
			<input value={val} {...props} placeholder={props.name} type="text" onChange={e => update(e.target.value)} onBlur={fixInput} />
		</div>
	);
};

export type NumberProps = {
	min: number;
	max: number;
	step: number;
};
