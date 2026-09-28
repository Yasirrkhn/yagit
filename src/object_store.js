const fs = require("fs")
const crypto = require("crypto")
const path = require("path")

function storeBlob(content) {
    const gitDir = path.join(process.cwd(), '.y-git')

    if (!fs.existsSync(gitDir)) {
        console.log("The git repository is not initialized yet")
        return null
    }

    const hash = crypto.createHash('sha256').update(content).digest('hex')

    const subDir = path.join(gitDir, 'objects', hash.slice(0, 2))
    const objectPath = path.join(subDir, hash.slice(2))

    fs.mkdirSync(subDir, { recursive: true })

    if (!fs.existsSync(objectPath)) {
        fs.writeFileSync(objectPath, content)
    }

    return hash
}

module.exports = storeBlob