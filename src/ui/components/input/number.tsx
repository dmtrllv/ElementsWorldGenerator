import { useState, useEffect } from "react";
import { nameToLabel, type InputComponent } from "./input";
import { useSlider } from "../../hooks/slider";
import { clamp } from "../../../utils";

import "./styles/input.scss";

export const NumberInput: InputComponent<number, NumberProps> = ({ onChange, value, ...props }) => {
	const min = props.min ?? -Infinity;
	const max = props.max ?? Infinity;
	const slider = useSlider(value, min, max, "y", -1 * (props.step || 1));

	const [val, set] = useState(value.toString());

	const fixInput = () => {
		const parsed = parseFloat(val);

		const next = Number.isFinite(parsed) ? clamp(parsed, min, max) : clamp(0, min, max);

		set(next.toString());
		slider.set(next);
		onChange?.(next);
	};

	const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter")
			e.currentTarget.blur();
	};

	useEffect(() => {
		set(value.toString());
	}, [value]);

	useEffect(() => {
		set(slider.size.toString());
		onChange?.(slider.size);
	}, [slider.size]);

	return (
		<div className="input-field">
			<div className="label" onMouseDown={slider.onMouseDown}>{nameToLabel(props.name)}:</div>
			<input value={val} {...props} placeholder={props.name} type="text" onChange={e => set(e.target.value)} onBlur={fixInput} onKeyDown={onKeyDown} />
		</div>
	);
};

export type NumberProps = {
	min: number;
	max: number;
	step: number;
};
