import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

interface Entry {
	name?: string;
	author?: string;
	repo?: string;
	package?: string;
	href?: string;
	description?: string;
	image?: string;
	tags?: string[];
}

async function getModules() {
	const BASE_URL = "https://deno.land/x?page=";

	const MAX_PAGES = 5;

	const entries: Entry[] = [];

	for (let page = 1; page <= MAX_PAGES; page++) {
		const url = `${BASE_URL}${page}`;
		const pageContents = await fetch(url).then((res) => res.text());
		const document = new DOMParser().parseFromString(pageContents, "text/html");

		if (document) {
			const modules = document.getElementsByTagName("li");

			for (const module of modules) {
				const entry: Entry = {};
				const moduleUrl =
					module.getElementsByTagName("a")[0].getAttribute("href")?.split(
						"?",
					)[0];

				entry.name = module.querySelector(
					".text-primary.font-semibold",
				)?.textContent;
				entry.description = module.querySelector(
					".col-span-2.text-gray-400",
				)?.textContent;

				let moduleData;
				if (moduleUrl) {
					moduleData = await getModule(moduleUrl);
				}
				entries.push({ ...entry, ...moduleData });
			}
		}
	}
	await Deno.writeTextFile("./output.json", JSON.stringify(entries, null, 2));
}

async function getModule(url: string | URL) {
	const modulePage = await fetch(new URL(`https://deno.land${url}`), {
		redirect: "follow",
		headers: {
			"Accept":
				"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
		},
	}).then(
		(res) => {
			return res.text();
		},
	);

	const moduleDocument = new DOMParser().parseFromString(
		modulePage,
		"text/html",
	);

	const moduleData: Record<string, string | undefined> = {};

	const packageUrl =
		moduleDocument?.querySelector("a.inline-block:nth-child(3)")
			?.getAttribute("href")?.split("@")[0] ?? undefined;
	moduleData.href = `https://deno.land${packageUrl}`;
	moduleData.package = `https://deno.land${packageUrl}`;

	const repo = moduleDocument
		?.querySelector("a.link.truncate")
		?.getAttribute("href");

	if (repo) {
		moduleData.repo = repo;
		const repoPage = await fetch(repo).then((res) => res.text());
		const repoDocument = new DOMParser().parseFromString(
			repoPage,
			"text/html",
		);
		const authorUrl = repoDocument
			?.querySelector('a[rel="author"]')
			?.getAttribute("href");

		if (authorUrl) {
			const authorPage = await fetch(new URL(`https://github.com/${authorUrl}`))
				.then((res) => res.text());
			const authorDocument = new DOMParser().parseFromString(
				authorPage,
				"text/html",
			);
      const orgAuthor = authorDocument?.querySelector(".h2")?.textContent
      .trim();
      const individualAuthor = authorDocument?.querySelector(".p-name")?.textContent.trim();
      console.log(orgAuthor, individualAuthor);
			moduleData.author = orgAuthor || individualAuthor;

      const orgImg = authorDocument
      ?.querySelector("img.flex-shrink-0:nth-child(1)")
      ?.getAttribute("src");
      const individualImg = authorDocument?.querySelector("img.avatar.avatar-user")
      ?.getAttribute("src")
      console.log(orgImg, individualImg);
			moduleData.image = orgImg || individualImg || undefined;
		}
	}
	return moduleData;
}

getModules();
