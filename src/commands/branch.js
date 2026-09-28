const path = require("path")
const fs = require("fs")

module.exports = function branch(branchName) {
    const gitDir = path.join(process.cwd(), '.y-git')

    if(!fs.existsSync(gitDir)) {
        console.log("The git repository is not initialized yet")
        return
    }

    if(!branchName) {
        console.log("Usage: yagit branch <name>")
        return
    }

    const newBranch = path.join(gitDir, 'refs', 'heads', branchName)

    if (fs.existsSync(newBranch)) {
        console.log(`Branch '${branchName}' already exists`)
        return
    }

    const headContent = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf-8').trim()
    const currentBranchPath = path.join(gitDir, headContent.replace('ref: ', ''))

    if(!fs.existsSync(currentBranchPath)) {
        console.log("fatal: not a valid object name (no commits yet)")
        return
    }

    const currentCommit = fs.readFileSync(currentBranchPath, 'utf-8').trim()

    fs.writeFileSync(newBranch, currentCommit)
    fs.writeFileSync(path.join(gitDir, 'HEAD'), `ref: refs/heads/${branchName}\n`)

    console.log(`new branch created: ${branchName}`)
}