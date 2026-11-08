import type { Vector2 } from "three";
import { nameToLabel, type InputComponent } from "./input";
import { useSlider } from "../../hooks/slider";
import { useState, useRef, useEffect } from "react";

import "./styles/input.scss";

export const Vector2Input: InputComponent<Vector2> = ({ onChange, value, name }) => {
	const sx = useSlider(value.x, -Infinity, Infinity, "y", -1);
	const sy = useSlider(value.y, -Infinity, Infinity, "y", -1);

	const [x, setX] = useState(value.x.toString());
	const [y, setY] = useState(value.y.toString());
	const prevX = useRef(x);
	const prevY = useRef(y);


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
	}, [value.x, value.y]);

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
	}, [sx.size, sy.size])

	const fixInput = () => {
		const inputX = parseFloat(x);
		const inputY = parseFloat(y);

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
			</div>
		</div>
	);
};
