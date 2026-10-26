#!/usr/bin/env python3
"""Audit of the *existing* user-supplied 80s recording; stdlib+ffmpeg only.
Detect local rhythmic transients in subbands instead of guessing BPM timestamps.
Does not publish or fetch any additional copyrighted recording."""
import json,base64,subprocess,tempfile,statistics,math,struct,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
song=json.loads((root/"docs/ritmo-despacito-remix-map.json").read_text())
encoded=(root/"media/ritmo/despacito-remix-80s.ogg.b64").read_text().strip()
assert len(encoded)==460800
with tempfile.TemporaryDirectory() as td:
 src=pathlib.Path(td)/"remix.ogg"
 src.write_bytes(base64.b64decode(encoded))
 def pcm(filters):
  args=["ffmpeg","-v","error","-y","-i",str(src),"-ac","1","-ar","8000"]
  if filters:args+=["-af",filters]
  data=subprocess.check_output(args+["-f","s16le","pipe:1"])
  return list(struct.unpack("<"+str(len(data)//2)+"h",data))
 def novelty(raw):
  hop=80;frames=len(raw)//hop
  energy=[]
  for i in range(frames):
   block=raw[i*hop:(i+1)*hop]
   e=math.sqrt(sum(float(x)*x for x in block)/len(block))
   energy.append(e)
  flux=[]
  for i,e in enumerate(energy):
   baseline=sum(energy[max(0,i-9):max(1,i-2)])/max(1,len(energy[max(0,i-9):max(1,i-2)]))
   flux.append(max(0.0,e-baseline))
  return flux
 low=novelty(pcm("lowpass=f=250"))
 high=novelty(pcm("highpass=f=1000"))
 # Normalize by independent 80th percentile so low frequencies cannot mask snares.
 def norm(v):
  rank=sorted(v);scale=max(1e-5,rank[int(len(rank)*.90)])
  return [min(3,x/scale) for x in v]
 low,high=norm(low),norm(high)
 onset=[low[i]*.62+high[i]*.85 for i in range(min(len(low),len(high)))]
 times=song["noteTimes"];shifts=[];refs=[];quality=[]
 def measure(t):
  at=int(round(t*100))
  local=[(i/100,onset[i]) for i in range(max(4,at-16),min(len(onset)-3,at+17))
         if onset[i]>=max(onset[i-3:i+4])]
  if not local:return (t,0)
  # Favor near the audited timestamp and large independent band transients.
  return max(local,key=lambda x:x[1]-.95*abs(x[0]-t)/.16)
 for t in times:
  best,weight=measure(t)
  refs.append(round(best,3));shifts.append(best-t);quality.append(weight)
 print("ONSET_AUDIT count=",len(times),"peak_strength_median=",round(statistics.median(quality),3))
 print("DEVIATION absolute median=",round(statistics.median(abs(x) for x in shifts),3),
       "p90=",round(sorted(abs(x) for x in shifts)[int(len(shifts)*.9)],3))
 print("DEVIATION mean=",round(statistics.mean(shifts),3),
       "negative=",sum(x<-.04 for x in shifts),"positive=",sum(x>.04 for x in shifts))
 for j in range(0,len(times),10):
  print("AUDIT",j," | ".join("%.3f→%.3f (%+.3f)"%(times[k],refs[k],shifts[k])
         for k in range(j,min(j+10,len(times)))))
 print("REFINED_CUES_JSON=",json.dumps(refs))
