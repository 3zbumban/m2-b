<script>
import marked from "marked";
import domPurify from "dompurify";
import fileSaver from "file-saver";

export let raw_data;

const data = localStorage.getItem("data") ? JSON.parse(localStorage.getItem("data")) : raw_data;
const themen = Object.keys(data);
const gh_url = "https://github.com/3zbumban/m2-b";

let currentThema = localStorage.getItem("currentThema") ? JSON.parse(localStorage.getItem("currentThema")) : 0;
let currentVid = "";
let active = {};
let preview = false;
let dark = localStorage.getItem("darkmode") ? JSON.parse(localStorage.getItem("darkmode")) : false;

$: notes = JSON.parse(localStorage.getItem("notes")) ? JSON.parse(localStorage.getItem("notes")) : themen.map(el => `# ${el}\n\n`);
$: next = currentThema<themen.length-1 ? currentThema+1 : 0;
$: prev = currentThema>0 ? currentThema-1 : themen.length-1;
$: console.log(`[i] currentThema: ${themen[currentThema]}`);

window.addEventListener("beforeunload", (event) => {
	sync();
});

function go(dest) {
	currentThema=dest;
	sync();
	console.log(`[i] go: ${currentThema}`);
}

function clickVid(event) {
	console.log(event.target.href);
	currentVid = event.target.href;
}

function saveFile() {
	console.log(`%c ${notes[currentThema]}`, "background-color: green;")
	const blob = new Blob([notes[currentThema]], {type: "text/plain;charset=utf-8"});
	fileSaver.saveAs(URL.createObjectURL(blob), `${themen[currentThema]}.md`);
}

function toggle(i) {
	data[themen[currentThema]][i].done = !data[themen[currentThema]][i].done;
	sync();
}

function sync() {
	window.localStorage.setItem("notes", JSON.stringify(notes));
	window.localStorage.setItem("darkmode", JSON.stringify(dark));
	window.localStorage.setItem("data", JSON.stringify(data));
	window.localStorage.setItem("currentThema", JSON.stringify(currentThema));
}

</script>

<main class:dark>
<div id="material">
	<div id="currentTopic">
		<p class="">{currentThema+1}: {themen[currentThema]}</p>
	</div>
	<div id="themen">
		{#each data[themen[currentThema]] as t, i}
		<div class="{active.text === t.text && active.time === t.time ? "active" : ""} {t.done ? "done" : ""} topic" on:click={()=>{active.text = t.text; active.time = t.time}}>
			<div>
			{#if t.type === "text"}
				<span class="f2">📃{t.text}</span>
			{:else if t.type === "link"}
				<span>
					<span>🌐</span>
					<span>
						<a target="_blank" rel="noopener noreferrer" href={t.link}>{t.text}</a>
					</span>
				</span>
			{:else if t.type === "video"}
				<span>
					<span>📹</span>
					<span>
						<a on:click|preventDefault={event => clickVid(event)} href={t.link}>{t.text}</a>
					</span>
					<span class="time">@{t.time}</span>
				</span>
			{:else if t.type === "img"}
				<span><span>📷</span><img src={t.link} alt={t.text}></span>
			{:else}
				<span>Error! {t.type} case not found!!</span>
			{/if}
			</div>
				<div><span class="toggler" on:click={() => {toggle(i)}}>
				{#if !!t.done}
					<span>❌</span>
				{:else}
					<span>✔</span>
				{/if}
				</span></div>
			</div>
		{/each}
	</div>
	<div id="control">
		<!-- <div> -->
			<button class="" on:click={() => {go(prev)}}>&larr;
				<span class="">{prev+1}</span>
			</button>
			<button class="" on:click={() => {go(next)}}>&rarr;
				<span class="">{next+1}</span>
			</button>
		<!-- </div> -->
	</div>
</div>
<div id="video">
	{#if currentVid !== ""}
		<iframe title="player" width="" height="" src={`https://www.youtube-nocookie.com/embed/${new URL(currentVid).search.slice(3)}`} 
		frameborder="0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
	{/if}
</div>
<div id="notes">
		<div id="pad">
	{#if !preview}
			<textarea bind:value={notes[currentThema]} name="notes" id="" cols="30" rows="10" placeholder="take notes here..."></textarea>
	{:else}
			<div id="preview">
				<div>
					{@html domPurify.sanitize(marked(notes[currentThema]))}
				</div>
			</div>
	{/if}
		</div>
	<div id="pad-controls">
		<button class={preview ? "preview-btn-on" : ""} on:click={() => {preview = !preview}}>👁‍🗨</button>
		<button class="" on:click={saveFile}>💾</button>
		<button class="" on:click={() => {dark = !dark}}>
			{#if !dark}
				<span>🌑</span>
			{:else}
				<span>🌞</span>
			{/if}
		</button>
		<button class="gh" on:click={() => { window.open(gh_url)}}>
		<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="16"
			height="16" viewBox="0 0 32 32">
			<path
				d="M16 0c-8.84 0-16 7.16-16 16s7.16 16 16 16 16-7.16 16-16-7.16-16-16-16zM25.5 25.5c-1.24 1.24-2.67 2.2-4.27 2.88-0.41 0.17-0.82 0.32-1.24 0.45v-2.4c0-1.26-0.43-2.19-1.3-2.78 0.54-0.05 1.04-0.12 1.49-0.22s0.93-0.23 1.44-0.41 0.96-0.39 1.36-0.63 0.79-0.56 1.16-0.95 0.68-0.83 0.93-1.33 0.45-1.09 0.59-1.78 0.22-1.46 0.22-2.29c0-1.61-0.53-2.99-1.58-4.12 0.48-1.25 0.43-2.61-0.16-4.08l-0.39-0.05c-0.27-0.03-0.76 0.08-1.46 0.34s-1.49 0.69-2.37 1.28c-1.24-0.34-2.53-0.52-3.86-0.52-1.34 0-2.62 0.17-3.84 0.52-0.55-0.37-1.07-0.68-1.57-0.93-0.49-0.24-0.89-0.41-1.19-0.5s-0.57-0.14-0.83-0.16-0.42-0.03-0.49-0.02-0.12 0.02-0.16 0.03c-0.58 1.48-0.63 2.84-0.16 4.08-1.05 1.14-1.58 2.51-1.58 4.13 0 0.83 0.07 1.6 0.22 2.29s0.34 1.29 0.59 1.78 0.56 0.94 0.93 1.33 0.76 0.71 1.16 0.95 0.85 0.46 1.36 0.63 0.98 0.31 1.44 0.41 0.95 0.17 1.49 0.22c-0.85 0.58-1.28 1.51-1.28 2.78v2.44c-0.47-0.14-0.94-0.31-1.39-0.5-1.6-0.68-3.04-1.65-4.27-2.88-1.24-1.24-2.2-2.67-2.88-4.27-0.7-1.65-1.05-3.41-1.05-5.23s0.36-3.57 1.06-5.23c0.68-1.6 1.65-3.04 2.88-4.27s2.67-2.2 4.27-2.88c1.66-0.7 3.42-1.05 5.23-1.05s3.58 0.36 5.23 1.06c1.6 0.68 3.04 1.65 4.27 2.88 1.24 1.24 2.2 2.67 2.88 4.27 0.7 1.66 1.06 3.42 1.06 5.23s-0.35 3.58-1.05 5.23c-0.68 1.6-1.65 3.04-2.88 4.27z"
				fill="#000000">
			</path>
		</svg>
		</button>
	</div>
</div>
</main>

<style lang="scss">
@import "../node_modules/normalize.css/normalize";

:global(body) {
	padding: 0;
	overflow: hidden;
}

.dark {
	* {
		border-color: lightblue;
	}
	div {
		background-color: black;
	}
	textarea {
		background-color: black;
		color: white;
	}

	span {
		color: white;
	}

	a {
		color: lightblue;
	}

	p {
		color: white;
		text-decoration-color: white;
	}
	button {
		color: white;
		background-color: black;
	}
	img {
		background-color: gray;
		border-block-color: green;
	}

	.active {
		* {
		background-color: rgba(230, 80, 22, 0.397);
		}
	}

	path {
		fill: white;
	}
}

main {
	height: 100vh;
	width: 100vw;
	min-height: 0;  /* NEW */
  	min-width: 0;   /* NEW; needed for Firefox */
	background-color: white;
	display: grid;
	// todo: optimize
	grid-template-columns: 1fr 3fr;
	grid-template-rows: 3fr 1fr;
	// grid-template-columns: minmax(0, 1fr) minmax(0, 3fr);
	// grid-template-rows: minmax(0, 3fr) minmax(0, 1fr);

}

.topic {
	display: flex;
	flex-direction: row;
	justify-content: flex-start;
	align-items: center;
	// white-space: nowrap;
}

.active {
	background-color: lightcoral;
}

.done {
	text-decoration: line-through;
	text-decoration-color: green;
	opacity: 0.3;
	div {
		.toggler {
			text-decoration: none;
		}
	}
}

.toggler {
	cursor: pointer;
	text-decoration: none;
}

.preview-btn-on {
	background-color: lightgreen;
}

.gh {
	margin-top: auto;
}

#material {
	grid-column-start: 1;
	grid-column-end: 1;
	grid-row-start: 1;
	grid-row-end: 3;
	// background-color: yellow;
	display: flex;
	flex-direction: column;
	padding: 0px 5px 0px 5px;
	#currentTopic {
		text-decoration: underline;
		display: flex;
		flex-direction: row;
	}
	#themen {
		overflow: auto;
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		img {
			max-width: 100%;
			border: 2px solid green;
		}
	}
	#control {
		display: flex;
		flex-direction: row;
		justify-content: center;
		button {
			width: 50%;
		}
		// padding: 2px;
	}

}
#video {
	grid-column-start: 2;
	grid-column-end: 3;
	grid-row-start: 1;
	grid-row-end: 2;
	background-color: black;
	iframe {
		width: 100%;
		height: 100%;
	}
}
#notes {
	grid-column-start: 2;
	grid-column-end: 3;
	grid-row-start: 2;
	grid-row-end: 3;
	// background-color: red;
	// padding: 5px;
	display: flex;
	flex-direction: row;
	#pad {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		textarea {
			width: 100%;
			height: 100%;
			resize: none;
		}
		#preview {
		flex-grow: 1;
		overflow: auto;
		div {
			max-width: 100%;
			max-height: 100%;
			width: 100%;
			height: 100%;
		}
	}
	}
	#pad-controls {
		display: flex;
		flex-direction: column;
		background: linear-gradient(153deg, #17c396, #6e17c3);
		background-size: 400% 400%;

		animation: moving-bg 15s ease infinite;

		@keyframes moving-bg {
			0%{background-position:93% 0%}
			50%{background-position:0% 100%}
			100%{background-position:93% 0%}
		}
	}
}
</style>