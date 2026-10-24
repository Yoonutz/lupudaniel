# lupudaniel

Two separate websites for Daniel Lupu live in this repo, each in its own folder.
Nothing is shared between them: each folder has its own code, build, content and Cloudflare Pages project.

| Folder | Site | Cloudflare Pages project |
| --- | --- | --- |
| [`resume/`](resume/) | Daniel's resume / CV site | `lupudaniel` → https://lupudaniel.pages.dev |
| [`dancapitandeplai/`](dancapitandeplai/) | Dan Căpitan de Plai photography portfolio + admin | `dancapitandeplai` → https://dancapitandeplai.pages.dev |

## How deploys work

Both Pages projects build from the `main` branch with no build command. Each one is set to its own folder:

- `lupudaniel`: root directory `resume`, output directory `public`, build watch path `resume/*`
- `dancapitandeplai`: root directory `dancapitandeplai`, output directory `public`, build watch path `dancapitandeplai/*`

So a change inside one folder only redeploys that site. Each site is a Pages advanced-mode worker
(`<folder>/public/_worker.js`) with its own KV namespace; secrets live in each project's settings.

See each folder's README for how that site works and how to rebuild it.

## Repo-wide files

- `SECURITY.md`: how to report a security problem.
- `.github/`: the syntax-check workflow, which checks both folders.

Only the `main` branch is kept: work on a short-lived branch, merge it with a PR, then delete the branch.
