// A cache tag for public assets; this is not a security hash.
export function versionGameAssets(html, assets) {
  let hash = 2166136261;
  for (const source of [html, ...assets]) for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
  const version = (hash >>> 0).toString(36);
  return { html: tagGameAssets(html, version), version };
}

export function tagGameAssets(html, version) {
  return html
    .replace(/((?:src|href)=["'])(\/(?:theme\.css|ui\.js|ui-exact\.js|enhancements\.js))(["'])/g, `$1$2?v=${version}$3`)
    .replace(/(from\s*["'])(\.\/[\w-]+\.js)(["'])/g, `$1$2?v=${version}$3`);
}
