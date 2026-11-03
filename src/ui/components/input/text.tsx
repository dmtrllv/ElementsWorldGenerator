import { nameToLabel, type InputComponent } from "./input";

import "./styles/input.scss";

export const TextInput: InputComponent<string, StringProps> = ({ onChange, value, ...props }) => {
	return (
		<div className="input-field">
			<div className="label">{nameToLabel(props.name)}:</div>
			<input value={value} {...props} placeholder={props.name} type="text" onChange={e => onChange?.(e.target.value)} />
		</div>
	);
};

export type StringProps = {
	min: number;
	max: number;
};