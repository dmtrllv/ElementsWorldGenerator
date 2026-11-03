import { useEffect, useRef, useState } from "react";
import { Vector2, Vector3 } from "three";
import { useSlider } from "../hooks/slider";

import "./styles/input.scss";

export type InputComponentProps<T> = {
	readonly name: string;
	readonly value: T,
	readonly onChange?: (value: T) => void
};

export type InputComponent<T, P extends {} = {}> = React.FC<InputComponentProps<T> & Partial<P>>;

export const nameToLabel = (name: string) => name.split("").map((s, i) => {
	if (i === 0)
		return s.toUpperCase();
	if (s === ".")
		return " ";
	if (s.toUpperCase() === s)
		return ` ${s.toLowerCase()}`;
	return s;
}).join("");

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

export const Vector2Input: InputComponent<Vector2> = ({ onChange, value, name, ...props }) => {
	const sx = useSlider(value.x, -Infinity, Infinity, "y");
	const sy = useSlider(value.y, -Infinity, Infinity, "y");

	const [x, setX] = useState(value.x.toString());
	const [y, setY] = useState(value.y.toString());
	const prevX = useRef(x);
	const prevY = useRef(y);


	const update = (target: "x" | "y") => (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		console.log(target, val);
		//sx.set(value.x);
		//sy.set(value.y);
		//onChange?.(value);
	};

	useEffect(() => {
		console.log(sx, sy, prevX.current, prevY.current)
	}, [sx.size, sy.size])

	return (
		<div className="input-field vec3">
			<div className="label">{nameToLabel(name)}:</div>
			<div className="inputs">
				<div className="input">
					<div className="label x" onMouseDown={sx.onMouseDown}>x</div>
					<input {...props} value={sx.size} id={name + ".x"} name={name + ".x"} placeholder={name + ".x"} type="text" onChange={update("x")} />
				</div>
				<div className="input" >
					<div className="label y" onMouseDown={sy.onMouseDown}>y</div>
					<input {...props} value={sy.size} id={name + ".y"} name={name + ".y"} placeholder={name + ".y"} type="text" onChange={update("y")} />
				</div>
			</div>
		</div>
	);
};

export const Vector3Input: InputComponent<Vector3> = ({ onChange, value, name, ...props }) => {
	const sx = useSlider(value.x, -Infinity, Infinity, "y");
	const sy = useSlider(value.y, -Infinity, Infinity, "y");
	const sz = useSlider(value.z, -Infinity, Infinity, "y");


	const update = (value: Vector3) => {
		sx.set(value.x);
		sy.set(value.y);
		sz.set(value.z);
		onChange?.(value);
	};

	useEffect(() => {
		if (value.x !== sx.size)
			sx.set(value.x);

		if (value.y !== sy.size)
			sy.set(value.y);

		if (value.z !== sz.size)
			sz.set(value.z);
	}, [value]);

	return (
		<div className="input-field vec3">
			<div className="label">{nameToLabel(name)}:</div>
			<div className="inputs">
				<div className="input">
					<div className="label x" onMouseDown={sx.onMouseDown}>x</div>
					<input {...props} value={sx.size} id={name + ".x"} name={name + ".x"} placeholder={name + ".x"} type="number" onChange={(e) => update(new Vector3(+e.target.value, sy.size, sz.size))} />
				</div>
				<div className="input" >
					<div className="label y" onMouseDown={sy.onMouseDown}>y</div>
					<input {...props} value={sy.size} id={name + ".y"} name={name + ".y"} placeholder={name + ".y"} type="number" onChange={(e) => update(new Vector3(sx.size, +e.target.value, sz.size))} />
				</div>
				<div className="input" >
					<div className="label z" onMouseDown={sz.onMouseDown}>z</div>
					<input {...props} value={sz.size} id={name + ".z"} name={name + ".z"} placeholder={name + ".z"} type="number" onChange={(e) => update(new Vector3(sx.size, sy.size, +e.target.value))} />
				</div>
			</div>
		</div>
	);
};