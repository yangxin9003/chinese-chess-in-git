import _ from 'lodash'

export enum Player {
    red = 1,
    black = 0
}

export type State = {
    surface: string,
    player: Player
}

export type ColorString = 'red'|'blue'|'gray'|'yellow'|'green'|'white'

export function getPlayerMasterSurface (player: Player) {
    return player === Player.red ? '帅' : '将'
}

const DefaultMapState: Array<Array<State|null>> = [
    [
        { surface: "车", player: Player.black },
        { surface: "马", player: Player.black },
        { surface: "象", player: Player.black },
        { surface: "士", player: Player.black },
        { surface: getPlayerMasterSurface(Player.black), player: Player.black },
        { surface: "士", player: Player.black },
        { surface: "象", player: Player.black },
        { surface: "马", player: Player.black },
        { surface: "车", player: Player.black },
    ],
    [null, null, null, null, null, null, null, null, null],
    [
        null,
        { surface: "炮", player: Player.black },
        null,
        null,
        null,
        null,
        null,
        { surface: "炮", player: Player.black },
        null,
    ],
    [
        { surface: "卒", player: Player.black },
        null,
        { surface: "卒", player: Player.black },
        null,
        { surface: "卒", player: Player.black },
        null,
        { surface: "卒", player: Player.black },
        null,
        { surface: "卒", player: Player.black },
    ],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    [
        { surface: "兵", player: Player.red },
        null,
        { surface: "兵", player: Player.red },
        null,
        { surface: "兵", player: Player.red },
        null,
        { surface: "兵", player: Player.red },
        null,
        { surface: "兵", player: Player.red },
    ],
    [
        null,
        { surface: "炮", player: Player.red },
        null,
        null,
        null,
        null,
        null,
        { surface: "炮", player: Player.red },
        null,
    ],
    [null, null, null, null, null, null, null, null, null],
    [
        { surface: "车", player: Player.red },
        { surface: "马", player: Player.red },
        { surface: "相", player: Player.red },
        { surface: "仕", player: Player.red },
        { surface: getPlayerMasterSurface(Player.red), player: Player.red },
        { surface: "仕", player: Player.red },
        { surface: "相", player: Player.red },
        { surface: "马", player: Player.red },
        { surface: "车", player: Player.red },
    ],
];

export default DefaultMapState

export const AllRed = _.groupBy(_.flatten(DefaultMapState).filter(data => data?.player === Player.red), 'surface')
export const AllBlack = _.groupBy(_.flatten(DefaultMapState).filter(data => data?.player === Player.black), 'surface')
