import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../../chatgpt-auth';
import { handleSocial } from '../../../../lib/social-api.mjs';
export const dynamic='force-dynamic';
async function handle(request:Request){return handleSocial(request,env.DB,await getChatGPTUser())}
export const GET=handle;
export const POST=handle;
