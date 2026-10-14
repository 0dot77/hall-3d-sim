import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const H=window.H,{THREE,scene,cam,orbit,r,P,floorH,gui}=H;const cv=r.domElement;
// ---------- UI ----------
const css=document.createElement('style');css.textContent=`#tb{position:fixed;top:10px;left:50%;transform:translateX(-50%);display:flex;flex-wrap:wrap;gap:4px;max-width:62vw;justify-content:center;background:#000a;padding:6px;border-radius:8px;z-index:2}
#tb button{font:12px system-ui;padding:5px 8px;border:0;border-radius:5px;background:#eee;cursor:pointer}#tb button.on{background:#ffcc33}#tb .sep{width:1px;background:#fff5;margin:0 3px}
#cnt{color:#fff;font:12px system-ui;align-self:center;padding:0 6px}#help{position:fixed;inset:0;background:#000b;display:none;align-items:center;justify-content:center;z-index:5}
#help div{background:#fff;max-width:560px;padding:18px 22px;border-radius:10px;font:13px/1.7 system-ui}#help kbd{background:#eee;border-radius:3px;padding:0 4px;border:1px solid #ccc}
#toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#000c;color:#fff;padding:6px 12px;border-radius:6px;font:13px system-ui;display:none;z-index:6}`;document.head.appendChild(css);
const tb=document.createElement('div');tb.id='tb';document.body.appendChild(tb);
const btn=(t,f,id)=>{const b=document.createElement('button');b.textContent=t;b.onclick=f;if(id)b.id=id;tb.appendChild(b);return b};const sep=()=>{const d=document.createElement('div');d.className='sep';tb.appendChild(d)};
const toast=(m)=>{let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t)}t.textContent=m;t.style.display='block';clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display='none',1800)};
// ---------- models ----------
const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.6});
const MM={seat:mat(0x2b5fa8),leg:mat(0x333333),scr:new THREE.MeshStandardMaterial({color:0x111114,roughness:.2,metalness:.5,emissive:0x0b1630}),frame:mat(0x222222),table:mat(0xf0ede6),stage:mat(0x555a60),hit:new THREE.MeshBasicMaterial({visible:false})};
const TYPES={chair:{n:'의자',r:0},tv55:{n:'TV 55"',w:1.23,h:.71,r:180},tv65:{n:'TV 65"',w:1.45,h:.82,r:180},tv75:{n:'TV 75"',w:1.67,h:.95,r:180},table:{n:'테이블',r:0},stage:{n:'단상',r:180}};
function bx(g,w,h,d,m,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;g.add(o);return o}
function makeMesh(t){const g=new THREE.Group();
 if(t==='chair'){bx(g,.45,.05,.45,MM.seat,0,.45,0);bx(g,.45,.42,.04,MM.seat,0,.68,-.205);for(const[a,b]of[[-1,-1],[1,-1],[-1,1],[1,1]])bx(g,.03,.43,.03,MM.leg,a*.2,.215,b*.2)}
 else if(t.startsWith('tv')){const T=TYPES[t],top=1.85;bx(g,T.w+.03,T.h+.03,.06,MM.frame,0,top-T.h/2,0);bx(g,T.w,T.h,.005,MM.scr,0,top-T.h/2,.031);
  bx(g,.08,top-.15,.05,MM.leg,0,(top-.15)/2+.08,-.06);bx(g,.9,.04,.6,MM.leg,0,.06,-.06);for(const[a,b]of[[-1,-1],[1,-1],[-1,1],[1,1]])bx(g,.05,.04,.05,MM.leg,a*.42,.02,-.06+b*.27)}
 else if(t==='table'){bx(g,1.8,.04,.6,MM.table,0,.72,0);for(const[a,b]of[[-1,-1],[1,-1],[-1,1],[1,1]])bx(g,.04,.7,.04,MM.leg,a*.85,.35,b*.26)}
 else if(t==='stage'){bx(g,3,.3,2,MM.stage,0,.15,0)}
 g.traverse(o=>o.userData.root=g);return g}
// ---------- state ----------
const itemsG=new THREE.Group(),pathsG=new THREE.Group();scene.add(itemsG,pathsG);
let items=[],paths=[],sel=new Set(),selPath=null,mode='select',draft=null;
const ES={snap:'0.1m',rows:5,cols:8,gapX:.6,gapZ:1.0,pathColor:'#ff3b6b'};
function snapV(v){const s=ES.snap==='없음'?0:parseFloat(ES.snap);return s?Math.round(v/s)*s:v}
function place(it){it.mesh.position.set(it.x,floorH(it.x,it.z)+.002,it.z);it.mesh.rotation.y=it.r*Math.PI/180}
function addItem(t,x,z,rot,noSave){const it={t,x,z,r:rot??TYPES[t].r};it.mesh=makeMesh(t);it.mesh.userData.item=it;place(it);itemsG.add(it.mesh);items.push(it);if(!noSave)changed();return it}
function removeItem(it){itemsG.remove(it.mesh);items=items.filter(i=>i!==it);sel.delete(it)}
const helpers=new THREE.Group();scene.add(helpers);
function refreshSel(){helpers.clear();for(const it of sel){const h=new THREE.BoxHelper(it.mesh,0xffcc00);h.userData.it=it;helpers.add(h)}
 for(const p of paths)p.g.traverse(o=>{if(o.material&&o.userData.seg)o.material.color.set(p===selPath?'#ffcc00':p.c)})}
// ---------- paths ----------
function label(text){const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');x.fillStyle='#000c';x.roundRect(0,0,256,64,14);x.fill();x.fillStyle='#fff';x.font='bold 36px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillText(text,128,33);
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false}));s.scale.set(1.2,.3,1);s.renderOrder=10;return s}
const v3=(p)=>new THREE.Vector3(p[0],floorH(p[0],p[1])+.04,p[1]);
function buildPath(p){if(p.g)pathsG.remove(p.g);const g=new THREE.Group();p.g=g;let len=0;const m=new THREE.MeshBasicMaterial({color:p.c});
 for(let i=1;i<p.pts.length;i++){const a=v3(p.pts[i-1]),b=v3(p.pts[i]),d=a.distanceTo(b);len+=Math.hypot(b.x-a.x,b.z-a.z);
  const s=new THREE.Mesh(new THREE.BoxGeometry(.16,.02,d),m);s.position.copy(a).lerp(b,.5);s.lookAt(b);s.userData.seg=1;s.userData.path=p;g.add(s);
  const ar=new THREE.Mesh(new THREE.ConeGeometry(.18,.4,12),m);ar.userData.seg=1;ar.userData.path=p;ar.position.copy(s.position);ar.position.y+=.02;ar.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());g.add(ar)}
 for(const q of p.pts){const dot=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.03,16),m);dot.userData.seg=1;dot.userData.path=p;dot.position.copy(v3(q));g.add(dot)}
 p.len=len;if(p.pts.length>1){const L=label(len.toFixed(1)+' m');const e=v3(p.pts[p.pts.length-1]);L.position.set(e.x,e.y+.5,e.z);g.add(L)}
 pathsG.add(g)}
function addPath(pts,c,noSave){const p={pts,c:c||ES.pathColor};buildPath(p);paths.push(p);if(!noSave)changed();return p}
function removePath(p){pathsG.remove(p.g);paths=paths.filter(q=>q!==p);if(selPath===p)selPath=null}
function finishDraft(){if(!draft)return;const pts=draft.pts.filter((q,i,a)=>i===0||Math.hypot(q[0]-a[i-1][0],q[1]-a[i-1][1])>.05);pathsG.remove(draft.g);draft=null;if(pts.length>1)addPath(pts);setMode('select')}
// ---------- save/load ----------
const ser=()=>({v:1,items:items.map(i=>[i.t,+i.x.toFixed(2),+i.z.toFixed(2),i.r]),paths:paths.map(p=>({c:p.c,pts:p.pts.map(q=>[+q[0].toFixed(2),+q[1].toFixed(2)])}))});
function load(d){[...items].forEach(removeItem);[...paths].forEach(removePath);sel.clear();for(const[t,x,z,ro]of d.items||[])if(TYPES[t])addItem(t,x,z,ro,1);for(const p of d.paths||[])addPath(p.pts,p.c,1);refreshSel();changed()}
function changed(){count();clearTimeout(changed.h);changed.h=setTimeout(()=>localStorage.setItem('hall3d-layout',JSON.stringify(ser())),300)}
const b64u=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const ub64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function pack(o){const s=new Blob([JSON.stringify(o)]).stream().pipeThrough(new CompressionStream('deflate-raw'));return b64u(await new Response(s).arrayBuffer())}
async function unpack(z){const s=new Blob([ub64(z)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));return JSON.parse(await new Response(s).text())}
function download(name,url){const a=document.createElement('a');a.href=url;a.download=name;a.click()}
// ---------- plan view ----------
const ortho=new THREE.OrthographicCamera(-1,1,1,-1,.1,100);ortho.up.set(0,0,-1);const orbit2=new OrbitControls(ortho,cv);
orbit2.enableRotate=false;orbit2.screenSpacePanning=true;orbit2.mouseButtons={LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};orbit2.touches={ONE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_PAN};orbit2.enabled=false;
function fitOrtho(){const D=H.getD(),a=innerWidth/innerHeight,h=Math.max(D.L+2,(D.W+3)/a)/2;Object.assign(ortho,{left:-h*a,right:h*a,top:h,bottom:-h});ortho.updateProjectionMatrix()}
let plan=false;function setPlan(v){plan=v;if(v){const D=H.getD(),cz=(P.flat-P.tiers*P.depth)/2;fitOrtho();ortho.zoom=1;ortho.position.set(.5,30,cz);orbit2.target.set(.5,0,cz);orbit2.update()}
 orbit2.enabled=v;orbit.enabled=!v&&!P.walk;H.viewCam=v?ortho:cam;document.getElementById('bplan').classList.toggle('on',v)}
addEventListener('resize',()=>{if(plan)fitOrtho()});
// ---------- picking ----------
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
function setRay(e){const b=cv.getBoundingClientRect();ndc.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);ray.setFromCamera(ndc,H.viewCam)}
function floorPt(){const hits=ray.intersectObject(H.getRoom(),true).filter(h=>h.object.visible&&h.object.parent.visible&&h.face&&h.face.normal.y>.5);
 if(hits.length)return hits[0].point;const p=new THREE.Vector3();return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),p)}
let down=null,drag=null;
cv.addEventListener('pointerdown',e=>{if(P.walk||e.button!==0)return;setRay(e);down={x:e.clientX,y:e.clientY};
 if(mode!=='select')return;const ih=ray.intersectObjects(itemsG.children,true)[0];
 if(ih){const it=ih.object.userData.root.userData.item;if(e.shiftKey){sel.has(it)?sel.delete(it):sel.add(it)}else if(!sel.has(it)){sel.clear();sel.add(it)}selPath=null;refreshSel();
  const fp=floorPt();if(fp){drag={start:fp.clone(),orig:[...sel].map(i=>[i,i.x,i.z])};orbit.enabled=orbit2.enabled=false;cv.setPointerCapture(e.pointerId)}return}
 const ph=ray.intersectObjects(pathsG.children,true).find(h=>h.object.userData.path);if(ph){selPath=ph.object.userData.path;sel.clear();refreshSel()}});
cv.addEventListener('pointermove',e=>{if(drag){setRay(e);const fp=floorPt();if(!fp)return;const dx=fp.x-drag.start.x,dz=fp.z-drag.start.z;
  for(const[it,x,z]of drag.orig){it.x=snapV(x+dx);it.z=snapV(z+dz);place(it)}drag.moved=1}
 else if(draft){setRay(e);const fp=floorPt();if(fp){draft.preview=[snapV(fp.x),snapV(fp.z)];drawDraft()}}});
cv.addEventListener('pointerup',e=>{const moved=down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>4;
 if(drag){if(drag.moved)changed();drag=null;orbit.enabled=!plan&&!P.walk;orbit2.enabled=plan}
 else if(down&&!moved){setRay(e);
  if(mode==='path'){const fp=floorPt();if(fp){if(!draft)draft={pts:[],g:new THREE.Group()};draft.pts.push([snapV(fp.x),snapV(fp.z)]);drawDraft()}}
  else if(mode==='select'&&!e.shiftKey&&!ray.intersectObjects(itemsG.children,true).length&&!ray.intersectObjects(pathsG.children,true).length){sel.clear();selPath=null;refreshSel()}}
 down=null});
cv.addEventListener('dblclick',()=>{if(mode==='path')finishDraft()});
function drawDraft(){pathsG.remove(draft.g);const pts=draft.preview?[...draft.pts,draft.preview]:draft.pts;draft.g=new THREE.Group();
 const tmp={pts,c:'#ff9900'};buildPath(tmp);pathsG.remove(tmp.g);draft.g=tmp.g;pathsG.add(draft.g)}
// ---------- actions ----------
function center(){const t=plan?orbit2.target:orbit.target;let x=t.x,z=t.z;const D=H.getD();x=Math.max(-D.W/2+.5,Math.min(D.W/2-.5,x));z=Math.max(-P.tiers*P.depth+.5,Math.min(P.flat-.5,z));return[snapV(x),snapV(z)]}
function add(t){const[x,z]=center();const it=addItem(t,x+(Math.random()-.5)*.4,z+(Math.random()-.5)*.4);sel.clear();sel.add(it);refreshSel();setMode('select')}
function addRows(){const[x0,z0]=center();const w=.45+ES.gapX,d=.45+ES.gapZ;sel.clear();
 for(let i=0;i<ES.rows;i++)for(let j=0;j<ES.cols;j++)sel.add(addItem('chair',snapV(x0+(j-(ES.cols-1)/2)*w),snapV(z0+(i-(ES.rows-1)/2)*d),0,1));refreshSel();changed();toast(`의자 ${ES.rows*ES.cols}개 추가`)}
function rot(deg){for(const it of sel){it.r=((it.r+deg)%360+360)%360;place(it)}refreshSel();changed()}
function dup(){const n=[...sel].map(i=>addItem(i.t,i.x+.6,i.z+.6,i.r,1));sel=new Set(n);refreshSel();changed()}
function del(){if(selPath)removePath(selPath);[...sel].forEach(removeItem);refreshSel();changed()}
function setMode(m){if(m!=='path'&&draft){pathsG.remove(draft.g);draft=null}mode=m;document.getElementById('bpath').classList.toggle('on',m==='path');cv.style.cursor=m==='path'?'crosshair':''}
function count(){const c=items.filter(i=>i.t==='chair').length,t=items.filter(i=>i.t.startsWith('tv')).length,l=paths.reduce((s,p)=>s+p.len,0);document.getElementById('cnt').textContent=`의자 ${c}개 · TV ${t}대 · 동선 ${paths.length}개(${l.toFixed(1)}m)`}
function plnPNG(){const was=plan;const s=sel;sel=new Set();refreshSel();setPlan(true);r.render(scene,ortho);download('배치도.png',cv.toDataURL('image/png'));sel=s;refreshSel();if(!was)setPlan(false)}
btn('+ 의자',()=>add('chair'));btn('+ 의자 줄',addRows);btn('+ TV 55"',()=>add('tv55'));btn('+ TV 65"',()=>add('tv65'));btn('+ TV 75"',()=>add('tv75'));btn('+ 테이블',()=>add('table'));btn('+ 단상',()=>add('stage'));sep();
btn('동선 그리기',()=>{if(mode==='path')finishDraft();else{setMode('path');toast('바닥을 클릭해 점 추가 · 더블클릭/Enter로 완료')}},'bpath');btn('평면도',()=>setPlan(!plan),'bplan');sep();
btn('⟲ 15°',()=>rot(15));btn('⟳ 15°',()=>rot(-15));btn('복제',dup);btn('삭제',del);sep();
btn('공유 링크',async()=>{const u=location.origin+location.pathname+'#L='+await pack(ser());history.replaceState(null,'',u);try{await navigator.clipboard.writeText(u);toast('공유 링크를 복사했어요')}catch{prompt('이 링크를 복사하세요',u)}});
btn('내보내기',()=>download('배치.json',URL.createObjectURL(new Blob([JSON.stringify(ser(),null,1)],{type:'application/json'}))));
btn('불러오기',()=>{const i=document.createElement('input');i.type='file';i.accept='.json';i.onchange=async()=>{try{load(JSON.parse(await i.files[0].text()));toast('불러왔어요')}catch{toast('파일을 읽을 수 없어요')}};i.click()});
btn('PNG',plnPNG);btn('전체 지우기',()=>{if(confirm('배치를 모두 지울까요?'))load({})});btn('?',()=>hp.style.display='flex');
const cnt=document.createElement('span');cnt.id='cnt';tb.appendChild(cnt);
const hp=document.createElement('div');hp.id='help';hp.onclick=()=>hp.style.display='none';hp.innerHTML=`<div><b>배치 편집 사용법</b><br>
• 상단 <b>+ 의자 / TV / 테이블 / 단상</b>: 화면 중앙에 추가 · <b>+ 의자 줄</b>: 오른쪽 패널 '의자 줄' 설정대로 한 번에 추가<br>
• 물건 <b>클릭</b> 선택 · <kbd>Shift</kbd>+클릭 여러 개 선택 · <b>드래그</b>로 이동 (계단석 위에 놓으면 높이 자동)<br>
• <kbd>R</kbd>/<kbd>E</kbd> 15° 회전, <kbd>Q</kbd> 반대 회전 · <kbd>Ctrl/⌘</kbd>+<kbd>D</kbd> 복제 · <kbd>Delete</kbd> 삭제 · <kbd>Esc</kbd> 선택 해제<br>
• <b>동선 그리기</b>: 바닥 클릭으로 점 찍기 → 더블클릭 또는 <kbd>Enter</kbd> 완료 (길이 m 표시). 동선 클릭 후 <kbd>Delete</kbd>로 삭제<br>
• <b>평면도</b>: 위에서 본 도면 (드래그 이동 · 휠 확대) · 3D: 드래그 회전, 휠 줌, 우클릭 이동<br>
• 자동 저장됨(이 브라우저) · <b>공유 링크</b>로 배치를 주소에 담아 전달 · <b>내보내기/불러오기</b> JSON · <b>PNG</b> 평면도 이미지<br>
• 스냅 간격은 오른쪽 패널 '배치'에서 변경<br><br><i>아무 곳이나 클릭하면 닫힘</i></div>`;document.body.appendChild(hp);
addEventListener('keydown',e=>{if(P.walk||e.target.tagName==='INPUT')return;const k=e.key.toLowerCase();
 if((e.ctrlKey||e.metaKey)&&k==='d'){e.preventDefault();dup();return}
 if(k==='delete'||k==='backspace'){e.preventDefault();del()}else if(k==='r'||k==='e')rot(-15);else if(k==='q')rot(15);
 else if(k==='enter'&&mode==='path')finishDraft();else if(k==='escape'){if(mode==='path')setMode('select');sel.clear();selPath=null;refreshSel()}});
const f=gui.addFolder('배치');f.add(ES,'snap',['없음','0.1m','0.5m']).name('스냅');f.addColor(ES,'pathColor').name('동선 색');
const fr=f.addFolder('의자 줄');fr.add(ES,'rows',1,30,1).name('줄 수');fr.add(ES,'cols',1,30,1).name('한 줄 의자 수');fr.add(ES,'gapX',0,2,.05).name('좌우 간격(m)');fr.add(ES,'gapZ',.3,3,.05).name('앞뒤 간격(m)');fr.add({a:addRows},'a').name('추가');
H.tick=()=>{for(const h of helpers.children)h.update()};
// rebuild hook: re-seat items when room params change
gui.controllers.forEach(c=>{if(['tiers','rise','depth','flat'].includes(c.property))c.onFinishChange(()=>{items.forEach(place);paths.forEach(buildPath);refreshSel()})});
gui.controllers.find(c=>c.property==='walk')?.onChange(v=>{if(v&&plan)setPlan(false);orbit.enabled=!v});
// ---------- init ----------
(async()=>{const m=location.hash.match(/L=([\w-]+)/);let d=null;if(m)try{d=await unpack(m[1])}catch(e){console.warn('bad hash')}
 if(!d)try{d=JSON.parse(localStorage.getItem('hall3d-layout'))}catch{}if(d)load(d);count();
 if(new URLSearchParams(location.search).get('plan')==='1')setPlan(true);window.__ready=1})();
H.editor={addItem,addPath,ser,pack,setPlan,load};
