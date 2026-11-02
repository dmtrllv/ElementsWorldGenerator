import type { ParamGroup } from "../../../generator/param-groups/param-group";
import { Curve, Float, Range, Scalar, VectorField } from "../../../generator/params";
import { observe } from "../../../state";
import { NumberInput } from "../input";
import { CurveEditor } from "./curve-input";
import { RangeInput } from "./range-input";
import { ScalarInput } from "./scalar-input";
import { VectorFieldInput } from "./vector-field-input";
import { DropdownPanel } from "../dropdown";

import "./styles/group-input.scss";

export const GroupInput = ({ group }: { group: ParamGroup }) => {
	group = observe(group);

	const params = group.params();
	const groups = group.subGroups();

	return (
		<DropdownPanel className="group-input" title={group.name}>
			{Object.values(params).map(param => <ParamInput key={param.name} param={param} />)}
			{Object.values(groups).map(group => <GroupInput key={group.name} group={group} />)}
		</DropdownPanel>
	);
};

export const ParamInput = ({ param }: { param: any }) => {
	switch (param.constructor) {
		case Curve:
			return <CurveEditor curve={param} />;
		case Scalar:
			return <ScalarInput scalar={param} />;
		case Float:
			return <NumberInput name={param.name} value={param.state} onChange={v => param.state = v} />;
		case VectorField:
			return <VectorFieldInput vectorField={param} />;
		case Range:
			return <RangeInput range={param} />;
	}
	return null;
};