"""Build original, editable Mythlings art with Blender's bundled Python.

Run: blender --background --factory-startup --python art/create_flaminyx.py
Exports a small skinned GLB and retains the Blender scene and build report.
"""
import bpy, math, json, os
from mathutils import Vector
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'dist', 'models')
os.makedirs(OUT, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, rough=.72, metal=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Roughness'].default_value = rough
    bs.inputs['Metallic'].default_value = metal
    return m

orange = material('Amber fur', (.86, .255, .052))
light = material('Golden cheek fur', (1, .49, .11))
cream = material('Ivory markings', (1, .86, .63))
dark = material('Warm charcoal', (.045, .055, .075), .4)
teal = material('Jade eyes', (.03, .47, .43), .22)
white = material('Eye sparkle', (1, 1, .97), .2)
pink = material('Inner ears', (.66, .20, .18))
pieces = []

def finish(obj, name, mat, bone):
    obj.name = name
    obj.data.materials.append(mat)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for face in obj.data.polygons:
        face.use_smooth = True
    group = obj.vertex_groups.new(name=bone)
    group.add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
    pieces.append(obj)
    return obj

def ellipsoid(name, loc, scale, mat, bone='Root', segments=14, rings=8):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=1, location=loc)
    obj = bpy.context.object
    obj.scale = scale
    return finish(obj, name, mat, bone)

def cone(name, loc, scale, mat, bone, rotation=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=1, radius2=.03, depth=1, location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.scale = scale
    return finish(obj, name, mat, bone)

ellipsoid('Pear shaped body', (0,.07,.45), (.29,.37,.35), orange)
ellipsoid('Ivory chest bib', (0,-.245,.46), (.19,.08,.25), cream)
ellipsoid('Oversized fox head', (0,-.24,.91), (.365,.30,.315), orange, 'Head', 18, 10)
ellipsoid('Left cream cheek', (-.17,-.475,.78), (.17,.075,.13), cream, 'Head')
ellipsoid('Right cream cheek', (.17,-.475,.78), (.17,.075,.13), cream, 'Head')
ellipsoid('Muzzle', (0,-.515,.815), (.135,.11,.085), cream, 'Head')
ellipsoid('Triangular soft nose', (0,-.61,.86), (.055,.036,.036), dark, 'Head', 12, 6)
ellipsoid('Smile', (0,-.557,.765), (.065,.012,.016), dark, 'Head', 12, 6)
for side, label in [(-1,'L'),(1,'R')]:
    cone('Pointed ear '+label, (side*.245,-.19,1.22), (.14,.12,.40), orange, 'Ear'+label, (0,side*-.19,0))
    cone('Inner ear '+label, (side*.245,-.272,1.245), (.083,.035,.25), pink, 'Ear'+label, (0,side*-.19,0))
    cone('Ear dark tip '+label, (side*.272,-.181,1.405), (.047,.05,.11), dark, 'Ear'+label, (0,side*-.19,0))
    ellipsoid('Eye white '+label, (side*.15,-.493,.96), (.101,.044,.115), cream, 'Head')
    ellipsoid('Iris '+label, (side*.15,-.531,.958), (.064,.022,.082), teal, 'Head')
    ellipsoid('Pupil '+label, (side*.15,-.550,.958), (.033,.012,.06), dark, 'Head', 12, 8)
    ellipsoid('Sparkle '+label, (side*.15-.017,-.563,.990), (.018,.009,.024), white, 'Head', 10, 6)
    ellipsoid('Little brow '+label, (side*.15,-.48,1.085), (.09,.026,.025), light, 'Head', 12, 6)
    cone('Cheek tuft '+label, (side*.34,-.30,.81), (.105,.075,.17), light, 'Head', (0,side*.95,0))
    for front, y in [(True,-.19),(False,.27)]:
        bone=('Front' if front else 'Back')+label
        ellipsoid('Leg '+bone, (side*.205,y,.235), (.085,.09,.18), orange, bone, 12, 8)
        ellipsoid('Boot '+bone, (side*.205,y-.035,.095), (.105,.135,.08), dark, bone, 12, 8)

# A faceted curved tail with a separate cream flame tip.
def tail_loft(name, points, radii, mat, bone):
    vertices, faces = [], []
    for (x,y,z),r in zip(points,radii):
        for j in range(12):
            angle=j*math.tau/12
            vertices.append((x+math.cos(angle)*r,y,z+math.sin(angle)*r))
    for ring in range(len(points)-1):
        for j in range(12):
            a=ring*12+j; b=ring*12+(j+1)%12
            faces.append((a,b,b+12,a+12))
    faces.extend([tuple(reversed(range(12))),tuple(range((len(points)-1)*12,len(points)*12))])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    return finish(obj,name,mat,bone)
tail_loft('Sweeping flame tail', [(0,.32,.40),(.03,.52,.47),(.07,.75,.60),(.09,.94,.82)], [.075,.15,.20,.17], orange, 'Tail')
tail_loft('Cream tail flame',[(.09,.91,.81),(.10,1.02,.97),(.06,1.075,1.13),(-.01,1.04,1.24)],[.17,.15,.085,.005],cream,'TailTip')

# Join parts into one mesh with a small shared palette and per-bone vertex groups.
bpy.ops.object.select_all(action='DESELECT')
for obj in pieces: obj.select_set(True)
bpy.context.view_layer.objects.active=pieces[0]
bpy.ops.object.join()
mesh=bpy.context.object;mesh.name='Flaminyx_SkinnedMesh'
rig_data=bpy.data.armatures.new('Flaminyx_Rig')
rig=bpy.data.objects.new('Flaminyx',rig_data);bpy.context.collection.objects.link(rig)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
bone_defs={
 'Root':((0,0,.05),(0,0,.50),None),
 'Head':((0,-.24,.70),(0,-.24,1.10),'Root'),
 'EarL':((-.24,-.19,1.10),(-.27,-.19,1.40),'Head'),
 'EarR':((.24,-.19,1.10),(.27,-.19,1.40),'Head'),
 'Tail':((0,.32,.40),(.09,.91,.81),'Root'),
 'TailTip':((.09,.91,.81),(-.01,1.04,1.24),'Tail'),
}
for side,label in [(-1,'L'),(1,'R')]:
    for front,y in [(True,-.19),(False,.27)]:
        bone_defs[('Front' if front else 'Back')+label]=((side*.205,y,.36),(side*.205,y,.08),'Root')
for name,(head,tail,parent) in bone_defs.items():
    b=rig_data.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=rig_data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
mesh.parent=rig;modifier=mesh.modifiers.new('Skin','ARMATURE');modifier.object=rig
rig.animation_data_create()
for b in rig.pose.bones:b.rotation_mode='XYZ'

def animate(name,end,sample):
    action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action
    for frame in range(1,end+1,2):
        for bone in rig.pose.bones:bone.rotation_euler=(0,0,0);bone.location=(0,0,0);bone.scale=(1,1,1)
        sample((frame-1)/(end-1),rig.pose.bones)
        for bone in rig.pose.bones:
            bone.keyframe_insert('rotation_euler',frame=frame,group=bone.name)
            bone.keyframe_insert('location',frame=frame,group=bone.name)
    track=rig.animation_data.nla_tracks.new();track.name=name
    strip=track.strips.new(name,1,action);strip.action_frame_start=1;strip.action_frame_end=end
    rig.animation_data.action=None

def idle(t,b):
    b['Root'].location.z=math.sin(t*math.tau)*.015
    b['Head'].rotation_euler.x=math.sin(t*math.tau)*.035
    b['Tail'].rotation_euler.y=math.sin(t*math.tau)*.13
    b['TailTip'].rotation_euler.x=math.sin(t*math.tau+.6)*.12
    b['EarL'].rotation_euler.y=math.sin(t*math.tau)*.07
    b['EarR'].rotation_euler.y=-math.sin(t*math.tau)*.07
def walk(t,b):
    wave=math.sin(t*math.tau)
    b['Root'].location.z=abs(wave)*.035
    for name,sign in [('FrontL',1),('BackR',1),('FrontR',-1),('BackL',-1)]:b[name].rotation_euler.x=wave*.55*sign
    b['Head'].rotation_euler.x=wave*.045
    b['Tail'].rotation_euler.y=wave*.18
def attack(t,b):
    impulse=math.sin(t*math.pi)
    b['Root'].location.y=impulse*.16
    b['Head'].rotation_euler.x=-impulse*.23
    b['FrontL'].rotation_euler.x=-impulse*.75
    b['FrontR'].rotation_euler.x=-impulse*.55
    b['Tail'].rotation_euler.x=-impulse*.3
def hit(t,b):
    impulse=math.sin(t*math.pi)
    b['Root'].location.y=-impulse*.08
    b['Root'].rotation_euler.x=impulse*.15
    b['Head'].rotation_euler.z=math.sin(t*math.tau*2)*.12*(1-t)
    b['EarL'].rotation_euler.y=impulse*.35
    b['EarR'].rotation_euler.y=-impulse*.35
animate('Idle',49,idle);animate('Walk',25,walk);animate('Attack',17,attack);animate('Hit',13,hit)
for track in rig.animation_data.nla_tracks:track.mute=True
bpy.context.scene.frame_set(1)
for bone in rig.pose.bones:bone.rotation_euler=(0,0,0);bone.location=(0,0,0)
bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
source=os.path.join(ROOT,'art','flaminyx.blend')
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=source)
for track in rig.animation_data.nla_tracks:track.mute=False
props=bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
options=dict(filepath=os.path.join(OUT,'flaminyx.glb'),export_format='GLB',use_selection=True,export_animations=True,export_skins=True,export_yup=True,export_force_sampling=True)
if 'export_animation_mode' in props:options['export_animation_mode']='NLA_TRACKS'
bpy.ops.export_scene.gltf(**options)
triangles=sum(len(face.vertices)-2 for face in mesh.data.polygons)
report={'asset':'Flaminyx','tool':'Blender '+bpy.app.version_string,'triangles':triangles,'vertices':len(mesh.data.vertices),'bones':len(rig.pose.bones),'materials':len(mesh.data.materials),'animation_clips':['Idle','Walk','Attack','Hit'],'glb_bytes':os.path.getsize(options['filepath']),'original_art':True}
with open(os.path.join(ROOT,'art','flaminyx-report.json'),'w') as f:json.dump(report,f,indent=2)
print('MYTHLINGS_ASSET_REPORT '+json.dumps(report))
