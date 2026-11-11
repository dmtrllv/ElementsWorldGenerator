import type { Vector2 } from "three";
import { nameToLabel, type InputComponent } from "./input";
import { useSlider } from "../../hooks/slider";
import { useState, useEffect } from "react";

import "./styles/input.scss";

export const Vector2Input: InputComponent<Vector2> = ({ onChange, value, name }) => {
	const sx = useSlider(value.x, -Infinity, Infinity, "y", -1);
	const sy = useSlider(value.y, -Infinity, Infinity, "y", -1);

	const [x, setX] = useState(value.x.toString());
	const [y, setY] = useState(value.y.toString());

	const fixInput = () => {
		const inputX = parseFloat(x);
		const inputY = parseFloat(y);

		const nextX = Number.isFinite(inputX) ? inputX : 0;
		const nextY = Number.isFinite(inputY) ? inputY : 0;

		setX(nextX.toString());
		setY(nextY.toString());

		sx.set(nextX);
		sy.set(nextY);

		value.set(nextX, nextY);
		onChange?.(value);
	};

	const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter")
			e.currentTarget.blur();
	};

	useEffect(() => {
		setX(value.x.toString());
		setY(value.y.toString());
	}, [value.x, value.y]);

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
			</div>
		</div>
	);
};