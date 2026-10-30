import {spawnSync} from 'node:child_process';
for(const file of ['cards.mjs','cards-client.cjs','cards-trading.cjs','cards-server.mjs','trades-server.mjs']){const r=spawnSync(process.execPath,['tests/'+file],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1)}
