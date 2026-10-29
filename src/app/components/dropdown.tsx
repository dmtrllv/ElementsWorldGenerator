import { useState, type PropsWithChildren } from "react";

export const DropdownPanel = ({ title, children }: PropsWithChildren<DropdownPanelProps>) => {
	const [open, setOpen] = useState(true);

	return (
		<div className="dropdown-panel">
			<div className="header">
				<h2>{title}</h2>
			</div>
			<div className="body" style={{ height: open ? "0px" : "auto" }}>
				{children}
			</div>
		</div>
	);
};

export type DropdownPanelProps = {
	title: string;
};