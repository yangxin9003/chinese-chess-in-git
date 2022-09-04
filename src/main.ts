import path from 'path'
import packageInfo from '../package.json'
import _ from 'lodash'
import Game from './game/game'
import MainMenu from './game/menu'
import DefaultMapState, { Player } from './game/state'
import { Command } from 'commander'
import GameServer from './git-game-server'
import { Position } from './game/map'

type GameData = {
    mapState: typeof DefaultMapState,
    steps: Array<[Position, Position]>,
    creator: string,
    lastCommitor: Player
}

const program = new Command()
program
    .name('chinese-chess-in-git')
    .version(packageInfo.version, '-v, --version', '版本信息')
    .description('中国象棋游戏，将在分支中提交 chinese-chess-game-data.json 文件进行游戏数据交换')
    .option('-u, --username <name>', '用户名称')
    .option('-w, --workdir <path>', '本地的 git 仓库地址，用于数据交换')
    .option('-b, --branch <path>', '分支名称')
program.parse()

async function start () {
    const options = program.opts()
    // 获取 workdir
    let workdir = options.workdir
    workdir = workdir ? path.join(process.cwd(), workdir) : process.cwd()
    // 初始化 git 游戏服务器信息
    const gameServer = new GameServer(workdir)
    if (options.username) {
        await gameServer.setUserName(options.username)
    }
    await gameServer.initBranch(options.branch)
    // 设置游戏中的用户名称
    const currentUserName = await gameServer.getUserName()
    if (!currentUserName) {
        throw new Error('git 未配置用户名 或 启动时添加 -u 参数')
    }
    // 启动游戏菜单
    const menu = new MainMenu()
    menu.start()
    // 开始新游戏
    menu.on('start', async () => {
        menu.close()
        const game = new Game(Player.red)
        let gameData: GameData = {
            mapState: game.getMapData(),
            steps: [],
            creator: currentUserName,
            lastCommitor: Player.black
        }
        await gameServer.pushData(gameData, `新建游戏：\n\n${game.getMapStateCommitMessage(gameData.mapState)}`)
        const updateGameState = (newGameData: GameData) => {
            if (gameData.steps.length !== newGameData.steps.length) {
                const newSteps = newGameData.steps.slice(gameData.steps.length)
                _.forEach(newSteps, action => {
                    game.applyActionFromOtherPlayer(...action)
                })
                if (newGameData.lastCommitor !== game.player) {
                    game.startTurn()
                }
            } else {
                gameServer.startPullingCommit()
            }
            gameData = newGameData
        }
        gameServer.on('update', updateGameState)
        // 回合开始
        game.startTurn()
        game.on('push', async (action) => {
            gameData.lastCommitor = game.player
            gameData.mapState = game.getMapData()
            gameData.steps.push(action)
            await gameServer.pushData(gameData, `${currentUserName}：\n\n${game.getMapStateCommitMessage(gameData.mapState)}`)
            gameServer.startPullingCommit()
        })
        game.on('exit', () => {
            gameServer.stopPullingCommit()
            gameServer.off('update', updateGameState)
            game.destroy()
            menu.start()
        })
    })
    // 加载游戏
    menu.on('load', async () => {
        menu.close()
        let gameData: GameData = await gameServer.fetchData() as GameData
        if (!gameData) {
            throw new Error('无法加载游戏数据')
        }
        const game = new Game(gameData.creator === currentUserName ? Player.red : Player.black, gameData.mapState)
        const updateGameState = (newGameData: GameData) => {
            if (gameData.steps.length !== newGameData.steps.length) {
                const newSteps = newGameData.steps.slice(gameData.steps.length)
                _.forEach(newSteps, action => {
                    game.applyActionFromOtherPlayer(...action)
                })
                if (newGameData.lastCommitor !== game.player) {
                    game.startTurn()
                }
            } else {
                gameServer.startPullingCommit()
            }
            gameData = newGameData
        }
        gameServer.on('update', updateGameState)
        // 判断初始回合开始
        if (gameData.lastCommitor !== game.player) {
            game.startTurn()
        } else {
            gameServer.startPullingCommit()
        }
        game.on('push', async (action: [Position, Position]) => {
            gameData.lastCommitor = game.player
            gameData.mapState = game.getMapData()
            gameData.steps.push(action)
            await gameServer.pushData(gameData, `${currentUserName}：\n\n${game.getMapStateCommitMessage(gameData.mapState)}`)
            gameServer.startPullingCommit()
        })
        game.on('exit', () => {
            gameServer.stopPullingCommit()
            gameServer.off('update', updateGameState)
            game.destroy()
            menu.start()
        })
    })
}

start()
