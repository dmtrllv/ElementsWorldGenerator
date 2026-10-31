import react from "@vitejs/plugin-react-swc";
import { defineConfig, type Plugin } from "vite";

const workerModules = new Set<string>();
const virtualStyle = "\0worker:ignored-style";

const cleanId = (id: string) => id.replace(/[?#].*$/, "");
const isStyle = (id: string) => /\.(css|scss|sass|less|styl|stylus)(\?.*)?$/.test(id);

function ignoreWorkerStyles(): Plugin {
	return {
		name: "ignore-worker-styles",
		enforce: "pre",

		transform(_code, id) {
			// Identify Vite's development worker entry.
			if (id.includes("worker_file")) {
				workerModules.add(cleanId(id));
			}
		},

		async resolveId(source, importer) {
			if (!importer || !workerModules.has(cleanId(importer))) return null;

			const resolved = await this.resolve(source, importer, { skipSelf: true });

			if (!resolved || resolved.external) return null;

			// Replace styles with an empty module.
			if (isStyle(resolved.id)) {
				return virtualStyle;
			}

			// Track the worker's transitive imports.
			workerModules.add(cleanId(resolved.id));

			return resolved;
		},

		load(id) {
			if (id === virtualStyle) {
				return "export default {};";
			}
		}
	};
}

function ignoreAllWorkerStyles(): Plugin {
	return {
		name: "ignore-all-worker-styles",
		enforce: "pre",

		resolveId(source) {
			if (isStyle(source)) return virtualStyle;
		},

		load(id) {
			if (id === virtualStyle) return "export default {};";
		}
	};
}

export default defineConfig({
	plugins: [
		react({ tsDecorators: true }),
		ignoreWorkerStyles()
	],
	ssr: {
		target: "webworker"
	}
});