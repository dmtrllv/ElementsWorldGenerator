import type { ParamGroup } from "../../../generator/param-groups";
import { Curve, Float, Range, Scalar, VectorField } from "../../../generator/params";
import { useObservable } from "../../../reactive";
import { NumberInput } from "../input";
import { CurveEditor } from "./curve-input";
import { RangeInput } from "./range-input";
import { ScalarInput } from "./scalar-input";
import { VectorFieldInput } from "./vector-field-input";
import { DropdownPanel } from "../dropdown";

import "./styles/group-input.scss";

export const GroupInput = ({ group }: { group: ParamGroup<any> }) => {
	group = useObservable(group);

	const params = group.params();
	const groups = group.subGroups();

	
	const title = (
		<h4>
			{group.name}
		</h4>
	);

	return (
		<DropdownPanel className="group-input" title={title} open={false}>
			{Object.values(params).map(param => <ParamInput key={param.name} param={param} />)}
			{Object.values(groups).map(group => <GroupInput key={group.name} group={group} />)}
		</DropdownPanel>
	);
};

export const ParamInput = ({ param }: { param: any }) => {
	if (param instanceof Curve)
		return <CurveEditor curve={param} />;

	if (param instanceof Scalar)
		return <ScalarInput scalar={param} />;

	if (param instanceof Float)
		return <NumberInput name={param.name} value={param.state} onChange={v => param.state = v} />;

	if (param instanceof VectorField)
		return <VectorFieldInput vectorField={param} />;

	if (param instanceof Range)
		return <RangeInput name={param.name} range={param} />;

	return null;
};