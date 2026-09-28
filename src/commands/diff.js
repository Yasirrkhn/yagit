const path = require("path")
const fs = require("fs")

module.exports = function diff() {
    const gitDir = path.join(process.cwd(), '.y-git')

    if (!fs.existsSync(gitDir)) {
        console.log("The git repository is not initialized yet")
        return
    }

    const indexPath = path.join(gitDir, 'index')
    const newFiles = fs.existsSync(indexPath)
        ? JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
        : {}

    const headPath = path.join(gitDir, 'refs', 'heads', 'main')
    let oldFiles = {}

    if (fs.existsSync(headPath)) {
        const commitHash = fs.readFileSync(headPath, 'utf-8').trim()
        const commitPath = path.join(gitDir, 'objects', commitHash.slice(0, 2), commitHash.slice(2))
        const commitContent = fs.readFileSync(commitPath, 'utf-8')
        const treeLine = commitContent.split('\n').find(line => line.startsWith('tree '))
        const treeHash = treeLine.replace('tree ', '')

        const treePath = path.join(gitDir, 'objects', treeHash.slice(0, 2), treeHash.slice(2))
        const treeContent = fs.readFileSync(treePath, 'utf-8')

        treeContent.split('\n').filter(Boolean).forEach(line => {
            // each line looks like: blob <hash> <path>
            const [, hash, filePath] = line.split(' ')
            oldFiles[filePath] = hash
        })
    }

    const allPaths = new Set([...Object.keys(oldFiles), ...Object.keys(newFiles)])

    for (const filePath of allPaths) {
        const oldHash = oldFiles[filePath]
        const newHash = newFiles[filePath]

        if (!oldHash) {
            console.log(`added:    ${filePath}`)
        } else if (!newHash) {
            console.log(`deleted:  ${filePath}`)
        } else if (oldHash !== newHash) {
            console.log(`modified: ${filePath}`)
        }
    }
}