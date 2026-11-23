"""Word timings for the burned-in captions of "Menara Es Dolma" (final cut, copied from garam_caption_align.py).

The final video's voice is the ElevenLabs narration, sped up ~1.08x / ~1.06x in CapCut, with the
"Lalu... Tuh kan, runtuh juga" lines cut and the edit ending after "...paling duluan tanam." This script
1) splits the clean narration into pause-separated phrases (one per entry in P; None = a phrase cut from the edit),
2) maps narration time -> video time by correlating short narration chunks with the video's audio,
3) spreads each phrase's words by syllable count, snapping comma pauses to real silences,
4) writes src/videos/ladakh/captions.json for the LadakhCaptions composition (and the music ducking).

    python3 audio/ladakh_caption_align.py <voice.wav 48k> <video_audio.wav 48k> [out.json]
Make the WAVs with Remotion's ffmpeg:  ffmpeg -i in -ar 48000 -c:a pcm_s16le out.wav
"""
import sys
import numpy as np, scipy.io.wavfile as w, json, re
from scipy.signal import resample_poly, fftconvolve
VOICE, VIDEO = sys.argv[1], sys.argv[2]
OUT = sys.argv[3] if len(sys.argv) > 3 else 'src/videos/ladakh/captions.json'
P=["Di gurun paling dingin di India,","ada petani yang bikin menara es setinggi rumah dua lantai.",
"Tiap malam, dia semprotin air sungai ke udara...","biar beku.","Jadi begini.","Namanya Dolma.",
"Tahun lalu panennya gagal,","benihnya telat ditanam.","Kalau tahun ini gagal lagi,",
"ladangnya harus dijual ke tetangganya,","Tashi.","Dia udah lama ngincer tanah ini buat penginapan.",
"\"Air kok dijadiin patung?","Musim dingin gini, air nggak ada gunanya!\"","Warga ikut bisik-bisik.",
"\"Kasihan,","gagal panen bikin dia stres.\"","Tabungan Dolma habis buat pipa.","Anehnya,",
"pipa itu dikubur dalam-dalam.","Dan dia cuma kerja pas malam paling dingin.","Tashi nurunin tawarannya.",
"Dua kali.","Tashi mulai ngintip tiap malam.","Dia sadar satu hal:","menaranya makin tinggi,",
"tapi nggak makin lebar.","Keras kayak batu.","\"Kalau cuma es...","aku bisa bikin lebih banyak.\"",
"Tashi banjirin seluruh ladangnya.","Esnya tiga kali lebih luas.","Rata.","Mengilap.","Kayak lapangan seluncur.",
"Bulan Maret, matahari mulai galak.","Es Tashi menyusut jadi genangan,","airnya ngalir ke lembah.",
None,None,None,  # "Lalu..." / "Tuh kan," / "runtuh juga." cut from the edit
"Lalu datang April.","Waktunya tanam.","Dan sungainya...","kering.","Satu desa nunggu air.","Es Tashi?","Habis.",
"Tapi di ujung desa...","menara Dolma masih netes.","Pelan.","Tapi nggak berhenti.",
"Es di gunung sini baru cair musim panas.","Padahal tanamnya musim semi.",
"Air musim dingin yang biasanya kebuang, Dolma tampung.","Pipanya dikubur, biar nggak ikut beku.",
"Kerucut cuma sedikit yang kena matahari, jadi cairnya pelan.","Es lebar habis duluan.",
"Pas banget waktu ladang butuh air.","Tahun ini, Dolma paling duluan tanam.",
None,None,None]  # "Yang antre di ujung paritnya..." / "Tashi." / "Bawa ember." are after the edit's end
sr,v=w.read(VOICE); v=v.astype(float)/32768
v=v.mean(1) if v.ndim>1 else v
hop=sr//100; n=len(v)//hop
db=20*np.log10(np.sqrt(np.array([np.mean(v[i*hop:(i+1)*hop]**2) for i in range(n)]))+1e-9)
# phrases: speech above -42 dB, pauses shorter than 0.28 s are bridged, blips under 0.12 s dropped
idx=np.where(db>-42)[0]; isl=[]; s0=p0=idx[0]
for i in idx[1:]:
    if i-p0>28: isl.append([s0/100,(p0+1)/100]); s0=i
    p0=i
isl.append([s0/100,(p0+1)/100]); isl=[x for x in isl if x[1]-x[0]>0.12]
assert len(isl)==len(P),(len(isl),len(P))
def syl(wd):
    wd=wd.lower()
    return max(1,len(re.findall(r'[aiueo]+',wd)))
# voice->mov map: robust linear fit per segment from chunk correlation
def load(p):
    s,x=w.read(p); x=x.astype(float); x=x.mean(1) if x.ndim>1 else x; return resample_poly(x,1,6)
vv=load(VOICE); m=load(VIDEO); r=8000; win=int(1.2*r)
e=np.sqrt(fftconvolve(m**2,np.ones(win),mode='valid'))+1e-9
pts=[]
for t0 in np.arange(0,len(vv)/r-1.2,0.3):
    a=vv[int(t0*r):int(t0*r)+win]
    if np.sqrt(np.mean(a**2))<200: continue
    c=fftconvolve(m,a[::-1],mode='valid')/(e*np.linalg.norm(a)); k=int(np.argmax(c)); pts.append((t0,k/r,c[k]))
pts=np.array(pts)
def fit(lo,hi,guess):
    q=pts[(pts[:,0]>=lo)&(pts[:,0]<hi)&(pts[:,2]>0.25)]
    q=q[np.abs(q[:,1]-np.polyval(guess,q[:,0]))<0.3]
    for tol in (0.15,0.08,0.05):
        A=np.polyfit(q[:,0],q[:,1],1); res=q[:,1]-np.polyval(A,q[:,0]); q=q[np.abs(res)<tol]
    print('fit',lo,hi,A,'n',len(q),'resid ms',np.abs(q[:,1]-np.polyval(A,q[:,0])).max()*1000)
    return A
A1=fit(0,71.2,[0.926,0.02]); A2=fit(74.3,112,[0.944,66.44-0.944*74.0])
print('cut: voice 71.21->',np.polyval(A1,71.21),' voice 74.73->',np.polyval(A2,74.73))
def tomov(t): return float(np.polyval(A1 if t<73 else A2,t))
def corr_fix(a,b):
    pred=tomov(a); L=min(b-a,0.45)
    seg=vv[int(a*r):int((a+L)*r)]
    lo=max(0,int((pred-0.6)*r)); hay=m[lo:lo+int((L+1.2)*r)]
    c=fftconvolve(hay,seg[::-1],'valid'); en=np.sqrt(fftconvolve(hay**2,np.ones(len(seg)),'valid'))+1e-9
    nc=c/(en*np.linalg.norm(seg)); j=int(np.argmax(nc)); d=(lo+j)/r-pred
    return (d if nc[j]>0.45 and abs(d)>0.06 else 0.0), nc[j]  # weak matches gave false shifts here
out=[]
for (a,b),ph in zip(isl,P):
    if ph is None: continue
    fix,cc=corr_fix(a,b)
    if fix: print('fix',ph[:30],round(fix,3),'corr',round(cc,2))
    parts=[p.strip() for p in re.split(r'(?<=,)\s+',ph)]
    # find internal gaps
    i0,i1=int(a*100),int(b*100); quiet=db[i0:i1]<-42
    gaps=[];k=0
    while k<len(quiet):
        if quiet[k]:
            j=k
            while j<len(quiet) and quiet[j]: j+=1
            if j-k>=6: gaps.append(((i0+k)/100,(i0+j)/100))
            k=j
        else: k+=1
    tot=sum(syl(x) for x in ph.split()); bounds=[a]; acc=0
    for p in parts[:-1]:
        acc+=sum(syl(x) for x in p.split()); exp=a+(b-a)*acc/tot
        g=min(gaps,key=lambda g:abs((g[0]+g[1])/2-exp)) if gaps else None
        if g and abs((g[0]+g[1])/2-exp)<0.6: bounds+= [g[0],g[1]]
        else: bounds+=[exp,exp]
    bounds.append(b)
    for pi,p in enumerate(parts):
        s,t=bounds[2*pi],bounds[2*pi+1]; ws=p.split(); ss=[syl(x) for x in ws]; T=sum(ss); c=s
        for wd,sy in zip(ws,ss):
            d=(t-s)*sy/T; out.append(dict(w=wd,s=round(tomov(c)+fix,3),e=round(tomov(c+d)+fix,3))); c+=d
        out[-1]['brk']=True  # phrase end
    out[-1]['end']=True
json.dump(out,open(OUT,'w'),ensure_ascii=False,indent=0)
print(len(out),'words; last',out[-1])
print(' '.join(f"{o['w']}@{o['s']:.2f}" for o in out[:30]))
