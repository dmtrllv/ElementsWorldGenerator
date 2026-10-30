import { Fragment, useEffect, type JSX } from "react";
import { Vector2, Vector3 } from "three";
import { Settings, type InputComponent } from "../../editor/settings";
import { observe } from "../../state";
import { DropdownPanel } from "./dropdown";
import { useSlider } from "../hooks/slider";

import "./styles/input.scss";

const nameToLabel = (name: string) => name.split("").map((s, i) => {
	if (i === 0)
		return s.toUpperCase();
	if (s.toUpperCase() === s)
		return ` ${s.toLowerCase()}`;
	return s;
});

export const TextInput: InputComponent<string, StringProps> = ({ onChange, value, label, ...props }) => {
	return (
		<div className="input-field">
			<div className="label">{label || nameToLabel(props.name)}:</div>
			<input value={value} {...props} id={props.name} placeholder={props.name} type="text" onChange={e => onChange(e.target.value)} />
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

export const ColorInput: InputComponent<[number, number, number]> = ({ onChange, value, label, ...props }) => {
	console.log("Color render", value);
	return (
		<div className="input-field">
			<div className="label">{label || nameToLabel(props.name)}:</div>
			<input value={rgbToHex(value)} {...props} id={props.name} placeholder={props.name} type="color" onChange={e => onChange(hexToRgb(e.target.value))} />
		</div>
	);
};


export const NumberInput: InputComponent<number, NumberProps> = ({ onChange, value, label, ...props }) => {
	const update = (value: string) => {
		const val = +value;
		if (Number.isFinite(val) && !Number.isNaN(val)) {
			onChange(val);
		}
	};

	return (
		<div className="input-field">
			<div className="label">{label || nameToLabel(props.name)}:</div>
			<input value={value} {...props} id={props.name} placeholder={props.name} type="text" onChange={e => update(e.target.value)} />
		</div>
	);
};

export type NumberProps = {
	min: number;
	max: number;
	step: number;
};

export const Vector2Input: InputComponent<Vector2> = ({ onChange, value, name, label, ...props }) => {
	const sx = useSlider(value.x, -Infinity, Infinity, "y");
	const sy = useSlider(value.y, -Infinity, Infinity, "y");


	const update = (value: Vector2) => {
		sx.set(value.x);
		sy.set(value.y);
		onChange(value);
	};

	return (
		<div className="input-field vec3">
			<div className="label">{label || nameToLabel(name)}:</div>
			<div className="inputs">
				<div className="input">
					<div className="label x" onMouseDown={sx.onMouseDown}>x</div>
					<input {...props} value={sx.size} id={name + ".x"} name={name + ".x"} placeholder={name + ".x"} type="number" onChange={(e) => update(new Vector2(+e.target.value, sy.size))} />
				</div>
				<div className="input" >
					<div className="label y" onMouseDown={sy.onMouseDown}>y</div>
					<input {...props} value={sy.size} id={name + ".y"} name={name + ".y"} placeholder={name + ".y"} type="number" onChange={(e) => update(new Vector2(sx.size, +e.target.value))} />
				</div>
			</div>
		</div>
	);
};

export const Vector3Input: InputComponent<Vector3> = ({ onChange, value, name, label, ...props }) => {
	const sx = useSlider(value.x, -Infinity, Infinity, "y");
	const sy = useSlider(value.y, -Infinity, Infinity, "y");
	const sz = useSlider(value.z, -Infinity, Infinity, "y");


	const update = (value: Vector3) => {
		sx.set(value.x);
		sy.set(value.y);
		sz.set(value.z);
		onChange(value);
	};

	useEffect(() => {
		if(value.x !== sx.size)
			sx.set(value.x);
		
		if(value.y !== sy.size)
			sy.set(value.y);
		
		if(value.z !== sz.size)
			sz.set(value.z);
	}, [value]);

	return (
		<div className="input-field vec3">
			<div className="label">{label || nameToLabel(name)}:</div>
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

export const SettingsView = <T extends Settings>({ settings, type, onChange }: { settings: T, type: new (...args: any[]) => T, onChange?: SettingsChangeHandler<T> }) => {
	const state = observe(settings) as any;
	const inputs = Settings.getInputs(type);
	console.log("SettingsView change")

	const elements = [];
	let sectionElements: JSX.Element[] = [];

	let currentSection: string | null = null;

	Object.keys(inputs).forEach((key) => {
		const { Component, section, header, props } = inputs[key]!;
		if (section) {
			if (currentSection) {
				elements.push(
					<DropdownPanel title={currentSection} key={currentSection}>
						{sectionElements}
					</DropdownPanel>
				);
			}
			currentSection = section;
			sectionElements = [
				<Fragment key={key}>
					{header && <div className="header">{header}</div>}
					{Component && <Component {...props} name={key} value={state[key]} onChange={val => { state[key] = val; onChange?.(key as any, val) }} />}
				</Fragment>
			]
		} else if (!currentSection) {
			elements.push(
				<Fragment key={key}>
					{header && <div className="header">{header}</div>}
					{Component && <Component {...props} name={key} value={state[key]} onChange={val => { state[key] = val; onChange?.(key as any, val) }} />}
				</Fragment>
			);
		} else {
			sectionElements.push(
				<Fragment key={key}>
					{header && <div className="header">{header}</div>}
					{Component && <Component {...props} name={key} value={state[key]} onChange={val => { state[key] = val; onChange?.(key as any, val) }} />}
				</Fragment>
			);
		}
	});

	if (currentSection) {
		elements.push(
			<DropdownPanel title={currentSection} key={currentSection}>
				{sectionElements}
			</DropdownPanel>
		);
	}

	return (
		<form>
			{elements}
		</form>
	);
}

type SettingsChangeHandler<T extends Settings> = <K extends keyof T>(key: K, value: T) => any;