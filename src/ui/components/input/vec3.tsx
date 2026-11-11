import type { Vector3 } from "three";
import { nameToLabel, type InputComponent } from "./input";
import { useSlider } from "../../hooks/slider";
import { useState, useEffect } from "react";

import "./styles/input.scss";

export const Vector3Input: InputComponent<Vector3> = ({ onChange, value, name }) => {
	const sx = useSlider(value.x, -Infinity, Infinity, "y", -1);
	const sy = useSlider(value.y, -Infinity, Infinity, "y", -1);
	const sz = useSlider(value.z, -Infinity, Infinity, "y", -1);

	const [x, setX] = useState(value.x.toString());
	const [y, setY] = useState(value.y.toString());
	const [z, setZ] = useState(value.z.toString());

	const fixInput = () => {
		const inputX = parseFloat(x);
		const inputY = parseFloat(y);
		const inputZ = parseFloat(z);

		const nextX = Number.isFinite(inputX) ? inputX : 0;
		const nextY = Number.isFinite(inputY) ? inputY : 0;
		const nextZ = Number.isFinite(inputZ) ? inputZ : 0;

		setX(nextX.toString());
		setY(nextY.toString());
		setZ(nextZ.toString());

		sx.set(nextX);
		sy.set(nextY);
		sz.set(nextZ);

		value.set(nextX, nextY, nextZ);
		onChange?.(value);
	};

	const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter")
			e.currentTarget.blur();
	};

	useEffect(() => {
		setX(value.x.toString());
		setY(value.y.toString());
		setZ(value.z.toString());
	}, [value.x, value.y, value.z]);

	useEffect(() => {
		setX(sx.size.toString());
		value.x = sx.size;
		onChange?.(value);
	}, [sx.size]);

	useEffect(() => {
		setY(sy.size.toString());
		value.y = sy.size;
		onChange?.(value);
	}, [sy.size]);

	useEffect(() => {
		setZ(sz.size.toString());
		value.z = sz.size;
		onChange?.(value);
	}, [sz.size]);

	return (
		<div className="input-field vec2">
			<div className="label">{nameToLabel(name)}:</div>
			<div className="inputs">
				<div className="input">
					<div className="label x" onMouseDown={sx.onMouseDown}>x</div>
					<input value={x} id={name + ".x"} name={name + ".x"} placeholder={name + ".x"} type="text" onChange={e => setX(e.target.value)} onBlur={fixInput} onKeyDown={onKeyDown} />
				</div>
				<div className="input">
					<div className="label y" onMouseDown={sy.onMouseDown}>y</div>
					<input value={y} id={name + ".y"} name={name + ".y"} placeholder={name + ".y"} type="text" onChange={e => setY(e.target.value)} onBlur={fixInput} onKeyDown={onKeyDown} />
				</div>
				<div className="input">
					<div className="label z" onMouseDown={sz.onMouseDown}>z</div>
					<input value={z} id={name + ".z"} name={name + ".z"} placeholder={name + ".z"} type="text" onChange={e => setZ(e.target.value)} onBlur={fixInput} onKeyDown={onKeyDown} />
				</div>
			</div>
		</div>
	);
};