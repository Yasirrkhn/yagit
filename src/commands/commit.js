const path = require("path")
const fs = require("fs")
const crypto = require("crypto")

module.exports = function commit() {
    const gitDir = path.join(process.cwd(), '.y-git')

    if(!fs.existsSync(gitDir)) {
        console.log("The git repository is not initiliazed yet")
        return 
    }

    const index = JSON.parse(fs.readFileSync(path.join(gitDir, 'index'), 'utf-8'))

    let treeContent = ""

    for (const filePath in index) {
      const hash = index[filePath]
      treeContent += `blob ${hash} ${filePath}\n`
   }

   const treeHash = crypto.createHash('sha256').update(treeContent).digest('hex')

   const treeSubDir = path.join(gitDir, 'objects', treeHash.slice(0, 2))
   const treePath = path.join(treeSubDir, treeHash.slice(2))

   fs.mkdirSync(treeSubDir, { recursive: true })

   if(!fs.existsSync(treePath)) {
        fs.writeFileSync(treePath, treeContent)
   }

   const headPath = path.join(gitDir, 'refs', 'heads', 'main')
   const parentHash = fs.existsSync(headPath) ? fs.readFileSync(headPath, 'utf-8') : ""

   const commitContent =
    `tree ${treeHash}\n` +
    (parentHash ? `parent ${parentHash}\n` : "") +
    `date ${new Date().toISOString()}\n\n` +
    `commit\n`

    const commitHash = crypto.createHash('sha256').update(commitContent).digest('hex')

    const commitSubDir = path.join(gitDir, 'objects', commitHash.slice(0, 2))
    const commitPath = path.join(commitSubDir, commitHash.slice(2))

    fs.mkdirSync(commitSubDir, { recursive: true })

    if(!fs.existsSync(commitPath)) {
        fs.writeFileSync(commitPath, commitContent)
    }

    fs.writeFileSync(headPath, commitHash + "\n")

    console.log(`committed as ${commitHash}`)

}