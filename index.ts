import { DOMParser } from 'https://deno.land/x/deno_dom/deno-dom-wasm.ts';

interface Entry {
	name?: string;
	author?: string;
	repo?: string;
	href?: string;
	description?: string;
}

async function getModules() {
	// Here we define the base URL we want to use, the number
	// of pages we want to fetch, and we create an empty array
	// to store our scraped data.
	const BASE_URL = 'https://deno.land/x?page=';
	const MAX_PAGES = 3;
	const entries: Entry[] = [];

	// We'll loop for the number of pages we want to fetch,
	// and parse the contents once available
	for (let page = 1; page <= MAX_PAGES; page++) {
		const url = `${BASE_URL}${page}`;
		const pageContents = await fetch(url).then((res) => res.text());
		// Remember, be kind to the website and wait a second!
		await sleep(1000);

		// Use the deno_dom module to parse the HTML
		const document = new DOMParser().parseFromString(pageContents, 'text/html');

		if (document) {
			// Conveniently, the modules are all the only <li> elements
			// on the page. If you're scraping different data from a
			// different website, you'll want to use whatever selectors
			// make sense for the data you're trying to scrape.
			const modules = document.getElementsByTagName('li');

			for (const module of modules) {
				const entry: Entry = {};
				// Here we get the module's name and a short description.
				entry.name = module.querySelector(
					'.text-primary.font-semibold',
				)?.textContent;
				entry.description = module.querySelector('.col-span-2.text-gray-400')
					?.textContent;

				// Here we get the path to this module's page.
				// The Deno site uses relative paths, so we'll
				// need to add the base URL to the path in getModule.
				const path =
					module.getElementsByTagName('a')[0].getAttribute('href')?.split(
						'?',
					)[0];
				entry.href = `https://deno.land${path}`;

				// We've got all the data we can from just the listing.
				// Time to fetch the individual module page and add
				// data from there.
				let moduleData;
				if (path) {
					moduleData = await getModule(path);
					await sleep(1000);
				}

				// Once we've got everything, push the data to our array.
				entries.push({ ...entry, ...moduleData });
			}
		}
	}

	await Deno.writeTextFile('./output.json', JSON.stringify(entries, null, 2));
}

async function getModule(path: string | URL) {
	const modulePage = await fetch(new URL(`https://deno.land${path}`), {
		redirect: 'follow',
		headers: {
			'Accept': 'text/html',
		},
	}).then(
		(res) => {
			return res.text();
		},
	);

	const moduleDocument = new DOMParser().parseFromString(
		modulePage,
		'text/html',
	);

	const moduleData: Entry = {};

	const repo = moduleDocument
		?.querySelector('a.link.truncate')
		?.getAttribute('href');

	if (repo) {
		moduleData.repo = repo;
		moduleData.author =
			repo.match(/https?:\/\/(?:www\.)?github\.com\/(.*)\//)![1];
	}
	return moduleData;
}

async function sleep(milliseconds: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, milliseconds);
	});
}

getModules();
