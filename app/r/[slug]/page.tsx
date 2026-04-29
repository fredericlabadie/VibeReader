"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { StoredMix } from "@/lib/store";

const P = { paper:"#efe7d6",paperDark:"#e6dcc7",ink:"#161410",ink2:"#2a2622",red:"#d3411e",blue:"#1f3aa6",yellow:"#f5c842",green:"#7aa86b",fade:"#7d7464" };
const F = { display:"'Fraunces', serif", serif:"'Newsreader', Georgia, serif", mono:"'DM Mono', 'Courier New', monospace" };

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,400&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;1,9..144,400&family=DM+Mono:wght@400&display=swap');`;
const RESPONSIVE = `${FONTS} .vr-t:hover{background:${P.paperDark}} .vr-bc{transition:transform .25s} .vr-bc:hover{transform:rotate(0deg) translateY(-4px)!important} @media(max-width:720px){.vr-tracks,.vr-books{grid-template-columns:1fr!important}.vr-hero,.vr-section{padding:24px 22px 0!important}}`;

const sq = (q:string) => `https://open.spotify.com/search/${encodeURIComponent(q)}`;
const gr = (t:string,a:string) => `https://www.goodreads.com/search?q=${encodeURIComponent(`${t} ${a}`)}`;
const bs = (t:string) => `https://bookshop.org/search?keywords=${encodeURIComponent(t)}`;
function ago(ms:number){const s=Math.floor((Date.now()-ms)/1000);if(s<60)return"just now";if(s<3600)return`${Math.floor(s/60)}m ago`;if(s<86400)return`${Math.floor(s/3600)}h ago`;if(s<604800)return`${Math.floor(s/86400)}d ago`;return new Date(ms).toLocaleDateString([],{month:"short",day:"numeric"});}

const CP=[{bg:P.red,fg:P.paper},{bg:P.blue,fg:P.paper},{bg:P.ink,fg:P.yellow},{bg:P.yellow,fg:P.ink},{bg:P.paper,fg:P.ink,stroke:P.ink},{bg:P.green,fg:P.ink}];
const BP=[{bg:P.blue,fg:P.paper},{bg:P.red,fg:P.yellow},{bg:P.green,fg:P.ink},{bg:P.ink,fg:P.paper},{bg:P.yellow,fg:P.ink},{bg:P.paper,fg:P.ink,stroke:P.ink}];

function TC({title,idx}:{title:string;idx:number}){const c=CP[idx%CP.length];return(<div style={{width:72,height:72,background:c.bg,color:c.fg,fontFamily:F.display,padding:7,display:"flex",flexDirection:"column",justifyContent:"space-between",flexShrink:0,boxShadow:"stroke"in c?`inset 0 0 0 1.5px ${(c as any).stroke}`:"none"}}><div style={{fontFamily:F.mono,fontSize:7,letterSpacing:"0.16em",textTransform:"uppercase",opacity:0.75}}>{String(idx+1).padStart(2,"0")}</div><div style={{fontStyle:"italic",fontWeight:600,fontSize:11,lineHeight:1.0,letterSpacing:"-0.02em",wordBreak:"break-word"}}>{title.length>22?title.slice(0,20)+"…":title}</div></div>);}
function BC({title,idx}:{title:string;idx:number}){const c=BP[idx%BP.length];return(<div style={{width:130,height:185,background:c.bg,color:c.fg,padding:10,fontFamily:F.display,display:"flex",flexDirection:"column",justifyContent:"space-between",boxShadow:`4px 4px 0 ${P.ink}`,flexShrink:0,border:"stroke"in c?`1.5px solid ${(c as any).stroke}`:"none"}}><div style={{fontFamily:F.mono,fontSize:8,letterSpacing:"0.16em",textTransform:"uppercase",opacity:0.7}}>· vr pick</div><div style={{fontStyle:"italic",fontWeight:700,fontSize:18,lineHeight:1.0,letterSpacing:"-0.02em"}}>{title}</div></div>);}

function Nav({slug,createdAt,isSongs}:{slug:string;createdAt:number;isSongs:boolean}){return(<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 48px",borderBottom:`1.5px solid ${P.ink}`}}><div style={{display:"flex",alignItems:"baseline",gap:14}}><a href="/" style={{display:"inline-flex",alignItems:"baseline",textDecoration:"none"}}><span style={{fontFamily:F.display,fontSize:22,fontWeight:700,letterSpacing:"-0.02em",color:P.ink}}>vibe</span><span style={{fontFamily:F.display,fontSize:22,fontWeight:400,fontStyle:"italic",color:P.red}}>reader</span><span style={{width:7,height:7,borderRadius:99,background:P.red,marginLeft:3,transform:"translateY(-9px)",display:"inline-block"}}/></a><span style={{fontFamily:F.mono,fontSize:10,color:P.fade,letterSpacing:"0.16em",textTransform:"uppercase"}}>· {isSongs?"side a":"side b"} · {ago(createdAt)}</span></div><div style={{display:"flex",gap:18,alignItems:"center"}}><a href="/archive" style={{fontFamily:F.mono,fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",color:P.ink,textDecoration:"none"}}>archive</a><a href="/" style={{padding:"5px 12px",background:P.ink,color:P.paper,fontFamily:F.mono,fontSize:10,letterSpacing:"0.12em",textDecoration:"none"}}>make your own ↓</a></div></div>);}

function Footer({slug}:{slug:string}){return(<div style={{padding:"24px 56px 40px",display:"flex",justifyContent:"space-between",fontFamily:F.mono,fontSize:10,color:P.fade,letterSpacing:"0.08em",textTransform:"uppercase",flexWrap:"wrap",gap:8,borderTop:`1px solid ${P.ink}33`,marginTop:8}}><span>vibereader · made with claude</span><span style={{color:P.ink}}>permanent link · /r/{slug}</span><span>always double-check titles</span></div>);}

export default function MixPage(){
  const params=useParams<{slug:string}>();
  const [mix,setMix]=useState<StoredMix|null>(null);
  const [status,setStatus]=useState<"loading"|"ok"|"notfound">("loading");

  useEffect(()=>{
    if(!params?.slug)return;
    fetch(`/api/mix/${params.slug}`).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(d=>{setMix(d);setStatus("ok");}).catch(()=>setStatus("notfound"));
  },[params?.slug]);

  const bg={minHeight:"100vh",background:P.paper,backgroundImage:`radial-gradient(${P.ink}11 1px, transparent 1px) 0 0/3px 3px`,color:P.ink};

  if(status==="loading")return(<div style={bg}><style>{FONTS}</style><div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:F.mono,fontSize:10,color:P.fade,letterSpacing:"0.14em"}}>loading…</div></div>);

  if(status==="notfound"||!mix)return(<div style={{...bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}><style>{FONTS}</style><div style={{textAlign:"center"}}><div style={{fontFamily:F.display,fontStyle:"italic",fontWeight:700,fontSize:72,color:`${P.ink}18`,lineHeight:1}}>?!</div><h2 style={{fontFamily:F.display,fontSize:36,fontWeight:700,letterSpacing:"-0.02em",color:P.ink,margin:"8px 0 12px"}}>mix not found.</h2><p style={{fontFamily:F.serif,fontStyle:"italic",fontSize:16,color:P.fade,marginBottom:24}}>this link may have expired or never existed.</p><a href="/" style={{display:"inline-block",padding:"11px 22px",background:P.ink,color:P.paper,fontFamily:F.display,fontStyle:"italic",fontSize:16,fontWeight:700,border:`2px solid ${P.ink}`,boxShadow:`4px 4px 0 ${P.red}`,textDecoration:"none"}}>make your own →</a></div></div>);

  const r=mix.result as any;
  const isSongs=mix.kind==="book→songs";
  const slug=params?.slug??"";

  if(isSongs){
    const np=r.songListName?.includes(",")
      ?[r.songListName.split(",")[0]+",",r.songListName.split(",").slice(1).join(",").trim()]
      :[r.songListName,""];
    return(<div style={bg}><style>{RESPONSIVE}</style><Nav slug={slug} createdAt={mix.createdAt} isSongs={true}/>
      <div className="vr-hero" style={{padding:"32px 56px 0"}}>
        <div style={{fontFamily:F.mono,fontSize:11,letterSpacing:"0.18em",color:P.red,textTransform:"uppercase",marginBottom:8}}>side a · book → songs · {r.songs?.length} tracks</div>
        <div style={{fontFamily:F.serif,fontStyle:"italic",fontSize:16,color:P.fade,marginBottom:14}}>for <em style={{color:P.ink,fontStyle:"normal",fontWeight:600}}>{mix.bookTitle}</em>{mix.bookAuthor&&<> · {mix.bookAuthor}</>}</div>
        <h1 style={{fontFamily:F.display,fontSize:"clamp(48px, 8vw, 100px)",fontWeight:700,lineHeight:0.88,letterSpacing:"-0.04em",color:P.ink,margin:0}}>{np[0]}<br/>{np[1]&&<span style={{fontStyle:"italic",fontWeight:400,color:P.red}}>{np[1]}</span>}</h1>
        <p style={{fontFamily:F.serif,fontStyle:"italic",fontSize:19,lineHeight:1.5,color:P.ink,maxWidth:620,marginTop:22}}>{r.rationale}</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:18}}>{r.moodTags?.map((t:string,i:number)=>(<span key={t} style={{fontFamily:F.mono,fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",padding:"5px 12px",border:`1.5px solid ${P.ink}`,background:i===0?P.yellow:"transparent"}}>· {t}</span>))}</div>
        <div style={{marginTop:24,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}><a href={sq(r.songListName)} target="_blank" rel="noopener noreferrer" style={{padding:"13px 20px",background:P.ink,color:P.paper,fontFamily:F.display,fontStyle:"italic",fontSize:17,fontWeight:700,border:`2px solid ${P.ink}`,boxShadow:`4px 4px 0 ${P.red}`,textDecoration:"none"}}>↗ open in spotify</a><span style={{fontFamily:F.mono,fontSize:9,color:P.fade,letterSpacing:"0.06em"}}>opens search · queue is on you</span></div>
      </div>
      <div className="vr-section" style={{padding:"30px 56px 16px",borderTop:`2px solid ${P.ink}`,marginTop:36}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:18}}><div style={{fontFamily:F.mono,fontSize:11,letterSpacing:"0.18em",textTransform:"uppercase"}}>tracklist</div><div style={{fontFamily:F.mono,fontSize:10,color:P.fade}}>click any track to search on spotify</div></div>
        <div className="vr-tracks" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,columnGap:40}}>{r.songs?.map((s:any,i:number)=>(<a key={i} className="vr-t" href={sq(`${s.artist} ${s.title}`)} target="_blank" rel="noopener noreferrer" style={{display:"grid",gridTemplateColumns:"40px 72px 1fr",gap:14,padding:"12px 6px",borderBottom:`1px dotted ${P.ink}55`,alignItems:"flex-start",textDecoration:"none",color:"inherit",transition:"background .1s"}}><div style={{fontFamily:F.display,fontSize:28,fontStyle:"italic",fontWeight:700,color:i<3?P.red:P.ink,lineHeight:0.95,letterSpacing:"-0.02em"}}>{String(i+1).padStart(2,"0")}</div><TC title={s.title} idx={i}/><div><div style={{fontFamily:F.display,fontSize:18,fontWeight:600,lineHeight:1.15}}>{s.title}</div><div style={{fontFamily:F.mono,fontSize:10,color:P.fade,letterSpacing:"0.1em",textTransform:"uppercase",marginTop:2}}>· {s.artist}</div><div style={{fontFamily:F.serif,fontStyle:"italic",fontSize:13,color:P.ink2,marginTop:6,lineHeight:1.5}}>{s.whyItFits}</div></div></a>))}</div>
      </div>
      <Footer slug={slug}/></div>);
  }

  return(<div style={bg}><style>{RESPONSIVE}</style><Nav slug={slug} createdAt={mix.createdAt} isSongs={false}/>
    <div className="vr-hero" style={{padding:"32px 56px 0"}}>
      <div style={{fontFamily:F.mono,fontSize:11,letterSpacing:"0.18em",color:P.red,textTransform:"uppercase",marginBottom:10}}>side b · song → books</div>
      <h1 style={{fontFamily:F.display,fontWeight:700,lineHeight:0.88,letterSpacing:"-0.035em",color:P.ink,fontSize:"clamp(44px, 7vw, 80px)"}}>
        if you like<br/>
        <em style={{fontWeight:400,color:P.red,fontStyle:"italic"}}>{mix.songTitle}{mix.songArtist?` · ${mix.songArtist}`:""},</em><br/>
        <span style={{position:"relative",display:"inline-block"}}>read these.<span style={{position:"absolute",left:-4,right:-4,bottom:10,height:14,background:P.yellow,zIndex:-1}}/></span>
      </h1>
      <p style={{fontFamily:F.serif,fontStyle:"italic",fontSize:18,lineHeight:1.5,color:P.ink,marginTop:20,maxWidth:580}}>{r.rationale}</p>
      {mix.digestSummary&&!mix.digestSummary.startsWith("using song")&&(<div style={{marginTop:16,padding:"12px 16px",background:P.paperDark,border:`1.5px dashed ${P.ink}55`,display:"flex",gap:12}}><span style={{fontFamily:F.display,fontStyle:"italic",fontWeight:700,fontSize:13,color:P.red,whiteSpace:"nowrap"}}>spotify digest →</span><span style={{fontFamily:F.serif,fontStyle:"italic",fontSize:13,color:P.ink2}}>{mix.digestSummary}</span></div>)}
    </div>
    <div className="vr-section" style={{padding:"36px 56px 0",borderTop:`2px solid ${P.ink}`,marginTop:36}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:22}}><div style={{fontFamily:F.mono,fontSize:11,letterSpacing:"0.18em",textTransform:"uppercase"}}>the stack · {r.books?.length} books</div><div style={{fontFamily:F.mono,fontSize:10,color:P.fade}}>each book is a track on side b</div></div>
      <div className="vr-books" style={{display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:30,columnGap:50}}>{r.books?.map((b:any,i:number)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"130px 1fr",gap:22,alignItems:"flex-start",paddingBottom:24,borderBottom:i>=r.books.length-2?"none":`1px dotted ${P.ink}55`}}><div className="vr-bc" style={{transform:i%2===0?"rotate(-1.5deg)":"rotate(1.2deg)"}}><BC title={b.title} idx={i}/></div><div><div style={{fontFamily:F.mono,fontSize:9,letterSpacing:"0.18em",color:P.red,textTransform:"uppercase"}}>· track {String(i+1).padStart(2,"0")}</div><div style={{fontFamily:F.display,fontSize:24,fontWeight:600,fontStyle:"italic",color:P.ink,lineHeight:1.05,marginTop:4,letterSpacing:"-0.015em"}}>{b.title}</div><div style={{fontFamily:F.mono,fontSize:11,color:P.ink2,marginTop:6,letterSpacing:"0.05em"}}>by <span style={{textTransform:"uppercase",letterSpacing:"0.1em"}}>{b.author}</span></div><div style={{fontFamily:F.serif,fontStyle:"italic",fontSize:13,color:P.ink2,marginTop:10,lineHeight:1.5}}>{b.whyItFits}</div><div style={{display:"flex",gap:8,marginTop:12,fontFamily:F.mono,fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase"}}><a href={gr(b.title,b.author)} target="_blank" rel="noopener noreferrer" style={{padding:"3px 10px",border:`1.5px solid ${P.ink}`,color:P.ink,textDecoration:"none"}}>goodreads ↗</a><a href={bs(b.title)} target="_blank" rel="noopener noreferrer" style={{padding:"3px 10px",border:`1.5px solid ${P.ink}`,color:P.ink,textDecoration:"none"}}>bookshop ↗</a></div></div></div>))}</div>
    </div>
    <Footer slug={slug}/></div>);
}
