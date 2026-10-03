# yagit

A from-scratch reimplementation of Git's core internals as a command-line tool, written in Node.js. It rebuilds the pieces that make Git work (content-addressed storage, hashing, trees, commit chains, and branch pointers) without using any Git library, so the whole mechanism is readable in a few hundred lines.

`yagit` stores its data in a `.y-git` folder, not `.git`, so it can run safely inside a folder that is already a real Git repository.

> This is a learning project, not a replacement for Git. See [Limitations](#limitations) for exactly what is and isn't implemented.

## Table of contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Command reference](#command-reference)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Differences from real Git](#differences-from-real-git)
- [Limitations](#limitations)
- [Roadmap](#roadmap)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features

- `init`: create a repository
- `add`: hash a file into a blob object and stage it
- `commit`: turn the staged files into a tree and a commit, and move the current branch forward
- `log`: walk the commit history from newest to oldest
- `diff`: compare the staged files against the last commit
- `status`: show staged changes, unstaged changes, and untracked files
- `branch`: create a new branch at the current commit and switch to it
- `checkout`: switch to an existing branch

## Requirements

- [Node.js](https://nodejs.org/) 16 or newer
- npm (installed with Node.js)

Check your versions:

```bash
node --version
npm --version
```

## Installation

### Option A: install the `yagit` command globally (recommended)

```bash
git clone https://github.com/<your-username>/yagit.git
cd yagit
npm install
npm link
```

`npm link` registers the `yagit` command on your machine. Confirm it works:

```bash
yagit
```

With no arguments it prints the list of commands.

To remove it later:

```bash
npm unlink -g yagit
```

### Option B: run it without installing globally

From the project folder:

```bash
npm install
node bin/index.js <command>
```

For example, `node bin/index.js init`. Everywhere this README says `yagit <command>`, you can use `node <path-to-project>/bin/index.js <command>` instead.

## Quick start

Try it in a new, empty folder so you don't mix it with another project:

```bash
mkdir demo && cd demo

yagit init
echo "hello" > a.txt

yagit status              # a.txt is untracked
yagit add a.txt
yagit status              # a.txt is listed under "Changes to be committed"
yagit commit
yagit log                 # shows your first commit

echo "changed" > a.txt
yagit status              # a.txt is listed under "Changes not staged for commit"
yagit add a.txt
yagit diff                # modified: a.txt
yagit commit
yagit log                 # two commits, newest first

yagit branch feature      # creates "feature" and switches to it
yagit checkout main       # switch back
```

## Command reference

Run every command from the folder that contains (or should contain) the `.y-git` directory.

### `yagit init`

Creates the repository structure in the current folder:

```
.y-git/
├── objects/         # all stored blobs, trees and commits
├── refs/heads/      # one file per branch
├── HEAD             # "ref: refs/heads/main"
└── config           # placeholder configuration file
```

If `.y-git` already exists, it prints a message and changes nothing, so it is safe to run twice.

### `yagit add <file>`

Stages one file.

1. Reads the file's bytes.
2. Builds the blob content: the header `blob <byte length>\0` followed by the file bytes.
3. Hashes that with SHA-256 and writes it to `.y-git/objects/<first 2 chars>/<remaining chars>`. If an identical object already exists, nothing is rewritten.
4. Records `path → hash` in `.y-git/index`.

Adding the same file again after editing it replaces its entry in the index. It fails with a message if the repository isn't initialized or the file doesn't exist.

### `yagit commit`

Records everything in the index as a new commit.

1. Reads `.y-git/index`.
2. Builds a tree: one line per staged file in the form `blob <hash> <path>`.
3. Hashes and stores the tree as an object.
4. Reads the current branch's tip (if any) to use as the parent.
5. Builds and stores a commit object that points at the tree and the parent.
6. Overwrites the current branch file with the new commit's hash.

Prints `committed as <hash>`. The first commit on a branch has no parent.

### `yagit log`

Starts at the current branch's tip and follows each commit's `parent` line back to the first commit, printing the hash and date of each one, newest first. Prints "No commits yet" on an empty repository.

### `yagit diff`

Compares the staged files (`.y-git/index`) with the tree of the last commit and prints one line per difference:

```
added:    new.txt
modified: a.txt
deleted:  old.txt
```

It reports which files changed, not which lines. Files that are identical in both places are not printed.

### `yagit status`

Prints the current branch and up to three sections:

- **Changes to be committed**: the index compared with the last commit (`new file`, `modified`, `deleted`).
- **Changes not staged for commit**: files on disk compared with the index. It hashes each file the same way `add` does, so an unchanged file matches exactly.
- **Untracked files**: files on disk that are not in the index. `.y-git` and `node_modules` are skipped.

If all three are empty, it prints `nothing to commit, working tree clean`.

### `yagit branch <name>`

Creates `.y-git/refs/heads/<name>` containing the current commit hash, then points `HEAD` at it. The new branch and the old one refer to the same commit until one of them gets a new commit. This behaves like `git checkout -b <name>`.

It refuses to run if the branch already exists, if no name is given, or if there are no commits yet (there is no commit to branch from).

### `yagit checkout <name>`

Points `HEAD` at an existing branch, so later commits advance that branch. It prints an error if the branch doesn't exist.

> Currently `checkout` only moves `HEAD`. It does not rewrite the files in your working folder to match the target branch. See [Limitations](#limitations).

## How it works

### Everything is a hashed object

Git stores three kinds of objects, and so does `yagit`. Each is saved under `.y-git/objects/`, in a folder named after the first two characters of its hash and a file named after the rest. Splitting this way keeps any one folder small.

| Object | Content | Purpose |
|---|---|---|
| Blob | `blob <length>\0<file bytes>` | The contents of one file at one moment |
| Tree | One `blob <hash> <path>` line per file | A snapshot of which files, at which versions, were committed |
| Commit | `tree <hash>`, optional `parent <hash>`, `date <ISO timestamp>`, blank line, message | A snapshot plus its place in history |

Because the file name *is* the hash of the content, identical content is stored once, and any change to content produces a different name. This is called content-addressable storage.

### Branches and HEAD are just pointers

- `.y-git/refs/heads/<name>` is a text file holding a single commit hash: the branch's current tip.
- `.y-git/HEAD` holds the path of the current branch file, for example `ref: refs/heads/main`.

Committing overwrites the current branch file with the new commit's hash. History is not lost when that happens, because each commit stores its parent's hash inside itself. The branch file records only where you are now, and the `parent` links form the chain:

```
refs/heads/main → commit C
commit C → parent: commit B
commit B → parent: commit A
commit A → (no parent)
```

`log` walks that chain backward.

### The index

`.y-git/index` is a JSON file mapping each staged path to the hash of its blob:

```json
{
  "a.txt": "3f9a...c1",
  "src/app.js": "b71d...02"
}
```

`add` writes to it, `commit` reads it to build the tree, and `diff` and `status` compare against it.

## Project structure

```
yagit/
├── bin/
│   └── index.js          # entry point: parses arguments and dispatches commands
├── src/
│   ├── commands/
│   │   ├── init.js
│   │   ├── add.js
│   │   ├── commit.js
│   │   ├── log.js
│   │   ├── diff.js
│   │   ├── status.js
│   │   ├── branch.js
│   │   └── checkout.js
│   ├── object_store.js   # hashes content and writes objects to .y-git/objects
│   ├── repo.js           # helpers for reading HEAD, branches and commit trees
│   └── logger.js
├── package.json
└── README.md
```

The `bin` field in `package.json` points at `bin/index.js`, which is what makes the `yagit` command exist after `npm link`.

## Differences from real Git

| | Real Git | yagit |
|---|---|---|
| Metadata folder | `.git` | `.y-git` |
| Hash function | SHA-1 (moving to SHA-256) | SHA-256 |
| Object storage | Loose objects and compressed packfiles | Loose objects only, not compressed |
| Trees | Nested, one tree per directory | One flat tree listing full paths |
| Index | Binary file | JSON file |
| Commit message | `-m` flag or an editor | Fixed placeholder text |
| Diff | Line-by-line changes | Per-file added / modified / deleted |
| Remotes | `clone`, `fetch`, `push`, `pull` | Local only |

## Limitations

- **No commit messages.** `commit` writes a placeholder message; there is no `-m` option yet.
- **`checkout` doesn't restore files.** It moves `HEAD` only, so after switching to a branch that has different commits, your working folder still shows the previous branch's files.
- **One file per `add`.** There is no `add .` and no directory support.
- **Flat trees.** Subdirectory paths are stored as full path strings rather than as nested trees.
- **The index only grows.** There is no `rm` command, so a file you delete from disk stays in the index until it is handled explicitly.
- **No `.gitignore` support.** `status` skips only `.y-git` and `node_modules`.
- **No merging, tags, remotes, or `push`.** Pushing requires implementing Git's network protocol and packfile transfer, which is a separate project from the local object model built here.
- **Contents aren't compressed.** Real Git zlib-compresses every object.

## Roadmap

- `commit -m "message"`
- Make `checkout` restore working-folder files and refuse to overwrite uncommitted changes
- `add .` and directory support
- Nested tree objects
- Line-level `diff`
- `merge` (starting with fast-forward)
- `.gitignore`-style ignore rules
- Automated tests

## Troubleshooting

**`yagit: command not found`**
Run `npm link` from the project folder, then open a new terminal. If it still fails, use Option B (`node bin/index.js <command>`).

**`The git repository is not initialized yet`**
There's no `.y-git` in the current folder. Run `yagit init` first, or `cd` into the folder where you ran it.

**`Error [ERR_REQUIRE_ESM]` mentioning `chalk`**
Chalk 5 and later can't be loaded with `require`. Install version 4: `npm install chalk@4`.

**A command prints the usage text even though you typed it correctly**
The usage text is also shown when a command crashes. Temporarily print `e.stack` inside the `catch` block of `bin/index.js` to see the real error and line number.

**`fatal: not a valid object name` when creating a branch**
The repository has no commits yet, so there is nothing to branch from. Make a first commit, then create the branch.

## License

MIT. See the `LICENSE` file, or change this section to match the license in your `package.json`.

---

**Thank you for checking out this project! Feel free to open an issue if you have any questions or suggestions.**
