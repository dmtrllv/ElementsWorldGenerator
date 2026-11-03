import type { ParamGroup } from "../../../generator/param-groups/param-group";
import { Curve, Float, Range, Scalar, VectorField } from "../../../generator/params";
import { useObservable } from "../../../reactive";
import { NumberInput } from "../input";
import { CurveEditor } from "./curve-input";
import { RangeInput } from "./range-input";
import { ScalarInput } from "./scalar-input";
import { VectorFieldInput } from "./vector-field-input";
import { DropdownPanel } from "../dropdown";
import { Editor } from "../../../editor";
import { WorkspaceManager } from "../../../editor/workspace";
import { ParamGroupWorkspace } from "../../../editor/workspaces/param-group-workspace";

import "./styles/group-input.scss";

export const GroupInput = ({ group }: { group: ParamGroup<any> }) => {
	const workspaces = Editor.useModule(WorkspaceManager);
	group = useObservable(group);
	const hasPreview = true; // group.hasPreview
	const params = group.params();
	const groups = group.subGroups();

	const preview = (e: React.MouseEvent) => {
		if (!hasPreview) {
			return;
		}

		e.preventDefault();
		e.stopPropagation();

		workspaces.open(ParamGroupWorkspace, `${group.name} - Param Group`, group);
	};

	const title = (
		<h4>
			{group.name}
			{hasPreview && <i onClick={preview} className="fa-solid fa-play" />}
		</h4>
	);

	return (
		<DropdownPanel className="group-input" title={title}>
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
		return <RangeInput range={param} />;

	return null;
};