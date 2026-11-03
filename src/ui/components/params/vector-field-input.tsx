import { useObservable } from "../../../reactive";
import { nameToLabel, NumberInput } from "../input";
import type { VectorField } from "../../../generator/params";
import { DropdownPanel } from "../dropdown";

import "./styles/vector-field-input.scss";

export const VectorFieldInput = ({ vectorField }: { vectorField: VectorField }) => {
	const state = useObservable(vectorField.state);

	return (
		<DropdownPanel className="vector-field-input" title={<h4>{nameToLabel(vectorField.name)} <span>(vector field)</span></h4>} open={false}>
				<NumberInput name="scale" value={state.scale} onChange={v => state.scale = v} />
				<NumberInput name="strength" value={state.strength} onChange={v => state.strength = v} />
				<NumberInput name="scale" value={state.scale} onChange={v => state.scale = v} />
				<NumberInput name="persistence" value={state.persistence} onChange={v => state.persistence = v} />
				<NumberInput name="lacunarity" value={state.lacunarity} onChange={v => state.lacunarity = v} />
				<NumberInput name="octaves" value={state.octaves} onChange={v => state.octaves = v} />
		</DropdownPanel>
	);
}