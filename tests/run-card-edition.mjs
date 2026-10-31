import {spawnSync} from 'node:child_process';
for(const file of ['dragon-pack.cjs','merfling.mjs','pocket-rules.mjs','pocket-client.cjs','cards-trading.cjs','pocket-server.mjs','trades-server.mjs']){const r=spawnSync(process.execPath,['tests/'+file],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1)}
