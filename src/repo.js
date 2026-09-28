const path = require("path")
const fs = require("fs")

function getGitDir() {
    return path.join(process.cwd(), '.y-git')
}

function getCurrentBranch(gitDir) {
    const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf-8').trim()
    const ref = head.replace('ref: ', '')
    return {
        name: ref.replace('refs/heads/', ''),
        refPath: path.join(gitDir, ref)
    }
}

function getCurrentCommit(gitDir) {
    const { refPath } = getCurrentBranch(gitDir)
    return fs.existsSync(refPath) ? fs.readFileSync(refPath, 'utf-8').trim() : null
}

function readCommitTree(gitDir, commitHash) {
    const read = h => fs.readFileSync(path.join(gitDir, 'objects', h.slice(0, 2), h.slice(2)), 'utf-8')
    const treeHash = read(commitHash).split('\n').find(l => l.startsWith('tree ')).replace('tree ', '')
    const files = {}
    read(treeHash).split('\n').filter(Boolean).forEach(line => {
        const [, hash, ...rest] = line.split(' ')
        files[rest.join(' ')] = hash
    })
    return files
}

module.exports = { getGitDir, getCurrentBranch, getCurrentCommit, readCommitTree }