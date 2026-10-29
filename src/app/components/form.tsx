import { useRef, useState, type PropsWithChildren } from "react";
import { DropdownPanel } from "./dropdown";
import { Vector2, Vector3 } from "three";

import "./styles/form.scss";

const RenderFormInput = ({ inputKey, section, input, submit }: { inputKey: string, submit: Function, section: FormSection<any, any>, input: FormInputs[string] }) => {
	const state = section[STATE_TAG][0][inputKey];
	const updateState = (e: React.ChangeEvent<any>) => section.set(inputKey, e.target.value);

	switch (input.type) {
		case "number":
			return <input className="number" id={`input-${inputKey}`} name={input.name} placeholder={input.name} type="number" value={state} onChange={e => section.set(inputKey, +e.target.value)} />
		case "text":
			return <input className="text" id={`input-${inputKey}`} name={input.name} placeholder={input.name} type="text" value={state} onChange={updateState} />
		case "slider":
			return <input className="slider" id={`input-${inputKey}`} name={input.name} placeholder={input.name} type="number" value={state} onChange={e => section.set(inputKey, +e.target.value)} />
		case "toggle":
			return <input className="toggle" id={`input-${inputKey}`} name={input.name} placeholder={input.name} type="checkbox" value={state} onChange={updateState} />
		case "dropdown":
			return <select id={`input-${inputKey}`} className="select" onChange={updateState}>
				{input.values.map((val, i) => <option value={val} key={i}>{val}</option>)}
			</select>
		case "submit":
			return <button className="btn submit" name={input.name} type="submit" onClick={(e) => { e.preventDefault(); submit(); }}>{input.name}</button>
		case "reset":
			return <button className="btn reset" name={input.name} type="reset" onClick={section.reset}>{input.name}</button>
		case "button":
			return <button className="btn" name={input.name} type="button" onClick={input.handler}>{input.name}</button>
		case "vec2":
			return <div className="input-group">
				<label htmlFor={`input-${inputKey}-x`}>x: </label><input className="vec2-x" id={`input-${inputKey}-x`} name={input.name + ".x"} placeholder={input.name + ".x"} type="number" value={state.x} onChange={e => section.set(inputKey, new Vector2(+e.target.value, state.y))} />
				<label htmlFor={`input-${inputKey}-y`}>y: </label><input className="vec2-y" id={`input-${inputKey}-y`} name={input.name + ".y"} placeholder={input.name + ".y"} type="number" value={state.y} onChange={e => section.set(inputKey, new Vector2(state.x, +e.target.value))} />
			</div>
		case "vec3":
			return <div className="input-group">
				<label htmlFor={`input-${inputKey}-x`}>x: </label><input className="vec3-x" id={`input-${inputKey}-x`} name={input.name + ".x"} placeholder={input.name + ".x"} type="number" value={state.x} onChange={e => section.set(inputKey, new Vector3(+e.target.value, state.y, state.z))} />
				<label htmlFor={`input-${inputKey}-y`}>y: </label><input className="vec3-y" id={`input-${inputKey}-y`} name={input.name + ".y"} placeholder={input.name + ".y"} type="number" value={state.y} onChange={e => section.set(inputKey, new Vector3(state.x, +e.target.value, state.z))} />
				<label htmlFor={`input-${inputKey}-z`}>z: </label><input className="vec3-z" id={`input-${inputKey}-z`} name={input.name + ".z"} placeholder={input.name + ".z"} type="number" value={state.z} onChange={e => section.set(inputKey, new Vector3(state.x, state.y, +e.target.value))} />
			</div>
	}
}

const Label = ({ id, input }: { id: string, input: FormInputType }) => {
	switch (input.type) {
		case "submit":
		case "reset":
		case "button":
			return null;
		case "vec2":
		case "vec3":
			return <div className="label">{input.name}: </div>;
		default:
			return <label htmlFor={`input-${id}`}>{input.name}: </label>;
	}
}

export const Form = <T extends FormSection<any, any>[]>({ sections, onSubmit, children, ...props }: PropsWithChildren<FormProps<T>>) => {
	const submit = () => {
		if(onSubmit) {
			const result = Object.fromEntries(sections.map((props) => [props.id, { ...props[STATE_TAG][0] }]));
			onSubmit(result as SubmitData<T>);
		}
	};
	return (
		<form {...props}>
			{sections.map((section) => {
				return (
					<DropdownPanel key={section.title} title={section.title}>
						{Object.keys(section.inputs).map(key => {
							const val = section.inputs[key]!;
							return (
								<div key={key} className={`input-field ${val.type}`}>
									<Label id={key} input={val} />
									{/*{hasLabel(val) && <label htmlFor={`input-${key}`}>{val.name}: </label>}*/}
									<RenderFormInput inputKey={key} section={section} input={val} submit={submit} />
								</div>
							)
						})}
					</DropdownPanel>
				)
			})}
			{children}
		</form>
	);
};

export type FormProps<T extends FormSection<any, any>[]> = {
	sections: T,
	onSubmit?: FormSubmitter<T>,
	className?: string;
	id?: string;
};

export type FormData = FormSection<any, FormInputs>[];

export type InputValue<T> =
	T extends TextInputType | DropdownInputType<string> ? string :
	T extends ResetInputType | ButtonInputType | SubmitInputType ? never :
	T extends ToggleInputType ? boolean :
	T extends Vector2Type ? Vector2 :
	T extends Vector3Type ? Vector3 :
	number;

export type FormSubmitter<T extends FormSection<any, any>[]> = (data: SubmitData<T>) => any;

export type SubmitData<T extends FormSection<any, any>[]> = {
	[Section in T[number]as Section["id"]]: {
		[K in keyof Section["inputs"]]: InputValue<Section["inputs"][K]>
	};
};


const STATE_TAG = Symbol("FORM_SECTION_STATE");

type FormSectionState = [Record<string, any>, React.Dispatch<React.SetStateAction<Record<string, any>>>];

export type FormSection<Id extends string, T extends FormInputs> = {
	readonly id: Id;
	readonly title: string;
	readonly inputs: Readonly<T>;
	readonly set: <K extends keyof T>(key: K, value: InputValue<T[K]>) => void;
	readonly get: <K extends keyof T>(key: K) => InputValue<T[K]>;
	readonly reset: () => void;
	readonly values: () => { [K in keyof T]: InputValue<T[K]> };
	readonly update: (v: { [K in keyof T]: InputValue<T[K]> }) => void;
	readonly [STATE_TAG]: FormSectionState;
};

export function useFormSection<const Id extends string, const T extends FormInputs>(id: Id, title: string, inputs: T): FormSection<Id, T> {
	const [state, setState] = useState(() => {
		const values: Record<string, any> = {};
		for (const k in inputs)
			values[k] = inputs[k].default;
		return values;
	});
	const defaultValues = useRef({ ...state });

	return {
		id,
		title,
		inputs,
		set(key, value) {
			setState((s) => ({ ...s, [key]: value }));
		},
		get(key) {
			return state[key as keyof typeof state];
		},
		reset() {
			setState(defaultValues.current);
		},
		values() {
			return state as any;
		},
		update(val) {
			setState(val);
		},
		[STATE_TAG]: [state, setState]
	};
};




export type FormInputs = Record<string, FormInputType>;

export type FormInputType =
	| TextInputType
	| NumberInputType
	| SliderInputType
	| ToggleInputType
	| DropdownInputType<string>
	| SubmitInputType
	| ResetInputType
	| ButtonInputType
	| Vector2Type
	| Vector3Type;

export type TextInputType = {
	readonly name: string;
	readonly type: "text";
	readonly default: string;
};

export const text = (name: string, defaultValue: string): TextInputType => {
	return {
		name,
		type: "text",
		default: defaultValue,
	};
};

export type NumberInputType = {
	readonly name: string;
	readonly type: "number";
	readonly default: number;
};

export type SliderInputType = {
	readonly name: string;
	readonly type: "slider";
	readonly default: number;
};

export type NumberInputOptions = {
	readonly min?: number;
	readonly max?: number;
	readonly step?: number;
};

export const number = (name: string, defaultValue: number, options: NumberInputOptions): NumberInputType => {
	return {
		name,
		type: "number",
		default: defaultValue,
		...options
	};
};

export const slider = (name: string, defaultValue: number, options: NumberInputOptions): SliderInputType => {
	return {
		name,
		type: "slider",
		default: defaultValue,
		...options
	};
};

export type ToggleInputType = {
	readonly name: string;
	readonly type: "toggle";
	readonly default: boolean;
};


export type DropdownInputType<T extends string> = {
	readonly name: string;
	readonly type: "dropdown";
	readonly values: T[];
	readonly default: T;
};

export const dropdown = <T extends string>(name: string, values: T[]): DropdownInputType<T> => {
	return {
		name,
		type: "dropdown",
		values,
		default: values[0]!
	};
};

export type SubmitInputType = {
	readonly name: string;
	readonly type: "submit";
	readonly default: string;
};

export const submit = (name: string): SubmitInputType => {
	return {
		name,
		type: "submit",
		default: "submit"
	};
};

export type ResetInputType = {
	readonly name: string;
	readonly type: "reset";
	readonly targets: string[];
	readonly default: string;
};

export const reset = (name: string, targets: string[] = []): ResetInputType => {
	return {
		name,
		type: "reset",
		targets,
		default: "reset"
	};
};

export type ButtonInputType = {
	readonly name: string;
	readonly type: "button";
	readonly handler: () => any;
	readonly default: string;
};

export const button = (text: string, handler: () => any): ButtonInputType => {
	return {
		name: text,
		type: "button",
		handler,
		default: "button"
	};
};


export type Vector2Type = {
	readonly name: string;
	readonly type: "vec2";
	readonly default: Vector2;
};

export const vector2 = (text: string, value: Vector2): Vector2Type => {
	return {
		name: text,
		type: "vec2",
		default: value
	};
};

export type Vector3Type = {
	readonly name: string;
	readonly type: "vec3";
	readonly default: Vector3;
};

export const vector3 = (text: string, value: Vector3): Vector3Type => {
	return {
		name: text,
		type: "vec3",
		default: value
	};
};