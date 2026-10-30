import { Fragment, useEffect, useState, type JSX } from "react";
import { Vector2, Vector3 } from "three";
import { Settings, type InputComponent } from "../../editor/settings";
import { use } from "../../state";
import { DropdownPanel } from "./dropdown";
import { useSlider } from "../hooks/slider";

import "./styles/input.scss";

const nameToLabel = (name: string) => name.split("").map((s, i) => {
	if(i === 0)
		return s.toUpperCase();
	if(s.toUpperCase() === s)
		return ` ${s.toLowerCase()}`;
	return s;
});

export const NumberInput: InputComponent<number, NumberProps> = ({ onChange, value, label, ...props }) => {
	const [state, setState] = useState(value.toString());

	const update = (value: string) => {
		const val = +value;
		if(Number.isFinite(val) && !Number.isNaN(val)) {
			setState(value);
			onChange(val);
		}
	};

	return (
		<div className="input-field">
			<div className="label">{label || nameToLabel(props.name)}:</div>
			<input value={state} {...props} id={props.name} placeholder={props.name} type="text" onChange={e => update(e.target.value)} />
		</div>
	);
};

export type NumberProps = {
	min: number,
	max: number,
	step: number,
};

export const Vector2Input: InputComponent<Vector2> = ({ onChange, value, name, label, ...props }) => {
	const [{ x, y }, setState] = useState({ ...value });

	const update = (value: Vector2) => {
		setState(value);
		onChange(value);
	};

	return (
		<div className="input-field vec3">
			<div className="label">{label || nameToLabel(name)}:</div>
			<div className="inputs">
				<div className="input">
					<div className="label x">x</div>
					<input {...props} value={x} id={name + ".x"} name={name + ".x"} placeholder={name + ".x"} type="number" onChange={(e) => update(new Vector2(+e.target.value, y))} />
				</div>
				<div className="input">
					<div className="label y">y</div>
					<input {...props} value={y} id={name + ".y"} name={name + ".y"} placeholder={name + ".y"} type="number" onChange={(e) => update(new Vector2(x, +e.target.value))} />
				</div>
			</div>
		</div>
	);
};

export const Vector3Input: InputComponent<Vector3> = ({ onChange, value, name, label, ...props }) => {
	const [s, setState] = useState({ ...value });
	const { x, y, z } = s;
	const update = (value: Vector3) => {
		if (!value.equals(s)) {
			setState(value);
			onChange(value);
		}
	};

	const sx = useSlider(x, -Infinity, Infinity, "y");
	const sy = useSlider(y, -Infinity, Infinity, "y");
	const sz = useSlider(z, -Infinity, Infinity, "y");

	useEffect(() => { update(new Vector3(sx.size, y, z)) }, [sx]);
	useEffect(() => { update(new Vector3(x, sy.size, z)) }, [sy]);
	useEffect(() => { update(new Vector3(x, y, sz.size)) }, [sz]);

	return (
		<div className="input-field vec3">
			<div className="label">{label || nameToLabel(name)}:</div>
			<div className="inputs">
				<div className="input">
					<div className="label x" onMouseDown={sx.onMouseDown}>x</div>
					<input {...props} value={x} id={name + ".x"} name={name + ".x"} placeholder={name + ".x"} type="number" onChange={(e) => update(new Vector3(+e.target.value, y, z))} />
				</div>
				<div className="input" onMouseDown={sy.onMouseDown}>
					<div className="label y">y</div>
					<input {...props} value={y} id={name + ".y"} name={name + ".y"} placeholder={name + ".y"} type="number" onChange={(e) => update(new Vector3(x, +e.target.value, z))} />
				</div>
				<div className="input" onMouseDown={sz.onMouseDown}>
					<div className="label z">z</div>
					<input {...props} value={z} id={name + ".z"} name={name + ".z"} placeholder={name + ".z"} type="number" onChange={(e) => update(new Vector3(x, y, +e.target.value))} />
				</div>
			</div>
		</div>
	);
};

export const SettingsView = <T extends Settings>({ settings, type, onChange }: { settings: T, type: new (...args: any[]) => T, onChange?: SettingsChangeHandler<T> }) => {
	const state = use(settings) as any;
	const inputs = Settings.getInputs(type);

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