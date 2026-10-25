# Original Mythlings art

This directory contains the editable source for the first Blender art pass. No paid models, textures or add-ons are used.

- `flaminyx.blend`: editable mesh, ten-bone rig, material palette and four animation actions.
- `create_flaminyx.py`: reproducible model/rig/animation generation and GLB export.
- `flaminyx-report.json`: measured export size and geometry count.
- `../dist/models/flaminyx.glb`: the asset the browser actually loads.

Rebuild with free Blender 4.5 LTS from the project root:

```text
blender --background --factory-startup --python art/create_flaminyx.py
```

The GLB has `Idle`, `Walk`, `Attack` and `Hit` clips. Each game actor gets an independent cloned skeleton and animation mixer. The shiny variant changes the fur materials at runtime. Failed asset loading retains the procedural creature so battles remain playable.

The current .blend stores animation tracks muted to show a clean rest pose when opened. Unmute the desired NLA track to preview its clip. The export script enables tracks during GLB export.

Flaminyx is the first finished model; the rest of the creature roster remains planned work. The game still uses the original models for those species and for bosses.
