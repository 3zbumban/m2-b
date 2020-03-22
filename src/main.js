import App from './App.svelte';
import data from "./m2_alt.json";

const app = new App({
	target: document.body,
	props: {
		data
	}
});

export default app;