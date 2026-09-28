const path = require("path")
const fs = require("fs")

module.exports = function log() {
    const gitDir = path.join(process.cwd(), '.y-git')

    if(!fs.existsSync(gitDir)) {
        console.log("The git repository is not initialized yet")
        return
    }

    const headPath = path.join(gitDir, 'refs', 'heads', 'main')

    if(!fs.existsSync(headPath)) {
        console.log("no commits yet")
        return
    }

    let currentHash = fs.readFileSync(headPath, 'utf-8').trim()

    while (currentHash) {
        const objectSubDir = path.join(gitDir, 'objects', currentHash.slice(0, 2))
        const objectPath = path.join(objectSubDir, currentHash.slice(2))

        const commitContent = fs.readFileSync(objectPath, 'utf-8')
        const lines = commitContent.split('\n')

        const dateLine = lines.find(line => line.startsWith('date '))
        const parentLine = lines.find(line => line.startsWith('parent '))

        console.log(`commit ${currentHash}`)
        if(dateLine) console.log(dateLine)
        console.log('')

        currentHash = parentLine ? parentLine.replace('parent ', '') : null
    }

}