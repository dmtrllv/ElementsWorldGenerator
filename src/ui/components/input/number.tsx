import { useState, useRef, useEffect } from "react";
import { nameToLabel, type InputComponent } from "./input";

import "./styles/input.scss";

export const NumberInput: InputComponent<number, NumberProps> = ({ onChange, value, ...props }) => {
	const [val, setVal] = useState(value.toString());
	const prevVal = useRef(val);

	const update = (value: string) => {
		setVal(value);
		const val = parseFloat(value);
		if (Number.isFinite(val) && !Number.isNaN(val)) {
			onChange?.(val);
		}
	};

	useEffect(() => {
		const v = value.toString();
		if (prevVal.current !== v) {
			prevVal.current = v;
			setVal(val);
		}
	}, [value])

	const fixInput = () => {
		const input = parseFloat(val);
		if (val.length === 0 || Number.isNaN(input) || !Number.isFinite(input)) {
			setVal("0");
			onChange?.(0);
			return;
		}

		setVal(input.toString())
		onChange?.(input);
	};

	return (
		<div className="input-field">
			<div className="label">{nameToLabel(props.name)}:</div>
			<input value={val} {...props} placeholder={props.name} type="text" onChange={e => update(e.target.value)} onBlur={fixInput} />
		</div>
	);
};

export type NumberProps = {
	min: number;
	max: number;
	step: number;
};
