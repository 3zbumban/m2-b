<script>
// import "lite-youtube-embed";

export let data;

const themen = Object.keys(data);
let currentThema = 0;
let currentVid = "";
let active = {};

$: notes = `# ${themen[currentThema]}\n`;

$: next = currentThema<themen.length-1 ? currentThema+1 : 0;
$: prev = currentThema>0 ? currentThema-1 : themen.length-1;
$: console.log(`[i] currentThema: ${currentThema}`);

function back () {
	currentThema=prev;
	console.log(`[i] back: ${currentThema}`);

}

function forth () {
	currentThema=next;
	console.log(`[i] forth: ${currentThema}`);

}

function clickVid(event) {
	console.log(event.target.href);
	currentVid = event.target.href;
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
			{#if t.type === "text"}
				<span class="f2">📃{t.text}</span>
			{:else if t.type === "link"}
				<span>🌐<a target="_blank" rel="noopener noreferrer" href={t.link}>{t.text}</a></span>
			{:else if t.type === "video"}
				<span>📹<a on:click|preventDefault={event => clickVid(event)} href={t.link}>{t.text}</a>
				<span class="time">@{t.time}</span>
			</span>
			{:else if t.type === "img"}
				<span>📷<img src={t.link} alt={t.text}></span>
			{:else}
				<span>Error! {t.type} case not found!!</span>
			{/if}
				<span class="toggler" on:click={() => {data[themen[currentThema]][i].done = !data[themen[currentThema]][i].done}}>
				{#if !!t.done}
					<span>
					❌
					</span>
				{:else}
					<span>
					✔
					</span>
				{/if}
				</span>
				</div>
		{/each}
	</div>
	<div id="control">
		<!-- <div> -->
			<button class="" on:click={back}>&larr;
				<span class="">{prev+1}</span>
			</button>
			<button class="" on:click={forth}>&rarr;
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
	<textarea bind:value={notes} name="notes" id="" cols="30" rows="10" placeholder="take notes here..."></textarea>
	</div>
	<div id="pad-controls">
		<button class="">&#9889;</button>
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
	background-color: black;
	display: grid;
	grid-template-columns: 1fr 3fr;
	grid-template-rows: 3fr 1fr;
}

.topic {
	display: flex;
	flex-direction: row;
	justify-content: flex-start;
	align-items: baseline;
	white-space: nowrap;
}

.active {
	background-color: lightcoral;
}

.done {
	text-decoration: line-through;
	text-decoration-color: green;
	opacity: 0.3;
}

span {
     vertical-align:middle;
}

.toggler {
	cursor: pointer;
}


#material {
	grid-column-start: 1;
	grid-column-end: 1;
	grid-row-start: 1;
	grid-row-end: 3;
	background-color: yellow;
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
			border: 2px solid yellow;
		}
	}
	#control {
		display: flex;
		flex-direction: row;
		justify-content: center;
		// padding: 2px;
	}

}
#video {
	grid-column-start: 2;
	grid-column-end: 3;
	grid-row-start: 1;
	grid-row-end: 2;
	background-color: green;
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
	background-color: red;
	padding: 5px;
	display: flex;
	flex-direction: row;
	#pad {
		flex-grow: 1;
		textarea {
			width: 100%;
			height: 100%;
			resize: none;
		}
	}
	#pad-controls {
		background-color: gray;
	}
}
</style>