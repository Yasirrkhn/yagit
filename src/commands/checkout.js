const path = require("path")
const fs = require("fs")

module.exports = function checkout(branchName) {
    const gitDir = path.join(process.cwd(), '.y-git')

    if (!fs.existsSync(gitDir)) {
        console.log("The git repository is not initialized yet")
        return
    }

    if (!branchName) {
        console.log("Usage: ygit checkout <branch>")
        return
    }

    const branchPath = path.join(gitDir, 'refs', 'heads', branchName)

    if (!fs.existsSync(branchPath)) {
        console.log(`No such branch: ${branchName}`)
        return
    }

    fs.writeFileSync(path.join(gitDir, 'HEAD'), `ref: refs/heads/${branchName}\n`)

    console.log(`Switched to ${branchName}`)
}