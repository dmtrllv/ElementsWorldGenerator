import { useEffect, useRef, useState } from "react";
import type { Range } from "../../../generator/params";
import { useSlider } from "../../hooks/slider";
import { nameToLabel } from "../input";
import { useObservable } from "../../../reactive";

import "./styles/range.scss";

export const RangeInput = ({ range, name }: { range: Range, name: string }) => {
	const state = useObservable(range.state);

	const sx = useSlider(state[0], -Infinity, Infinity, "y", -0.05);
	const sy = useSlider(state[1], -Infinity, Infinity, "y", -0.05);

	const [x, setX] = useState(state[0].toString());
	const [y, setY] = useState(state[1].toString());
	const prevX = useRef(x);
	const prevY = useRef(y);


	const updateX = (value: string) => {
		setX(value);
		const val = parseFloat(value);
		if (Number.isFinite(val) && !Number.isNaN(val)) {
			sx.set(val);
			state[0] = val;
		}
	};

	const updateY = (value: string) => {
		setY(value);
		const val = parseFloat(value);
		if (Number.isFinite(val) && !Number.isNaN(val)) {
			sy.set(val);
			state[1] = val;
		}
	};

	useEffect(() => {
		const vx = x.toString();
		if (prevX.current !== vx) {
			prevX.current = vx;
			updateX(vx);
		}

		const vy = y.toString();
		if (prevY.current !== vy) {
			prevY.current = vy;
			updateY(vy);
		}
	}, [state[0], state[1]]);

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
		
		if (x.length === 0 || Number.isNaN(inputX) || !Number.isFinite(inputX)) {
			setX("0");
		} else {
			setX(inputX.toString());
		}
		
		if (y.length === 0 || Number.isNaN(inputY) || !Number.isFinite(inputY)) {
			setY("0")
		} else {
			setY(inputY.toString())
		}
	};

	return (
		<div className="input-field range">
			<div className="label">{nameToLabel(range.name)}:</div>
			<div className="inputs">
				<div className="input">
					<div className="label min" onMouseDown={sx.onMouseDown}>min</div>
					<input value={x} className={name + ".min"} name={name + ".min"} placeholder={name + ".min"} type="text" onChange={e => updateX(e.target.value)} onBlur={fixInput}/>
				</div>
				<div className="input" >
					<div className="label max" onMouseDown={sy.onMouseDown}>max</div>
					<input value={y} className={name + ".max"} name={name + ".max"} placeholder={name + ".max"} type="text" onChange={e => updateY(e.target.value)} onBlur={fixInput}/>
				</div>
			</div>
		</div>
	);
};