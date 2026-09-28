#!/usr/bin/env node
const logger = require('../src/logger')('bin')
const arg = require("arg")
const chalk = require("chalk")
const init = require("../src/commands/init")
const commit = require("../src/commands/commit")
const add = require("../src/commands/add")
const log = require("../src/commands/log")
const diff = require("../src/commands/diff")
const status = require("../src/commands/status")
const branch = require("../src/commands/branch")
const checkout = require("../src/commands/checkout")

try {
    const args = arg({})

    const command = args._[0]

    if (command === "init") {
        init()
        
    }   else if(command === "add") {
        add(args._[1])

    } else if (command === "commit") {
        commit()

    } else if (command === "log") {
        log()

    } else if (command === "diff") {
        diff()

    } else if (command === "branch") {
        branch(args._[1])

    } else if (command === "checkout") {
        checkout(args._[1])

    } else if (command === "status") {
        status()

    }

 
} catch (e) {
    console.log(e.stack)
    logger.warn(e.message)
    console.log()
    usage()
}

function usage() {
    console.log(`${chalk.whiteBright('tool [CMD]')}
  ${chalk.greenBright('init')}\tInitialize a new repository
  ${chalk.greenBright('add <file>')}\tStage a file
  ${chalk.greenBright('commit')}\tCommit staged files
  ${chalk.greenBright('log')}\tShow commit history
  ${chalk.greenBright('diff')}\tShow staged changes vs last commit`)
}