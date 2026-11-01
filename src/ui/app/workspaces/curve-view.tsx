import type { CurveEditorWorkspace } from "../../../editor/workspace";
import { CurveEditor } from "../../components/curve-editor";

export const CurveWorkspaceView = ({ workspace }: { workspace: CurveEditorWorkspace }) => {
	return (
		<div className="curve-workspace">
			<CurveEditor curve={workspace.curve} />
		</div>
	);
};