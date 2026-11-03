import { observe } from "../../../state";
import { nameToLabel, NumberInput } from "../input";
import type { Scalar } from "../../../generator/params";
import { DropdownPanel } from "../dropdown";

import "./styles/scalar-input.scss";

export const ScalarInput = ({ scalar }: { scalar: Scalar }) => {
	const state = observe(scalar.state);

	return (
		<DropdownPanel className="scalar-input" title={<h4>{nameToLabel(scalar.name)} <span>(noise)</span></h4>} open={false}>
			<div className="scalar-inputs">
				<NumberInput name="scale" value={state.scale} onChange={v => state.scale = v} />
				<NumberInput name="strength" value={state.strength} onChange={v => state.strength = v} />
				<NumberInput name="persistence" value={state.persistence} onChange={v => state.persistence = v} />
				<NumberInput name="lacunarity" value={state.lacunarity} onChange={v => state.lacunarity = v} />
				<NumberInput name="octaves" value={state.octaves} onChange={v => state.octaves = v} />
			</div>
		</DropdownPanel>
	);
}