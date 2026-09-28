const path = require("path")
const fs = require("fs")
const storeBlob = require("../object_store")

module.exports = function add(filePath) {
    const gitDir = path.join(process.cwd(), '.y-git')

    if (!fs.existsSync(gitDir)) {
        console.log("The git repository is not initialized yet")
        return
    }

    if (!filePath) {
        console.log("Usage: yagit add <file>")
        return
    }

    if (!fs.existsSync(filePath)) {
        console.log("Invalid: the file does not exist")
        return
    }

    const content = fs.readFileSync(filePath)

    const header = `blob ${content.length}\0`
    const store = Buffer.concat([Buffer.from(header), content])

    const hash = storeBlob(store)

    const indexPath = path.join(gitDir, 'index')
    let index = {}

    if (fs.existsSync(indexPath)) {
        index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
    }

    index[filePath] = hash
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2))

    console.log(`added ${filePath}`)
}