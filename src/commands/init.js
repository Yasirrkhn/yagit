#!/usr/bin/env node
const path = require("path")
const fs = require("fs")
const { error } = require("console")

module.exports = function init() {
    const gitDir = path.join(process.cwd(), ".y-git")

    if(fs.existsSync(gitDir)) {
        error("Git repository is already initialized")
        return
    }

    fs.mkdirSync(path.join(gitDir, 'objects'), { recursive: true})
    fs.mkdirSync(path.join(gitDir, 'refs', 'heads'), { recursive: true})
    
    fs.writeFileSync(path.join(gitDir, 'HEAD'), 'ref: refs/heads/main\n')

    fs.writeFileSync(path.join(gitDir, 'config'), '[\n  \"core\"\n]\n')

    console.log(`Initialized empty git repository in ${gitDir}`)
}