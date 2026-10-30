import { Vector3 } from "three";
import { state } from "../state";
import { Serializer } from "./serializer";

const INPUTS = Symbol("INPUTS");

type InputMap = Record<string, {
	header?: string,
	section?: string,
	Component?: InputComponent<any, any>,
	props?: any;
}>;

const DESERIALIZED_PROPS = Symbol("DESERIALIZE_PROPS");

export abstract class Settings {
	public static readonly getInputs = <T extends new () => Settings>(target: T): InputMap => {
		let ctor = target as any;
		if (!ctor[INPUTS])
			ctor[INPUTS] = {};
		return ctor[INPUTS];
	}

	public constructor(data: { [DESERIALIZED_PROPS]: any });
	public constructor();
	public constructor(data?: { [DESERIALIZED_PROPS]: any }) {
		if (data)
			Object.assign(this, data[DESERIALIZED_PROPS])
	}
}

export class Vector3Serializer extends Serializer<Vector3> {
	protected serialize(v: Vector3): string {
		return JSON.stringify(v);
	}

	protected deserialize(target: new () => Vector3, string: string): Vector3 {
		const { x, y, z } = JSON.parse(string);
		return new Vector3(x, y, z);
	}
}

export const input = <T extends Settings, K extends keyof T, P extends {}>(Component: InputComponent<T[K], P>, { label, ...props }: Partial<P & { label?: string }> = {}) => (target: T, key: K) => {
	state(target, key);
	const inputs = Settings.getInputs(target.constructor as any);
	const k = key as any;
	if (!(key in inputs))
		inputs[k] = {};
	Object.assign(inputs[k], { Component, props: { ...props }, label });
};

export const header = <T extends Settings, K extends keyof T>(title: string) => (target: T, key: K) => {
	const inputs = Settings.getInputs(target.constructor as any);
	const k = key as any;
	if (!(key in inputs))
		inputs[k] = {};
	Object.assign(inputs[k], { header: title, });
};

export const section = <T extends Settings, K extends keyof T>(title: string) => (target: T, key: K) => {
	const inputs = Settings.getInputs(target.constructor as any);
	const k = key as any;
	if (!(key in inputs))
		inputs[k] = {};
	Object.assign(inputs[k], { section: title, });
};

export type InputComponent<T, P extends {} = {}> = React.FC<InputComponentProps<T> & Partial<P>>;

export type InputComponentProps<T> = {
	readonly name: string;
	readonly label?: string;
	readonly value: T,
	readonly onChange: (value: T) => void
};