import game from '../game/index.html?raw';
import { tagGameAssets } from '../lib/version-game-assets.mjs';

declare const __EMBER_ASSET_VERSION__: string;
const release = tagGameAssets(game, __EMBER_ASSET_VERSION__);
export function GET() {
 return new Response(release,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Emberlings-Release':__EMBER_ASSET_VERSION__}});
}
