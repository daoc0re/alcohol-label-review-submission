"""Package source and a ready-to-run build; do not publish anything.
Usage: python3 scripts/package-release.py [output.zip]
"""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import sys, subprocess, json, datetime
root=Path(__file__).resolve().parents[1]
out=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else root.parent/'label-review-release.zip'
if not (root/'dist/index.html').is_file():raise SystemExit('Run pnpm build before packaging.')
# Track source deliberately: excludes untracked secrets/caches and environment state.
tracked=subprocess.check_output(['git','ls-files','-z'],cwd=root).decode().split('\0')
paths=[root/p for p in tracked if p]+list((root/'dist').rglob('*'))
files=sorted(set(p for p in paths if p.is_file()))
if out in files:raise SystemExit('Output archive must not be a packaged input.')
for p in files:
 if p.name.startswith('.env') or any(x in {'.git','node_modules','.sites-runtime','.wrangler'} for x in p.relative_to(root).parts):raise SystemExit('Unexpected private/generated input: '+str(p))
out.parent.mkdir(parents=True,exist_ok=True)
temporary = out.with_name('.'+out.name+'.building')
with ZipFile(temporary,'w',ZIP_DEFLATED) as archive:
 for p in files:archive.write(p,'label-review/'+str(p.relative_to(root)))
 archive.writestr('label-review/RELEASE.json',json.dumps({'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root).decode().strip(),'preparedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'publication':'awaiting explicit owner approval'},indent=2)+'\n')
with ZipFile(temporary) as check:
 if check.testzip() is not None:raise SystemExit('Archive integrity check failed.')
temporary.replace(out)
print(f'{out}: {len(files)+1} files, {out.stat().st_size} bytes')
