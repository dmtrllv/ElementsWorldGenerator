import { type InputComponent, nameToLabel } from "./input";

import "./styles/input.scss";

const hexToRgb = (hex: string): [number, number, number] => {
	const value = hex.replace(/^#/, "");
	return [
		parseInt(value.substring(0, 2), 16),
		parseInt(value.substring(2, 4), 16),
		parseInt(value.substring(4, 6), 16)
	];
}

const rgbToHex = ([r, g, b]: [number, number, number]): string => {
	return `#${[r, g, b].map(v => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

export const ColorInput: InputComponent<[number, number, number]> = ({ onChange, value, ...props }) => {
	return (
		<div className="input-field">
			<div className="label">{nameToLabel(props.name)}:</div>
			<input value={rgbToHex(value)} {...props} placeholder={props.name} type="color" onChange={e => onChange?.(hexToRgb(e.target.value))} />
		</div>
	);
};
