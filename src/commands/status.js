const path = require("path")
const fs = require("fs")
const crypto = require("crypto")

// "./src\\a.js" and "src/a.js" should count as the same file
function normalize(p) {
    return path.normalize(p).split(path.sep).join('/')
}

// hash a file the same way add.js does, so hashes are comparable
function hashFile(filePath) {
    const content = fs.readFileSync(filePath)
    const header = `blob ${content.length}\0`
    const store = Buffer.concat([Buffer.from(header), content])
    return crypto.createHash('sha256').update(store).digest('hex')
}

// recursively list every file in the working directory
function listFiles(dir, base = dir) {
    let results = []
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '.y-git' || entry.name === 'node_modules') continue
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            results = results.concat(listFiles(full, base))
        } else {
            results.push(normalize(path.relative(base, full)))
        }
    }
    return results
}

module.exports = function status() {
    const gitDir = path.join(process.cwd(), '.y-git')

    if (!fs.existsSync(gitDir)) {
        console.log("The git repository is not initialized yet")
        return
    }

    // which branch are we on? (read HEAD instead of hardcoding main)
    const headContent = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf-8').trim()
    const refPath = headContent.replace('ref: ', '')
    const branchName = refPath.replace('refs/heads/', '')
    const branchFile = path.join(gitDir, refPath)

    console.log(`On branch ${branchName}`)

    // files in the last commit's tree: { path: hash }
    const committed = {}
    if (fs.existsSync(branchFile)) {
        const commitHash = fs.readFileSync(branchFile, 'utf-8').trim()
        const commitPath = path.join(gitDir, 'objects', commitHash.slice(0, 2), commitHash.slice(2))
        const commitContent = fs.readFileSync(commitPath, 'utf-8')
        const treeLine = commitContent.split('\n').find(line => line.startsWith('tree '))
        const treeHash = treeLine.replace('tree ', '')

        const treePath = path.join(gitDir, 'objects', treeHash.slice(0, 2), treeHash.slice(2))
        const treeContent = fs.readFileSync(treePath, 'utf-8')

        treeContent.split('\n').filter(Boolean).forEach(line => {
            // line looks like: blob <hash> <path>
            const [, hash, ...rest] = line.split(' ')
            committed[normalize(rest.join(' '))] = hash
        })
    } else {
        console.log("No commits yet")
    }

    // staged files: { path: hash }
    const staged = {}
    const indexPath = path.join(gitDir, 'index')
    if (fs.existsSync(indexPath)) {
        const rawIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
        for (const p in rawIndex) {
            staged[normalize(p)] = rawIndex[p]
        }
    }

    // 1. staged changes: index vs last commit
    const toBeCommitted = []
    for (const p in staged) {
        if (!committed[p]) toBeCommitted.push(`new file:  ${p}`)
        else if (committed[p] !== staged[p]) toBeCommitted.push(`modified:  ${p}`)
    }
    for (const p in committed) {
        if (!staged[p]) toBeCommitted.push(`deleted:   ${p}`)
    }

    // 2. unstaged changes: files on disk vs index
    const notStaged = []
    for (const p in staged) {
        if (!fs.existsSync(p)) notStaged.push(`deleted:   ${p}`)
        else if (hashFile(p) !== staged[p]) notStaged.push(`modified:  ${p}`)
    }

    // 3. untracked: on disk, but not in the index
    const untracked = listFiles(process.cwd()).filter(f => !(f in staged))

    if (toBeCommitted.length) {
        console.log("\nChanges to be committed:")
        toBeCommitted.forEach(line => console.log(`  ${line}`))
    }

    if (notStaged.length) {
        console.log("\nChanges not staged for commit:")
        notStaged.forEach(line => console.log(`  ${line}`))
    }

    if (untracked.length) {
        console.log("\nUntracked files:")
        untracked.forEach(f => console.log(`  ${f}`))
    }

    if (!toBeCommitted.length && !notStaged.length && !untracked.length) {
        console.log("\nnothing to commit, working tree clean")
    }
}