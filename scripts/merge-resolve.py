# Usage, after a merge stops with conflicts in files where both sides only ADDED lines
# (script tags at the end of game/index.html, the test list in tests/run-card-edition.mjs,
# CSS appended to public/theme.css, entries appended to a list):
#   python3 scripts/merge-resolve.py game/index.html tests/run-card-edition.mjs
# then check the result, rebuild, run npm test, and commit. Do not use it on real code conflicts.
"""Resolve 'both sides added' conflicts: keep every line from both sides (no duplicates).
For tests/run-card-edition.mjs, the conflicting line is the test list: combine both lists."""
import re, sys

def union_lists(a, b):
    la = re.search(r"\[(.*?)\]", a).group(1); lb = re.search(r"\[(.*?)\]", b).group(1)
    items = [x for x in la.split(',')]
    for x in lb.split(','):
        if x not in items: items.append(x)
    return a.replace('[' + la + ']', '[' + ','.join(items) + ']')

for path in sys.argv[1:]:
    text = open(path).read()
    out, i = [], 0
    pat = re.compile(r'^<<<<<<< [^\n]*\n(.*?)^=======\n(.*?)^>>>>>>> [^\n]*\n', re.S | re.M)
    def rep(m):
        ours, theirs = m.group(1), m.group(2)
        if path.endswith('run-card-edition.mjs') and ours.count('\n') == 1 and theirs.count('\n') == 1:
            return union_lists(ours, theirs)
        lines = ours.splitlines(keepends=True)
        for l in theirs.splitlines(keepends=True):
            if l not in lines: lines.append(l)
        return ''.join(lines)
    new, n = pat.subn(rep, text)
    assert '<<<<<<<' not in new and '>>>>>>>' not in new, path
    open(path, 'w').write(new)
    print(path, 'resolved', n)
