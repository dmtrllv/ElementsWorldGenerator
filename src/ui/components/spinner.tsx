import "./styles/spinner.scss";

export const Spinner = ({ className }: { className?: string }) => {
	return (
		<svg className={`spinner ${className || ""}`} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
			<circle className="spinner-track" cx="50" cy="50" r="38" />
			<circle className="spinner-ring" cx="50" cy="50" r="38" />
			<circle className="spinner-dot" cx="50" cy="12" r="4" />
		</svg>
	);
};