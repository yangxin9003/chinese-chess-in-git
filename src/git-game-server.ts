import fs from 'fs'
import path from 'path'
import _ from 'lodash'
import { simpleGit, SimpleGit, GitConfigScope, CleanOptions } from 'simple-git'
import EventEmitter from 'events'

export default class GameServer extends EventEmitter{
    private git: SimpleGit
    private checkTimerId: NodeJS.Timeout|number = 0
    branch: string = ''
    lastCommit: string = ''
    gameDataPathInGit = './chinese-chess-game-data.json'
    gameDataPath = ''
    constructor (workdir: string) {
        super()
        // 初始化 git
        this.git = simpleGit(workdir)
        this.gameDataPath = path.join(workdir, this.gameDataPathInGit)
    }
    async initBranch (branch: string) {
        if (branch) {
            this.branch = branch
            this.switchBranch(branch)
        } else {
            const result = await this.git.raw('rev-parse', '--abbrev-ref', 'HEAD')
            this.branch = result.replace(/\s/g, '')
            await this.git.pull()
        }
    }
    async switchBranch (branch: string) {
        const result = await this.git.branch(['-a'])
        const hasBranch = _.some(result.all, name => name === branch || _.endsWith(name, `/${branch}`))
        if (hasBranch) {
            await this.git.checkout([branch])
        } else {
            await this.git.checkout(['--orphan', branch])
            await this.git.clean(CleanOptions.FORCE)
            try {
                await this.git.raw(['rm', '-rf', '.'])
            } catch (error) {
                console.log('清空失败')
            }
            await this.git.commit('房间分支初始', ['--allow-empty'])
            await this.git.raw('push', '--set-upstream', 'origin', branch)
        }
    }
    async setUserName (name: string) {
        this.git.addConfig('user.name', name, false, GitConfigScope.local)
    }
    async getUserName () {
        return (await this.git.getConfig('user.name')).value
    }
    getData () {
        try {
            const content = fs.readFileSync(this.gameDataPath, {encoding: 'utf-8'})
            return JSON.parse(content)
        } catch (error) {
            return null
        }
    }
    async fetchData () {
        await this.git.pull()
        return this.getData()
    }
    async pushData (data: object, commitMsg: string) {
        const content = JSON.stringify(data)
        fs.writeFileSync(this.gameDataPath, content, {encoding: 'utf-8'})
        await this.git.add(this.gameDataPathInGit)
        await this.git.commit(commitMsg)
        await this.git.raw('push', '--set-upstream', 'origin', this.branch)
    }
    private async getLastCommitHash () {
        const result = await this.git.log({file: this.gameDataPathInGit, maxCount: 1})
        return result.latest?.hash
    }
    async startPullingCommit () {
        const oldHash = await this.getLastCommitHash()
        const check = () => {
            this.checkTimerId = setTimeout(async () => {
                await this.git.pull()
                const newHash = await this.getLastCommitHash()
                if (newHash !== oldHash) {
                    const data = await this.getData()
                    this.emit('update', data)
                } else {
                    check()
                }
            }, 3000)
        }
        check()
    }
    stopPullingCommit () {
        clearTimeout(this.checkTimerId)
    }
}
