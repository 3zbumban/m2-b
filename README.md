# m2-b

## quellen

* [m2](https://web.archive.org/web/20181218212329/https://www.bigdev.de/p/m2.html)
* [m2-v2](https://web.archive.org/web/20200316212155/https://www.bigdev.de/p/m2.html)

* [DOMPurify](https://github.com/cure53/DOMPurify)
* [marked](https://github.com/markedjs/marked)
* [normalize.css](https://necolas.github.io/normalize.css/)
* [svelte](https://svelte.dev/docs)
* [svelte-preprocess](https://github.com/kaisermann/svelte-preprocess)

* [youtube video resolution recomendations](https://support.google.com/youtube/answer/6375112?co=GENIE.Platform%3DDesktop&hl=en)
  * 2160p: 3840x2160
  * 1440p: 2560x1440
  * 1080p: 1920x1080
  * **720p: 1280x720**
  * 480p: 854x480
  * 360p: 640x360
  * 240p: 426x240

## svelte app

This is a project template for [Svelte](https://svelte.dev) apps. It lives at https://github.com/sveltejs/template.

To create a new project based on this template using [degit](https://github.com/Rich-Harris/degit):

```bash
npx degit sveltejs/template svelte-app
cd svelte-app
```

*Note that you will need to have [Node.js](https://nodejs.org) installed.*

### Get started

Install the dependencies...

```bash
cd svelte-app
npm install
```

...then start [Rollup](https://rollupjs.org):

```bash
npm run dev
```

Navigate to [localhost:5000](http://localhost:5000). You should see your app running. Edit a component file in `src`, save it, and reload the page to see your changes.

By default, the server will only respond to requests from localhost. To allow connections from other computers, edit the `sirv` commands in package.json to include the option `--host 0.0.0.0`.

### Building and running in production mode

To create an optimised version of the app:

```bash
npm run build
```

You can run the newly built app with `npm run start`. This uses [sirv](https://github.com/lukeed/sirv), which is included in your package.json's `dependencies` so that the app will work when you deploy to platforms like [Heroku](https://heroku.com).

### Single-page app mode

By default, sirv will only respond to requests that match files in `public`. This is to maximise compatibility with static fileservers, allowing you to deploy your app anywhere.

If you're building a single-page app (SPA) with multiple routes, sirv needs to be able to respond to requests for *any* path. You can make it so by editing the `"start"` command in package.json:

```js
"start": "sirv public --single"
```

### Deploying to the web

#### With [now](https://zeit.co/now)

Install `now` if you haven't already:

```bash
npm install -g now
```

Then, from within your project folder:

```bash
cd public
now deploy --name my-project
```

As an alternative, use the [Now desktop client](https://zeit.co/download) and simply drag the unzipped project folder to the taskbar icon.

#### With [surge](https://surge.sh/)

Install `surge` if you haven't already:

```bash
npm install -g surge
```

Then, from within your project folder:

```bash
npm run build
surge public my-project.surge.sh
```

### todo

* [x] save markdown files
* [x] simple darkmode
* [ ] reset storage button
* [ ] better responsive grid (App.svelte > style > main)

### stretch

* [ ] progress indicator
* [ ] favicon

* [sample](https://tex.s2cms.ru/g/f(x)%0AA_%7Bm%2Cn%7D%20%3D%20%5Cbegin%7Bpmatrix%7D%0Aa_%7B1%2C1%7D%20%26%20a_%7B1%2C2%7D%20%26%20%5Ccdots%20%26%20a_%7B1%2Cn%7D%20%5C%5C%0Aa_%7B2%2C1%7D%20%26%20a_%7B2%2C2%7D%20%26%20%5Ccdots%20%26%20a_%7B2%2Cn%7D%20%5C%5C%0A%5Cvdots%20%20%26%20%5Cvdots%20%20%26%20%5Cddots%20%26%20%5Cvdots%20%20%5C%5C%0Aa_%7Bm%2C1%7D%20%26%20a_%7Bm%2C2%7D%20%26%20%5Ccdots%20%26%20a_%7Bm%2Cn%7D%0A%5Cend%7Bpmatrix%7D)
