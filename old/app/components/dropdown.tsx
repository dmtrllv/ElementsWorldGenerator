import { useState, type PropsWithChildren } from "react";

import "./styles/dropdown.scss";

export const DropdownPanel = ({ title, children, ...props }: PropsWithChildren<DropdownPanelProps>) => {
	const [open, setOpen] = useState(props.open !== undefined ? props.open : true);

	return (
		<div className={`dropdown-panel ${open ? "open" : ""}`}>
			<div className="header" onClick={() => setOpen(!open)}>
				<h2>{title}</h2>
				<div className="icon">
					&#8595;
				</div>
			</div>
			<div className="body">
				{children}
			</div>
		</div>
	);
};

export type DropdownPanelProps = {
	title: string;
	open?: boolean;
};