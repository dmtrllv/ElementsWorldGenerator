import type { Vector3 } from "three";
import { nameToLabel, type InputComponent } from "./input";
import { useSlider } from "../../hooks/slider";
import { useState, useRef, useEffect } from "react";

import "./styles/input.scss";

export const Vector3Input: InputComponent<Vector3> = ({ onChange, value, name }) => {
	const sx = useSlider(value.x, -Infinity, Infinity, "y", -1);
	const sy = useSlider(value.y, -Infinity, Infinity, "y", -1);
	const sz = useSlider(value.z, -Infinity, Infinity, "y", -1);

	const [x, setX] = useState(value.x.toString());
	const [y, setY] = useState(value.y.toString());
	const [z, setZ] = useState(value.z.toString());

	const prevX = useRef(x);
	const prevY = useRef(y);
	const prevZ = useRef(z);

	const updateX = (v: string) => {
		setX(v);
		const val = parseFloat(v);
		if (Number.isFinite(val) && !Number.isNaN(val)) {
			sx.set(val);
			value.x = val;
			onChange?.(value);
		}
	};

	const updateY = (v: string) => {
		setY(v);
		const val = parseFloat(v);
		if (Number.isFinite(val) && !Number.isNaN(val)) {
			sy.set(val);
			value.y = val;
			onChange?.(value);
		}
	};

	const updateZ = (v: string) => {
		setZ(v);
		const val = parseFloat(v);
		if (Number.isFinite(val) && !Number.isNaN(val)) {
			sz.set(val);
			value.z = val;
			onChange?.(value);
		}
	};

	useEffect(() => {
		const vx = x.toString();
		if (prevX.current !== vx) {
			prevX.current = vx;
			updateX(vx);
			onChange?.(value);
		}

		const vy = y.toString();
		if (prevY.current !== vy) {
			prevY.current = vy;
			updateY(vy);
			onChange?.(value);
		}

		const vz = z.toString();
		if (prevZ.current !== vz) {
			prevZ.current = vz;
			updateZ(vz);
			onChange?.(value);
		}
	}, [value.x, value.y, value.z]);

	useEffect(() => {
		const vx = sx.size.toString();
		if (prevX.current !== vx) {
			prevX.current = vx;
			updateX(vx);
		}

		const vy = sy.size.toString();
		if (prevY.current !== vy) {
			prevY.current = vy;
			updateY(vy);
		}


		const vz = sz.size.toString();
		if (prevZ.current !== vz) {
			prevZ.current = vz;
			updateZ(vz);
		}
	}, [sx.size, sy.size, sz.size])

	const fixInput = () => {
		const inputX = parseFloat(x);
		const inputY = parseFloat(y);
		const inputZ = parseFloat(z);

		let updated = false;

		if (x.length === 0 || Number.isNaN(inputX) || !Number.isFinite(inputX)) {
			setX("0");
			updated = true;
		} else if (inputX.toString() !== x) {
			setX(inputX.toString());
			value.x = inputX;
			updated = true;
		}

		if (y.length === 0 || Number.isNaN(inputY) || !Number.isFinite(inputY)) {
			setY("0");
			updated = true;
		} else if (inputY.toString() !== y) {
			setY(inputY.toString());
			value.y = inputY;
			updated = true;
		}

		if (z.length === 0 || Number.isNaN(inputZ) || !Number.isFinite(inputZ)) {
			setZ("0");
			updated = true;
		} else if (inputZ.toString() !== z) {
			setZ(inputZ.toString());
			value.z = inputZ;
			updated = true;
		}

		if (updated) {
			onChange?.(value);
		}
	};

	return (
		<div className="input-field vec2">
			<div className="label">{nameToLabel(name)}:</div>
			<div className="inputs">
				<div className="input">
					<div className="label x" onMouseDown={sx.onMouseDown}>x</div>
					<input value={x} id={name + ".x"} name={name + ".x"} placeholder={name + ".x"} type="text" onChange={e => updateX(e.target.value)} onBlur={fixInput} />
				</div>
				<div className="input" >
					<div className="label y" onMouseDown={sy.onMouseDown}>y</div>
					<input value={y} id={name + ".y"} name={name + ".y"} placeholder={name + ".y"} type="text" onChange={e => updateY(e.target.value)} onBlur={fixInput} />
				</div>
				<div className="input" >
					<div className="label z" onMouseDown={sz.onMouseDown}>z</div>
					<input value={z} id={name + ".z"} name={name + ".z"} placeholder={name + ".z"} type="text" onChange={e => updateZ(e.target.value)} onBlur={fixInput} />
				</div>
			</div>
		</div>
	);
};