import { useState } from "react";
import { Vector2, Vector3 } from "three";
import { Settings, type InputComponent } from "../../editor/settings";
import { use } from "../../state";

export const NumberInput: InputComponent<number, NumberProps> = ({ onChange, value, ...props }) => {
	const [state, setState] = useState(value);

	const update = (value: number) => {
		setState(value);
		onChange(value);
	};

	return <input value={state} {...props} id={props.name} placeholder={props.name} type="number" onChange={e => update(+e.target.value)} />
};

export type NumberProps = {
	min: number,
	max: number,
	step: number,
};

export const Vector2Input: InputComponent<Vector2> = ({ onChange, value, name, ...props }) => {
	const [{ x, y }, setState] = useState({ ...value });

	const update = (value: Vector2) => {
		setState(value);
		onChange(value);
	};

	return (
		<div>
			<input {...props} value={x} id={name + ".x"} name={name + ".x"} placeholder={name + ".x"} type="number" onChange={(e) => update(new Vector2(+e.target.value, y))} />
			<input {...props} value={y} id={name + ".y"} name={name + ".y"} placeholder={name + ".y"} type="number" onChange={(e) => update(new Vector2(x, +e.target.value))} />
		</div>
	);
};

export const Vector3Input: InputComponent<Vector3> = ({ onChange, value, name, ...props }) => {
	const [{ x, y, z }, setState] = useState({ ...value });

	const update = (value: Vector3) => {
		setState(value);
		onChange(value);
	};

	return (
		<div>
			<input {...props} value={x} id={name + ".x"} name={name + ".x"} placeholder={name + ".x"} type="number" onChange={(e) => update(new Vector3(+e.target.value, y, z))} />
			<input {...props} value={y} id={name + ".y"} name={name + ".y"} placeholder={name + ".y"} type="number" onChange={(e) => update(new Vector3(x, +e.target.value, z))} />
			<input {...props} value={z} id={name + ".z"} name={name + ".z"} placeholder={name + ".z"} type="number" onChange={(e) => update(new Vector3(x, y, +e.target.value))} />
		</div>
	);
};

export const SettingsView = <T extends Settings>({ settings, type, onChange }: { settings: T, type: new () => T, onChange?: any }) => {
	const state = use(settings) as any;
	const inputs = Settings.getInputs(type);
	return (
		<form>
			{Object.keys(inputs).map((key, i) => {
				const { Component, header, props } = inputs[key]!;
				return (
					<div className="input-field" key={i}>
						{header && <div className="header">{header}</div>}
						{Component && <Component {...props} name={key} value={state[key]} onChange={val => { console.log("set", key, val); state[key] = val; }} />}
					</div>
				);
			})}
		</form>
	);
}