export type InputComponentProps<T> = {
	readonly name: string;
	readonly value: T,
	readonly onChange?: (value: T) => void
};

export type InputComponent<T, P extends {} = {}> = React.FC<InputComponentProps<T> & Partial<P>>;

export const nameToLabel = (name: string) => name.split("").map((s, i) => {
	if (i === 0)
		return s.toUpperCase();
	if (s === ".")
		return " ";
	if (s.toUpperCase() === s)
		return ` ${s.toLowerCase()}`;
	return s;
}).join("");
