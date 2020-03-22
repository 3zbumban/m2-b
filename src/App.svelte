<script>
import marked from "marked";
import domPurify from "dompurify";

export let raw_data;

const data = localStorage.getItem("data") ? JSON.parse(localStorage.getItem("data")) : raw_data;
const themen = Object.keys(data);

let currentThema = localStorage.getItem("currentThema") ? JSON.parse(localStorage.getItem("currentThema")) : 0;
let currentVid = "";
let active = {};
let prewiev = false;

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

function toggle(i) {
	data[themen[currentThema]][i].done = !data[themen[currentThema]][i].done;
	sync();
}

function sync() {
	window.localStorage.setItem("notes", JSON.stringify(notes));
	window.localStorage.setItem("data", JSON.stringify(data));
	window.localStorage.setItem("currentThema", JSON.stringify(currentThema));
}

</script>

<main>
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
	{#if !prewiev}
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
		<button class="" on:click={() => {prewiev = !prewiev}}>&#9889;</button>
	</div>
</div>
</main>

<style lang="scss">
@import "../node_modules/normalize.css/normalize";

:global(body) {
	padding: 0;
	overflow: hidden;
}

main {
	height: 100vh;
	width: 100vw;
	min-height: 0;  /* NEW */
  	min-width: 0;   /* NEW; needed for Firefox */
	background-color: white;
	display: grid;
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
	padding: 5px;
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
		background-color: gray;
	}
}
</style>