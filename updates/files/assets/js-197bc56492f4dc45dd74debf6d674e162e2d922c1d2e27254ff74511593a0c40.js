
/* Room/catalogue configuration choices; official product IDs and base prices unchanged. */
(function(global){'use strict';
const M=global.SomassWatkinsDrawerConfigurationData;if(!M)throw Error('Watkins drawer configuration data must load first.');
const nativeIds=new Set(M.nativeExactProductIds),allIds=new Set([...M.nativeExactProductIds,...M.approximate180ProductIds]);
function canHandle(p){return !!p&&allIds.has(p.id);}
function normalizeChoice(value,{legacy=false}={}){if(value==null)return legacy?'four':'none';if(value!=='none'&&value!=='four')throw Error('Çekmece seçeneği geçersiz.');return value;}
function configuration(item,options){return normalizeChoice(item?.drawerConfiguration,options);}
function initializeItem(item,p,value='none'){if(canHandle(p))item.drawerConfiguration=normalizeChoice(value);return item;}
function migrateLayouts(layouts,products,{legacy=false}={}){for(const list of Object.values(layouts||{}))for(const item of list)if(canHandle(products[item.p]))item.drawerConfiguration=normalizeChoice(item.drawerConfiguration,{legacy});return layouts;}
function migrateSnapshot(state,products,options){migrateLayouts(state.layouts,products,options);return state;}
function preparePresets(data){for(const list of Object.values(data.variants||{}))for(const variant of list)migrateLayouts({preset:variant.items||[]},data.products,{legacy:true});}
function accessory(p,data){if(!canHandle(p))return null;const id=/koyu|dark/i.test(p.finish||'')?'CAT_10771672891665':'CAT_10771626197265',entry=data.catalog?.entries?.find(e=>e.id===id),v=entry?.variants?.[0];if(!v)return null;const product=(v.pid&&data.products?.[v.pid])||Object.values(data.products||{}).find(q=>q.catalogProduct===id&&String(q.variantId)===String(v.id)),raw=product?.priceTRY??v.priceTRY,price=typeof raw==='number'&&Number.isFinite(raw)&&raw>=0?raw:null;return{entryId:id,officialVariantId:v.id,name:entry.name,finish:p.finish||'',priceTRY:price,photoId:product?.photoId||v.photoId||entry.photoId,drawersPerSet:2};}
function accessoryCost(item,p,data){if(!canHandle(p)||configuration(item)!=='four')return 0;const a=accessory(p,data);return a?.priceTRY==null?0:2*a.priceTRY;}
function label(item){return configuration(item)==='four'?'4 çekmece (2 set)':'Çekmecesiz';}
function displayName(item,p){return p.name+(canHandle(p)?' · '+label(item):'');}
function money(v){return v==null?'Fiyat bilgisi bekleniyor':Number(v).toLocaleString('tr-TR',{maximumFractionDigits:0})+' TL';}
function roomControlsHTML(item,p,esc){if(!canHandle(p))return'';const mode=configuration(item);return '<div class="sp-bed-setting sp-drawer-setting"><h4>Yatak altı</h4><div class="sp-drawer-options" role="group" aria-label="Yatak altı çekmeceleri">'+[['none','Çekmecesiz'],['four','4 çekmece (2 set)']].map(([id,title])=>'<button type="button" data-drawer-configuration="'+id+'" aria-pressed="'+String(mode===id)+'">'+esc(title)+'</button>').join('')+'</div>'+(!nativeIds.has(p.id)?'<small class="sp-drawer-note">180 cm model, 160 cm özgün CAD parçalarından türetilmiştir.</small>':'')+'</div>';}
function catalogChoiceHTML(entryId,mode,p,data,esc){if(!canHandle(p))return'';mode=normalizeChoice(mode);const a=accessory(p,data);return '<div class="spc-drawer-choice"><span>Yatak altı</span><div class="sp-drawer-options" role="group" aria-label="Yatak altı çekmeceleri">'+[['none','Çekmecesiz'],['four','4 çekmece (2 set)']].map(([id,title])=>'<button type="button" data-spc-drawer="'+id+'" data-spc-drawer-entry="'+esc(entryId)+'" aria-pressed="'+String(mode===id)+'">'+esc(title)+'</button>').join('')+'</div>'+(mode==='four'?'<small>Çekmeceler ayrıca eklenir: '+esc(a?.priceTRY==null?'Fiyat bilgisi bekleniyor':'2 × '+money(a.priceTRY)+' = '+money(2*a.priceTRY))+'</small>':'')+'</div>';}
function accessoryRowHTML(item,p,data,esc,moneyFn=money){if(!canHandle(p)||configuration(item)!=='four')return'';const a=accessory(p,data);if(!a)return '<div class="sp-accessory-row">Çekmece bilgisi bekleniyor.</div>';const image=data.photos?.[a.photoId],price=a.priceTRY==null?'Fiyat bilgisi bekleniyor':'2 × '+moneyFn(a.priceTRY)+' = '+moneyFn(a.priceTRY*2);return '<div class="sp-product-row sp-accessory-row"><div class="sp-row" style="cursor:default">'+(image?'<img src="'+esc(image)+'" alt="'+esc(a.name)+'">':'')+'<span><span class="sp-name">'+esc(a.name)+' · 2 set</span><span class="sp-size">98 × 76,3 × 19,7 cm · '+esc(a.finish)+'</span><span class="sp-price">'+esc(price)+'</span><span class="sp-size">Toplam 4 çekmece</span></span></div></div>';}
global.SomassWatkinsDrawerUI={version:'watkins-drawer-ui-v1',canHandle,nativeIds,normalizeChoice,configuration,initializeItem,migrateLayouts,migrateSnapshot,preparePresets,accessory,accessoryCost,label,displayName,roomControlsHTML,catalogChoiceHTML,accessoryRowHTML};
})(typeof window!=='undefined'?window:globalThis);

/* Avila review only — representative procedural oak, NOT a manufacturer veneer/PBR scan.
 * Units: centimetres. Geometry is local, Y up. Nothing here changes existing planner models.
 *
 * API:
 *   set = SomassOakReview.createMaterialSet(THREE, {finish:'natural_oak', mode:'oak'});
 *   geo = SomassOakReview.applyPartUV(geo, {partId:'left-door', grainAxis:'X',
 *       grainLengthCm:100, grainWidthCm:25, originCm:[0,0,0]});
 *   mesh = new THREE.Mesh(geo, set.modeMaterials); // group 0 wood, group 1 end grain
 *   SomassOakReview.auditUV(geo); // finite UVs and physical-scale checks
 *
 * applyPartUV mutates/returns geometry, expands indexed vertices for seams, replaces groups.
 * UV0: U across grain / grainWidthCm; V along grain / grainLengthCm.
 * UV1: equal metric scale, 20 cm per repeat, for true 10 cm checker squares (texture.channel=1).
 * Face-tangent projection uses triangle normals, including bevels; default Extrude UVs are discarded.
 * grainAxis is in GEOMETRY-local axes. Rotate a part after UV assignment to rotate its grain with it.
 * originCm optionally maintains continuous grain across aligned parts in one assembly coordinate system.
 * projection:'cylinder' supports round/tapered legs, with the long axis specified by grainAxis.
 * splitEndGrain:false keeps all faces at material index 0; UVs are still remapped correctly.
 */
(function (global) {
  'use strict';
  const VERSION = 'avila-oak-review-1';
  const AXIS = {X:0, Y:1, Z:2};
  const TAU = Math.PI * 2;
  const EVIDENCE = Object.freeze({
    kind:'representative procedural material',
    isManufacturerMaterial:false,
    isManufacturerVeneerScan:false,
    isMeasuredPBR:false,
    textureSource:'Deterministic canvas synthesis; no supplier texture, UV unwrap, or finish measurement was supplied.',
    known:'Physical UV scale in centimetres and per-part grain direction can be inspected.',
    estimated:'Oak colour, pore pattern, roughness, bump amplitude, end grain, and finish response are representative.'
  });
  const finitePositive = (v, fallback) => Number.isFinite(Number(v)) && Number(v)>0 ? Number(v) : fallback;
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const norm=a=>{const l=Math.hypot(...a);return l>1e-12?a.map(v=>v/l):[0,0,0];};
  const positiveDirection=a=>{let q=0;for(let k=1;k<3;k++)if(Math.abs(a[k])>Math.abs(a[q]))q=k;return a[q]<0?a.map(v=>-v):a;};
  const hash=s=>{let h=2166136261;for(const c of String(s||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
  const makeCanvas=(w,h)=>{
    const canvas=typeof document!=='undefined'&&document.createElement ? document.createElement('canvas') : typeof OffscreenCanvas!=='undefined' ? new OffscreenCanvas(w,h) : null;
    if(!canvas)return null;canvas.width=w;canvas.height=h;return canvas;
  };
  function maps(T, finish) {
    // 512 px / 25 cm = 2048 px / 100 cm = 20.48 px per cm on both grain axes.
    const canvas=makeCanvas(512,2048), relief=makeCanvas(512,2048), end=makeCanvas(512,512), checker=makeCanvas(512,512);
    if(!canvas||!relief||!end||!checker)return {wood:null,bump:null,end:null,checker:null};
    const ctx=canvas.getContext('2d'), bc=relief.getContext('2d'), ec=end.getContext('2d'), cc=checker.getContext('2d');
    if(!ctx||!bc||!ec||!cc)return {wood:null,bump:null,end:null,checker:null};
    const dark=finish==='dark_oak', base=dark?[102,86,66]:[188,170,140];
    const image=ctx.createImageData(512,2048), bump=bc.createImageData(512,2048);
    for(let y=0;y<2048;y++){
      const v=y/2048, bend=.008*Math.sin(TAU*v)+.003*Math.sin(TAU*v*3), fineBend=.4*Math.sin(TAU*v*2);
      for(let x=0;x<512;x++){
        const u=x/512, a=u+bend;
        const broad=Math.sin(TAU*a*13+.3*Math.sin(TAU*v));
        const fine=Math.sin(TAU*a*71+fineBend);
        const pore=Math.pow(Math.max(0,Math.sin(TAU*a*123+.22*Math.sin(TAU*v*5))),12)*(.35+.65*Math.pow(.5+.5*Math.sin(TAU*v*19+TAU*u*3),2));
        const ray=Math.pow(Math.max(0,Math.sin(TAU*v*79+TAU*u*2)),20)*Math.pow(.5+.5*Math.sin(TAU*u*27),8);
        const field=broad*2.2+fine*.9-pore*5.0+ray*1.8;
        const i=(y*512+x)*4;
        for(let k=0;k<3;k++)image.data[i+k]=Math.max(0,Math.min(255,base[k]+field*(dark?.68:1)));
        image.data[i+3]=255;
        const height=128+fine*3-pore*11+ray*2;
        bump.data[i]=bump.data[i+1]=bump.data[i+2]=height;bump.data[i+3]=255;
      }
    }
    ctx.putImageData(image,0,0);bc.putImageData(bump,0,0);
    const ei=ec.createImageData(512,512);
    for(let y=0;y<512;y++)for(let x=0;x<512;x++){
      const u=x/512,v=y/512;
      // Broad incomplete growth arcs: deliberately not a claim of a particular supplier cut.
      const r=Math.hypot(u+1.8,v-.42), rings=Math.sin(TAU*r*19+.2*Math.sin(TAU*v*4));
      const pores=Math.pow(Math.max(0,Math.sin(TAU*u*91+TAU*v*39)),14);
      const i=(y*512+x)*4, f=rings*2.4-pores*4.5;
      for(let k=0;k<3;k++)ei.data[i+k]=base[k]-3+f;
      ei.data[i+3]=255;
    }
    ec.putImageData(ei,0,0);
    cc.fillStyle='#eeeae0';cc.fillRect(0,0,512,512);
    cc.fillStyle='#7a897d';cc.fillRect(0,0,256,256);cc.fillRect(256,256,256,256);
    cc.strokeStyle='#405a49';cc.lineWidth=2;
    for(const p of[0,256,511]){cc.beginPath();cc.moveTo(p,0);cc.lineTo(p,512);cc.moveTo(0,p);cc.lineTo(512,p);cc.stroke();}
    cc.font='bold 24px sans-serif';cc.textAlign='center';cc.textBaseline='middle';
    for(let y=0;y<2;y++)for(let x=0;x<2;x++){cc.fillStyle=(x+y)%2===0?'#faf9f3':'#405a49';cc.fillText('10 cm',x*256+128,y*256+128);}
    const tex=(c,srgb)=>{const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;t.generateMipmaps=true;if(srgb&&T.SRGBColorSpace)t.colorSpace=T.SRGBColorSpace;t.userData={representative:true,source:EVIDENCE.textureSource};return t;};
    const result={wood:tex(canvas,true),bump:tex(relief,false),end:tex(end,true),checker:tex(checker,true)};
    result.checker.channel=1;
    result.wood.name='Representative oak — 25 × 100 cm repeat';result.bump.name='Representative oak relief — 0.12 mm amplitude';
    result.end.name='Representative oak end grain — 25 × 25 cm repeat';result.checker.name='UV inspection — 10 cm squares, UV1';
    return result;
  }
  function createMaterialSet(T, options={}) {
    if(!T?.MeshStandardMaterial)throw new Error('SomassOakReview requires THREE.MeshStandardMaterial.');
    const finish=options.finish==='dark_oak'?'dark_oak':'natural_oak';
    const mode=['oak','checker','clay'].includes(options.mode)?options.mode:'oak';
    const tx=maps(T,finish), fallback=finish==='dark_oak'?'#665642':'#bcaa8c';
    const wood=new T.MeshStandardMaterial({name:'Representative oak, not manufacturer PBR',color:tx.wood?'#ffffff':fallback,map:tx.wood,bumpMap:tx.bump,bumpScale:.012,roughness:.66,metalness:0});
    const endGrain=new T.MeshStandardMaterial({name:'Representative oak end cut',color:tx.end?'#ffffff':fallback,map:tx.end,roughness:.75,metalness:0});
    const checker=new T.MeshStandardMaterial({name:'10 cm UV checker — geometry UV1',color:tx.checker?'#ffffff':'#89998a',map:tx.checker,roughness:.92,metalness:0});
    const clay=new T.MeshStandardMaterial({name:'Neutral geometry review clay',color:'#c9c6bd',roughness:.85,metalness:0});
    for(const m of[wood,endGrain,checker,clay])m.userData={somassMaterial:{version:VERSION,finish,mode,evidence:EVIDENCE}};
    const result={wood,endGrain,checker,clay,materials:[wood,endGrain],modeMaterials:mode==='checker'?[checker,checker]:mode==='clay'?[clay,clay]:[wood,endGrain],textures:tx,finish,mode,evidence:EVIDENCE};
    result.forMode=m=>m==='checker'?[checker,checker]:m==='clay'?[clay,clay]:[wood,endGrain];
    result.dispose=()=>{for(const t of Object.values(tx))t?.dispose?.();for(const m of[wood,endGrain,checker,clay])m.dispose();};
    return result;
  }
  function applyPartUV(geometry, options={}) {
    if(!geometry?.attributes?.position)throw new Error('applyPartUV requires a BufferGeometry with positions.');
    if(geometry.index){const expanded=geometry.toNonIndexed();geometry.copy(expanded);expanded.dispose();}
    const pos=geometry.attributes.position;
    if(pos.count%3)throw new Error('applyPartUV requires triangle geometry.');
    const axis=String(options.grainAxis||'Y').toUpperCase();
    if(!(axis in AXIS))throw new Error('grainAxis must be X, Y, or Z.');
    const ai=AXIS[axis], grain=[0,0,0];grain[ai]=1;
    const width=finitePositive(options.grainWidthCm,25), length=finitePositive(options.grainLengthCm,100);
    const origin=Array.isArray(options.originCm)?options.originCm.map(v=>Number(v)||0):[0,0,0];
    const partId=String(options.partId||''), h=hash(partId), offset=options.offsetCm||{};
    const acrossOffset=Number.isFinite(offset.cross)?offset.cross:((h%65521)/65521)*width;
    const alongOffset=Number.isFinite(offset.along)?offset.along:(((h>>>7)%65521)/65521)*length;
    const UV=new Float32Array(pos.count*2), checkUV=new Float32Array(pos.count*2);
    const attr=pos.constructor, groups=[], faceInfo=[];
    geometry.computeBoundingBox();const box=geometry.boundingBox;
    const center=[(box.min.x+box.max.x)/2,(box.min.y+box.max.y)/2,(box.min.z+box.max.z)/2];
    const crossAxes=[0,1,2].filter(k=>k!==ai);
    const radius=Math.max((box.max.getComponent(crossAxes[0])-box.min.getComponent(crossAxes[0]))/2,(box.max.getComponent(crossAxes[1])-box.min.getComponent(crossAxes[1]))/2);
    let endCount=0, degenerate=0, maxMetricError=0, groupStart=0, lastMaterial=-1;
    const read=i=>[pos.getX(i),pos.getY(i),pos.getZ(i)];
    for(let i=0;i<pos.count;i+=3){
      const points=[read(i),read(i+1),read(i+2)], n=norm(cross(sub(points[1],points[0]),sub(points[2],points[0])));
      if(Math.hypot(...n)<.5)degenerate++;
      const end=Math.abs(dot(n,grain))>.985;
      if(end)endCount++;
      const material=end&&options.splitEndGrain!==false?1:0;
      if(material!==lastMaterial){if(lastMaterial>=0)groups.push({start:groupStart,count:i-groupStart,materialIndex:lastMaterial});groupStart=i;lastMaterial=material;}
      let V,U;
      if(end){const e=[0,0,0];e[crossAxes[0]]=1;U=positiveDirection(norm(e.map((x,k)=>x-dot(e,n)*n[k])));V=positiveDirection(norm(cross(n,U)));}
      else {V=norm(grain.map((x,k)=>x-dot(grain,n)*n[k]));if(Math.hypot(...V)<.5)V=[0,1,0];U=positiveDirection(norm(cross(n,V)));}
      const isCylinder=options.projection==='cylinder'&&!end&&radius>0;
      let angles=isCylinder?points.map(p=>Math.atan2(p[crossAxes[1]]-center[crossAxes[1]],p[crossAxes[0]]-center[crossAxes[0]])):null;
      if(angles&&Math.max(...angles)-Math.min(...angles)>Math.PI)angles=angles.map(a=>a<0?a+TAU:a);
      const metric=[];
      for(let j=0;j<3;j++){
        const p=points[j].map((v,k)=>v+origin[k]);
        let a,b;
        if(isCylinder){a=angles[j]*radius;b=p[ai];}
        else {a=dot(p,U);b=dot(p,V);}
        const ii=(i+j)*2;
        UV[ii]=(a+acrossOffset)/width;UV[ii+1]=(b+alongOffset)/(end?width:length);
        checkUV[ii]=a/20;checkUV[ii+1]=b/20;
        metric.push([a,b]);
      }
      if(!isCylinder&&Math.hypot(...n)>.5)for(const [j,k] of[[0,1],[1,2],[2,0]]){
        const actual=Math.hypot(...sub(points[j],points[k]));
        const mapped=Math.hypot(metric[j][0]-metric[k][0],metric[j][1]-metric[k][1]);
        if(actual>1e-8)maxMetricError=Math.max(maxMetricError,Math.abs(mapped/actual-1));
      }
      faceInfo.push({start:i,endGrain:end,cylindrical:isCylinder,grain:V,cross:U});
    }
    if(lastMaterial>=0)groups.push({start:groupStart,count:pos.count-groupStart,materialIndex:lastMaterial});
    geometry.setAttribute('uv',new attr(UV,2));geometry.setAttribute('uv1',new attr(checkUV,2));
    geometry.clearGroups();for(const g of groups)geometry.addGroup(g.start,g.count,g.materialIndex);
    geometry.userData=geometry.userData||{};
    geometry.userData.somassUV={version:VERSION,units:'cm',partId,grainAxis:axis,grainVector:grain,grainWidthCm:width,grainLengthCm:length,
      grainRepeatPixels:{cross:512,along:2048},physicalTexelsPerCm:{cross:512/width,along:2048/length},checkerSquareCm:10,
      originCm:origin,offsetCm:{cross:acrossOffset,along:alongOffset},projection:options.projection==='cylinder'?'cylinder with face-tangent end cuts':'metric face-tangent; bevels included',
      materialIndices:{0:'wood face',1:'end grain'},triangleCount:pos.count/3,endGrainTriangles:endCount,degenerateTriangles:degenerate,maxMetricError,
      evidence:EVIDENCE,faces:faceInfo};
    return geometry;
  }
  function auditUV(geometry) {
    const uv=geometry?.attributes?.uv, check=geometry?.attributes?.uv1, pos=geometry?.attributes?.position;
    const meta=geometry?.userData?.somassUV;
    const valid=a=>!!a&&Array.from(a.array).every(Number.isFinite);
    const report={version:VERSION,partId:meta?.partId||null,hasPhysicalUVMetadata:!!meta,finitePositions:valid(pos),finiteUV:valid(uv),finiteCheckerUV:valid(check),
      vertexCount:pos?.count||0,triangleCount:meta?.triangleCount||0,grainAxis:meta?.grainAxis||null,checkerSquareCm:meta?.checkerSquareCm||null,
      maxMetricError:meta?.maxMetricError??null,degenerateTriangles:meta?.degenerateTriangles??null,
      texelsPerCm:meta?.physicalTexelsPerCm||null,representativeMaterial:true};
    report.pass=report.hasPhysicalUVMetadata&&report.finitePositions&&report.finiteUV&&report.finiteCheckerUV&&uv.count===pos.count&&check.count===pos.count&&report.maxMetricError<1e-5;
    return report;
  }
  global.SomassOakReview={version:VERSION,createMaterialSet,applyPartUV,auditUV,evidence:EVIDENCE};
})(typeof window!=='undefined'?window:globalThis);

/* Exact Avila production U-section reconstruction, isolated review helper.
 * Source: production-grip-section.png / .svg (millimetres, detail scale 3:1).
 * Shape dimensions are actual, NOT scaled again from drawing presentation.
 * SomassAvilaGrip.buildGeometry(THREE,widthCm,heightCm,1.8,{edge:'bottom'|'top'}).
 * Result: centered X/Y/Z; front +Z, rear -Z; 18 mm panel; full bounding height.
 * gripRegion vertex attribute: 1 = inner cavity, 0 = other surfaces.
 * applyPartUV may replace groups; call applyCavityGroups(geo) afterwards to use
 * material group2 inside the real recess. Exterior/front flat is never group2.
 */
(function(global){
  'use strict';
  const SOURCE='production U-section';
  function buildGeometry(T,w,h,thick=1.8,options={}){
    w=Number(w);h=Number(h);thick=Number(thick);
    if(!T?.Shape||!Number.isFinite(w)||w<=0||!Number.isFinite(h)||h<=1.85)throw Error('Avila grip needs THREE, positive width and height >1.85 cm.');
    if(Math.abs(thick-1.8)>1e-6)throw Error('Production Avila grip is 18 mm thick; use thickness 1.8 cm.');
    const edge=options.edge==='top'?'top':'bottom';
    // Source section X=0 is the thin FRONT lip, X=18 mm is the REAR edge.
    // Y=0 is the rear lip's overall lowest point. Front flat ends at Y=13.5 mm;
    // the R1.5 mouth reaches Y=12 mm. Inner R5 roof reaches Y=18.5 mm.
    const s=new T.Shape();
    s.moveTo(0,h);s.lineTo(0,1.35);
    s.absarc(.15,1.35,.15,Math.PI,Math.PI*2,false);
    s.absarc(.8,1.35,.5,Math.PI,0,true);
    s.lineTo(1.3,.15);
    s.absarc(1.45,.15,.15,Math.PI,Math.PI*1.5,false);
    s.lineTo(1.65,0);
    s.absarc(1.65,.15,.15,Math.PI*1.5,Math.PI*2,false);
    s.lineTo(1.8,h);s.closePath();
    const geo=new T.ExtrudeGeometry(s,{depth:w,bevelEnabled:false,steps:1,curveSegments:20});
    geo.translate(-.9,-h/2,-w/2);geo.rotateY(Math.PI/2);
    if(edge==='top'){
      geo.scale(1,-1,1);
      const p=geo.attributes.position;
      for(let i=0;i<p.count;i+=3)for(let k=0;k<3;k++){
        const a=p.array[(i+1)*3+k];p.array[(i+1)*3+k]=p.array[(i+2)*3+k];p.array[(i+2)*3+k]=a;
      }
      p.needsUpdate=true;
    }
    geo.computeVertexNormals();
    // ExtrudeGeometry can emit zero-area triangles at coincident line/arc
    // junction vertices. Remove only those triangles, retaining every value
    // (position, normal and UV) of every nondegenerate triangle unchanged.
    const originalPosition=geo.attributes.position,keep=[];
    let removedZeroAreaTriangles=0;
    for(let i=0;i<originalPosition.count;i+=3){
      const ax=originalPosition.getX(i),ay=originalPosition.getY(i),az=originalPosition.getZ(i);
      const ux=originalPosition.getX(i+1)-ax,uy=originalPosition.getY(i+1)-ay,uz=originalPosition.getZ(i+1)-az;
      const vx=originalPosition.getX(i+2)-ax,vy=originalPosition.getY(i+2)-ay,vz=originalPosition.getZ(i+2)-az;
      const cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx;
      if(cx*cx+cy*cy+cz*cz<=4e-20){removedZeroAreaTriangles++;continue;}
      keep.push(i,i+1,i+2);
    }
    if(removedZeroAreaTriangles){
      for(const [name,attribute] of Object.entries(geo.attributes)){
        const values=new attribute.array.constructor(keep.length*attribute.itemSize);
        for(let i=0;i<keep.length;i++)for(let k=0;k<attribute.itemSize;k++)values[i*attribute.itemSize+k]=attribute.array[keep[i]*attribute.itemSize+k];
        geo.setAttribute(name,new T.BufferAttribute(values,attribute.itemSize,attribute.normalized));
      }
      geo.clearGroups();
    }
    const pos=geo.attributes.position,normal=geo.attributes.normal,region=new Float32Array(pos.count),roles=[];
    const eps=1e-4;
    for(let i=0;i<pos.count;i+=3){
      let x=0,y=0,z=0,nx=0;
      for(let j=0;j<3;j++){x+=pos.getX(i+j)/3;y+=pos.getY(i+j)/3;z+=pos.getZ(i+j)/3;nx+=normal.getX(i+j)/3;}
      const sx=.9-z,sy=edge==='bottom'?y+h/2:h/2-y;
      let role='outer',inside=false;
      if(Math.abs(nx)>.99)role='endgrain';
      else if(Math.abs(sx)<eps)role='front-flat';
      else if(Math.abs(sx-1.8)<eps)role='rear-flat';
      else if(Math.abs(sy-h)<eps)role='uncut-edge';
      else if((sx>=.3-eps&&sx<=1.3+eps&&sy>=1.35-eps)||(Math.abs(sx-1.3)<eps&&sy>=.15-eps&&sy<=1.35+eps)||(sx>.15&&sx<.3+eps&&sy>=1.2-eps&&sy<=1.35+eps)) {role='grip-inner';inside=true;}
      else if(sx<.3+eps)role='front-mouth';
      else role='rear-lip';
      for(let j=0;j<3;j++)region[i+j]=inside?1:0;
      roles.push(role);
    }
    geo.setAttribute('gripRegion',new T.Float32BufferAttribute(region,1));
    geo.userData=geo.userData||{};
    geo.userData.gripProfile={source:SOURCE,sectionUnits:'cm',isGenericChamfer:false,widthCm:w,heightCm:h,thicknessCm:1.8,edge,
      gripCutHeightCm:1.85,frontFlatHeightCm:h-1.35,frontLipLowPointFromEdgeCm:1.2,frontFlatEndFromEdgeCm:1.35,
      frontLipCm:.3,cavityWidthCm:1,rearLipCm:.5,cavityRoofRadiusCm:.5,mouthRadiusCm:.15,rearLipRadiusCm:.15,
      front:'+Z; source section x=0 thin lip',rear:'-Z; source section x=18mm full-height lip',
      materialGroups:{0:'exterior wood',1:'end grain',2:'real inner cavity only'},triangleRoles:roles,removedZeroAreaTriangles,
      evidence:'Cross-section reconstructed from original production detail; placement in assembly remains a separate check.'};
    applyCavityGroups(geo);
    geo.computeBoundingBox();return geo;
  }
  function applyCavityGroups(geo){
    const p=geo.attributes.position,r=geo.attributes.gripRegion,uv=geo.userData?.somassUV;
    const roles=geo.userData?.gripProfile?.triangleRoles||[];
    geo.clearGroups();let start=0,last=-1;
    for(let i=0;i<p.count;i+=3){
      const cavity=r&&r.getX(i)>.5;
      const isEnd=uv?.faces?.[i/3]?.endGrain||roles[i/3]==='endgrain';
      const m=cavity?2:isEnd?1:0;
      if(last!==m){if(last>=0)geo.addGroup(start,i-start,last);start=i;last=m;}
    }
    if(last>=0)geo.addGroup(start,p.count-start,last);return geo;
  }
  global.SomassAvilaGrip={buildGeometry,applyCavityGroups,source:SOURCE};
})(typeof window!=='undefined'?window:globalThis);

/* First isolated Avila Geniş Konsol reconstruction for visual review.
 * NOT an imported supplier mesh. Production dimensions and original product photos
 * constrain this candidate; the revised leg silhouette and U-milled pull use the original source contours.
 * Internal joinery and remaining unspecified construction are representative. Units cm; X ±99.05, Y 0..78, Z ±22.5; front +Z.
 * Requires THREE and SomassOakReview. No existing planner model is changed here.
 */
(function(global){
  'use strict';
  const DIMENSIONS={widthCm:198.1,depthCm:45,heightCm:78,legHeightCm:18,upperDrawerHeightCm:12.8,lowerDoorHeightCm:41.3,frontWidthCm:47.9,railCm:2.5};
  function create(T,options={}){
    if(!T?.Group||!global.SomassOakReview||!global.SomassAvilaGrip)throw new Error('Avila review needs THREE and SomassOakReview.');
    const oak=global.SomassOakReview, M=options.materialSet||oak.createMaterialSet(T,{mode:options.mode||'oak'}), mode=options.mode||M.mode||'oak';
    const g=new T.Group();g.name='Avila Geniş Konsol — source-constrained review candidate — revision 2';
    const parts=[];
    const W=198.1,H=78,D=45, bodyBottom=18, bodyTop=78, t=2.5;
    function roundedBox(w,h,d,r=.3,bevel=.10){
      const b=Math.max(.001,Math.min(bevel,w/5,h/5,d/5)), iw=w-2*b,ih=h-2*b,rr=Math.max(.001,Math.min(r-b,iw/2,ih/2));
      const s=new T.Shape(),x=-iw/2,y=-ih/2;
      s.moveTo(x+rr,y);s.lineTo(x+iw-rr,y);s.quadraticCurveTo(x+iw,y,x+iw,y+rr);s.lineTo(x+iw,y+ih-rr);s.quadraticCurveTo(x+iw,y+ih,x+iw-rr,y+ih);s.lineTo(x+rr,y+ih);s.quadraticCurveTo(x,y+ih,x,y+ih-rr);s.lineTo(x,y+rr);s.quadraticCurveTo(x,y,x+rr,y);
      const geo=new T.ExtrudeGeometry(s,{depth:d-2*b,bevelEnabled:true,bevelSize:b,bevelThickness:b,bevelSegments:3,steps:1,curveSegments:7});
      geo.translate(0,0,-d/2+b);geo.computeVertexNormals();return geo;
    }
    function roundedTopOrBottom(isBottom){
      // Source side elevation: true R17.5 mm at the exterior Y/Z corners;
      // source plan/front edge: R3 mm. Fillets are baked before physical UVs.
      const b=.3,ww=D-2*b,hh=t-2*b,x=-ww/2,y=-hh/2,tr=1.75-b,br=.12;
      const q=new T.Shape();q.moveTo(x+br,y);q.lineTo(x+ww-br,y);
      q.absarc(x+ww-br,y+br,br,-Math.PI/2,0,false);q.lineTo(x+ww,y+hh-tr);
      q.absarc(x+ww-tr,y+hh-tr,tr,0,Math.PI/2,false);q.lineTo(x+tr,y+hh);
      q.absarc(x+tr,y+hh-tr,tr,Math.PI/2,Math.PI,false);q.lineTo(x,y+br);
      q.absarc(x+br,y+br,br,Math.PI,Math.PI*1.5,false);
      const geo=new T.ExtrudeGeometry(q,{depth:W-2*b,bevelEnabled:true,bevelSize:b,bevelThickness:b,bevelSegments:4,steps:1,curveSegments:12});
      geo.translate(0,0,-W/2+b);geo.rotateY(Math.PI/2);if(isBottom)geo.rotateX(Math.PI);geo.computeVertexNormals();return geo;
    }
    function add(geo,name,grainAxis,position,info={}){
      oak.applyPartUV(geo,{partId:name,grainAxis,originCm:position,offsetCm:{cross:0,along:0},...info.uv});
      const mesh=new T.Mesh(geo,M.forMode?M.forMode(mode):M.modeMaterials||M.materials);
      mesh.name=name;mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;
      mesh.userData={label:name,reviewMaterial:'wood',reviewPart:{name,grainAxis,units:'cm',source:info.source||'Production drawing dimensions + original photographs; unspecified detail estimated',known:info.known||[],estimated:info.estimated||[],...info.meta}};
      g.add(mesh);parts.push(mesh.userData.reviewPart);return mesh;
    }
    function panel(name,w,h,d,x,y,z,grainAxis,info={}){
      return add(roundedBox(w,h,d,info.radius??.3,info.bevel??.1),name,grainAxis,[x,y,z],info);
    }
    // A hollow carcass, not a single solid cabinet volume. Adjacent boards butt
    // at their boundaries; no front plane is hidden behind another front plane.
    add(roundedTopOrBottom(false),'01 • Boydan boya yuvarlatılmış üst tabla','X',[0,H-t/2,0],{known:['Overall width 198.1 cm','Overall depth 45 cm','Side elevation outer R1.75 cm','Plan edge R0.3 cm'],estimated:['Lower inside edge radius'],meta:{role:'top'}});
    add(roundedTopOrBottom(true),'02 • Alt çevre çerçevesi','X',[0,bodyBottom+t/2,0],{known:['2.5 cm rail','Body starts at 18 cm','Side elevation outer R1.75 cm'],estimated:['Inner edge radius'],meta:{role:'bottom'}});
    const innerH=H-bodyBottom-2*t;
    for(const side of[-1,1]){
      const label=side<0?'left':'right';
      for(const end of[-1,1])panel(`03 • ${label} ${end<0?'rear':'front'} rounded perimeter stile`,t,innerH,t,side*(W/2-t/2),(H+bodyBottom)/2,end*(D/2-t/2),'Y',{radius:.6,bevel:.17,estimated:['2.5 cm stile section/radius'],meta:{role:'frame'}});
      // The broad side is inset within the four surrounding rails, as seen in
      // the original three-quarter photograph; it is not a flush slab side.
      panel(`04 • ${label} inset side panel`,1.6,innerH-.12,D-2*t-.12,side*(W/2-1.55),(H+bodyBottom)/2,0,'Y',{radius:.12,bevel:.05,estimated:['Side panel 1.6 cm thick, 0.75 cm surface inset'],meta:{role:'side'}});
    }
    panel('05 • recessed rear panel',W-2*t-.12,innerH-.12,1.1,0,(H+bodyBottom)/2,-D/2+.8,'X',{radius:.1,bevel:.04,estimated:['Rear panel thickness / location'],meta:{role:'back'}});
    // Four verified equal 47.9 cm fronts. 3 mm vertical seams consume exactly
    // the remainder between two 25 mm stiles: 4×47.9 + 5×.3 + 2×2.5 =198.1.
    const frontW=47.9,seam=.3,frontThick=1.8,frontZ=D/2-.22-frontThick/2;
    // Three 3 mm running gaps plus 12.8 / 41.3 cm fronts close the 55 cm opening.
    // Near-zero outer running margins are a review estimate, not joinery advice.
    const doorBottom=bodyBottom+t+.3,doorH=41.3,doorTop=doorBottom+doorH;
    const drawerH=12.8,drawerTop=H-t-.3,drawerBottom=drawerTop-drawerH;
    const gripHeight=drawerBottom-doorTop;
    for(let i=0;i<4;i++){
      const x=-W/2+t+seam+frontW/2+i*(frontW+seam);
      add(global.SomassAvilaGrip.buildGeometry(T,frontW,drawerH,frontThick,{edge:'bottom'}),`06.${i+1} • handleless upper drawer front`,'X',[x,(drawerTop+drawerBottom)/2,frontZ],{known:['47.9 cm front width','12.8 cm overall height; 11.4 cm planar front','18 mm panel; U-milled grip from original section','R5 / R1.5 mm profile'],meta:{role:'drawer',column:i+1}});
      add(global.SomassAvilaGrip.buildGeometry(T,frontW,doorH,frontThick,{edge:'top'}),`07.${i+1} • handleless lower door`,'X',[x,(doorBottom+doorTop)/2,frontZ],{known:['47.9 cm front width','41.3 cm overall height; 39.9 cm planar front','18 mm panel; mirrored U-milled grip from original section','R5 / R1.5 mm profile'],meta:{role:'door',column:i+1}});
      // Thin drawer bottom and shallow box sides, behind the original facade.
      // They stop short of the front and have no coplanar exterior surfaces.
      panel(`08.${i+1} • upper drawer bottom`,frontW-2.2,1.0,D-6,x,drawerBottom+1.8,-.5,'X',{radius:.08,bevel:.03,estimated:['Drawer interior reconstructed; not measured'],meta:{role:'interior'}});
    }
    // Continuous recessed finger-access band: genuine spatial recess, no handles.
    panel('09 • continuous recessed finger-grip rail',W-2*t-.15,gripHeight+.35,1.3,0,(doorTop+drawerBottom)/2,frontZ-3.4,'X',{radius:.1,bevel:.04,estimated:['Recess depth 3.4 cm / rail section'],meta:{role:'finger-grip',heightCm:gripHeight}});
    // Inner dividers are set well back from the door gaps. The interior layout
    // is intentionally modest because it is not fully recoverable from photos.
    for(let i=1;i<4;i++){
      const x=-W/2+t+i*(frontW+seam)+seam/2;
      panel(`10.${i} • recessed internal divider`,1.5,innerH-1,D-7,x,(H+bodyBottom)/2,-.6,'Y',{radius:.1,bevel:.03,estimated:['Internal divider position / section'],meta:{role:'interior'}});
    }
    // Four source-drawn L-shaped timber legs, with the R30 inner elbow.
    // The 25 mm extrusion is the real side depth; the foot silhouette is 35.157 mm.
    function leg(sx,sz){
      // Original front contour in cm, measured from the left body edge.
      // 24 mm is edge setback, NOT stock width. The foot is 35.157 mm wide.
      const q=new T.Shape(), ox=-W/2;
      q.moveTo(ox+2.3997,0);q.lineTo(ox+5.9154,0);
      q.lineTo(ox+8.5693,11.7984);
      q.absarc(ox+11.4691,11.0293,3,Math.PI-.2592557403,Math.PI-1.4311419975,true);
      q.lineTo(ox+11.0515,18);q.lineTo(ox+3.6514,18);q.closePath();
      const geo=new T.ExtrudeGeometry(q,{depth:2.5,bevelEnabled:false,steps:1,curveSegments:18});
      geo.translate(0,0,-1.25);
      if(sx>0){geo.scale(-1,1,1);const p=geo.attributes.position;for(let i=0;i<p.count;i+=3)for(let k=0;k<3;k++){const a=p.array[(i+1)*3+k];p.array[(i+1)*3+k]=p.array[(i+2)*3+k];p.array[(i+2)*3+k]=a;}p.needsUpdate=true;}
      geo.computeVertexNormals();
      return add(geo,`11 • ${sx<0?'Sol':'Sağ'} ${sz<0?'arka':'ön'} ahşap ayak`,'Y',[0,0,sz*18.75],{known:['18 cm leg height','35.157 mm foot width','25 mm side depth','24 mm is body-to-foot setback','R30 mm exact curved inner contour'],estimated:['Ground levelling 1 mm normalized to floor'],meta:{role:'leg',grainAlongLeg:true,footWidthCm:3.5157,bodySetbackCm:2.3997}});
    }
    for(const sx of[-1,1])for(const sz of[-1,1])leg(sx,sz);
    // Original drawing shows a central tapered support; fore/aft placement
    // is not fixed by the elevation and remains explicitly estimated.
    const central=new T.CylinderGeometry(1.7,1.1,14,4,1);central.rotateY(Math.PI/4);
    add(central,'11.5 • Orta destek ayağı','Y',[0,7,-15.5],{known:['Central supporting leg visible in production front elevation'],estimated:['3D support position NOT verified; optional drawing-only detail, hidden in photo comparison'],meta:{role:'support'}});
    // Recessed apron frame connects the leg tops, below the main body.
    panel('12 • front apron',176,4,2.5,0,16,18.75,'X',{radius:.18,bevel:.07,known:['17.6 dm span between inner leg supports','4 cm apron height from 640 mm dimension'],estimated:['Apron depth'],meta:{role:'apron'}});
    panel('13 • rear apron',176,4,2.5,0,16,-18.75,'X',{radius:.18,bevel:.07,estimated:['Rear apron section / span'],meta:{role:'apron'}});
    for(const sx of[-1,1])panel(`14 • ${sx<0?'left':'right'} side apron`,2.4,4,35, sx*93.4,16,0,'Z',{radius:.18,bevel:.07,estimated:['Side apron section / span'],meta:{role:'apron'}});
    g.userData={reviewCandidate:true,isSupplierMesh:false,product:'Avila Geniş Konsol | Natürel Meşe',units:'cm',front:'+Z',dimensions:DIMENSIONS,
      materialEvidence:oak.evidence,modelEvidence:{kind:'Reconstructed review candidate from original product photographs and recovered production drawing dimensions',isImportedSupplierMesh:false,
        verifiedProductionDimensions:DIMENSIONS,estimated:['Board sections except 25 mm rail','Bevel/roundover radii','Drawer/rear/internal construction','All procedural texture and PBR response'],
        geometryReview:'4 upper drawers + 4 lower doors; no handles; recessed continuous grip; inset side panels; rounded perimeter; rectangular tapered/splayed legs'},parts,materialSet:M};
    g.materialSet=M;
    const tr={top:'Üst tabla',bottom:'Alt çerçeve',frame:'Köşe çerçevesi',side:'Gömme yan panel',back:'Arkalık',drawer:'Üst çekmece',door:'Alt kapak',interior:'İç yapı',"finger-grip":'Kesintisiz parmak kanalı',leg:'Ahşap ayak',support:'Orta destek ayağı',apron:'Alt kuşak'};
    g.traverse(o=>{if(o.isMesh){const r=o.userData.reviewPart;let suffix=r?.column?' '+r.column:'';if(['frame','side','apron'].includes(r?.role)){if(/left|Sol/.test(o.name))suffix+=' · Sol';if(/right|Sağ/.test(o.name))suffix+=' · Sağ';if(/rear|arka/.test(o.name))suffix+=' arka';if(/front|ön/.test(o.name))suffix+=' ön';}if(r?.role==='leg')suffix=' · '+o.name.replace(/^\d+[^•]*•\s*/,'').replace(' ahşap ayak','');o.userData.label=(tr[r?.role]||o.name)+suffix;if(r){r.label=o.userData.label;r.grainSource='Original production drawing grain arrows; leg grain follows solid wood member';}}});
    return g;
  }
  function setMode(group,mode,materialSet){
    const set=materialSet||group?.userData?.materialSet;if(!set)return;
    group.traverse(o=>{if(o.isMesh&&o.userData?.reviewMaterial==='wood')o.material=set.forMode?set.forMode(mode):set.modeMaterials;});
  }
  global.SomassAvilaReview={create,setMode,dimensions:DIMENSIONS};
})(typeof window!=='undefined'?window:globalThis);

/* Approximate occlusion INSIDE the real 3 mm facade reveals, not a line on wood.
 * Backer front is 0.2 mm behind the facade so oblique views retain the reveal.
 * This approximates occlusion at the opening; existing front positions stay intact.
 */
(function(global){
  'use strict';
  function create(T){
    const group=new T.Group(),material=new T.MeshBasicMaterial({color:'#433025',toneMapped:false});
    group.name='Avila · 3 mm recessed facade reveals';
    for(const x of[-96.4,-48.2,0,48.2,96.4]){
      const mesh=new T.Mesh(new T.BoxGeometry(.3,55,.08),material);
      mesh.position.set(x,48,22.22);mesh.name='Recessed reveal shadow · 3 mm';
      mesh.userData={recessShadow:true};group.add(mesh);
    }
    group.userData.disposeMaterial=()=>material.dispose();return group;
  }
  global.SomassAvilaReveals={create};
})(typeof window!=='undefined'?window:globalThis);

/* Photo-derived Avila veneer. Original reference pixels are immutable.
 * Each crop is projectively rectified once at runtime into its own CanvasTexture. No invented
 * knots, no periodic sine grain, no geometry/position changes. Not scanned PBR.
 * UV0/UV1 remain the metric grain/checker maps; UV2/UV3 are photo material maps.
 */
(function(global){
'use strict';
const ATLAS={"tiles": [{"id": "door-1", "imageKey": "front", "quad": [[110, 1184], [539, 1184], [539, 1538], [110, 1538]], "widthCm": 47.9, "heightCm": 39.9, "visibleGrainOrientation": "horizontal", "notes": "Soldan sağa numaralandırılmıştır. Koyu ek yerleri, oyuk kanal ve dış çerçeve dışarıda bırakıldı; birkaç piksellik güvenlik payı var."}, {"id": "door-2", "imageKey": "front", "quad": [[552, 1183], [982, 1183], [982, 1538], [552, 1538]], "widthCm": 47.9, "heightCm": 39.9, "visibleGrainOrientation": "horizontal", "notes": "Soldan sağa numaralandırılmıştır. Koyu ek yerleri, oyuk kanal ve dış çerçeve dışarıda bırakıldı; birkaç piksellik güvenlik payı var."}, {"id": "door-3", "imageKey": "front", "quad": [[997, 1181], [1428, 1181], [1428, 1538], [997, 1538]], "widthCm": 47.9, "heightCm": 39.9, "visibleGrainOrientation": "horizontal", "notes": "Soldan sağa numaralandırılmıştır. Koyu ek yerleri, oyuk kanal ve dış çerçeve dışarıda bırakıldı; birkaç piksellik güvenlik payı var."}, {"id": "door-4", "imageKey": "front", "quad": [[1443, 1180], [1873, 1180], [1873, 1538], [1443, 1538]], "widthCm": 47.9, "heightCm": 39.9, "visibleGrainOrientation": "horizontal", "notes": "Soldan sağa numaralandırılmıştır. Koyu ek yerleri, oyuk kanal ve dış çerçeve dışarıda bırakıldı; birkaç piksellik güvenlik payı var."}, {"id": "drawer-1", "imageKey": "front", "quad": [[110, 1050], [539, 1050], [539, 1147], [110, 1147]], "widthCm": 47.9, "heightCm": 11.4, "visibleGrainOrientation": "horizontal", "notes": "Soldan sağa numaralandırılmıştır. Üst siyah açıklık ve alttaki parmak kanalı dahil edilmedi."}, {"id": "drawer-2", "imageKey": "front", "quad": [[552, 1050], [982, 1050], [982, 1147], [552, 1147]], "widthCm": 47.9, "heightCm": 11.4, "visibleGrainOrientation": "horizontal", "notes": "Soldan sağa numaralandırılmıştır. Üst siyah açıklık ve alttaki parmak kanalı dahil edilmedi."}, {"id": "drawer-3", "imageKey": "front", "quad": [[997, 1049], [1428, 1049], [1428, 1146], [997, 1146]], "widthCm": 47.9, "heightCm": 11.4, "visibleGrainOrientation": "horizontal", "notes": "Soldan sağa numaralandırılmıştır. Üst siyah açıklık ve alttaki parmak kanalı dahil edilmedi."}, {"id": "drawer-4", "imageKey": "front", "quad": [[1443, 1048], [1873, 1048], [1873, 1144], [1443, 1144]], "widthCm": 47.9, "heightCm": 11.4, "visibleGrainOrientation": "horizontal", "notes": "Soldan sağa numaralandırılmıştır. Üst siyah açıklık ve alttaki parmak kanalı dahil edilmedi."}, {"id": "frame-top-front", "imageKey": "front", "quad": [[110, 1024], [1880, 1023], [1880, 1036], [110, 1037]], "widthCm": 198, "heightCm": 2.5, "visibleGrainOrientation": "horizontal", "notes": "Dar temiz ön çerçeve yüzeyi; piksellerin yüksekliği düşük. Çekmece yüzeyine taşmaz. Temsilî ahşap kenar malzemesi; tam çerçeve taraması değildir."}, {"id": "frame-left-front", "imageKey": "front", "quad": [[86, 1052], [98, 1052], [98, 1535], [86, 1535]], "widthCm": 2.5, "heightCm": 55, "visibleGrainOrientation": "vertical", "notes": "Sol düşey dış çerçevenin düz orta şeridi. Yuvarlatılmış kenarlar dahil değil."}, {"id": "apron-front", "imageKey": "front", "quad": [[215, 1573], [1770, 1573], [1770, 1598], [215, 1598]], "widthCm": 176, "heightCm": 4, "visibleGrainOrientation": "horizontal", "notes": "Ayak üstündeki kuşaktan alınan merkez düz şerit. Ayak kavisleri ve gölgeli alt kenar dışarıda."}, {"id": "leg-front", "imageKey": "front", "quad": [[125, 1610], [148, 1610], [136, 1705], [120, 1705]], "widthCm": 3.0, "heightCm": 10.5, "visibleGrainOrientation": "vertical", "notes": "Sol ön ayağın açıkta kalan orta yüzü. Çok dar kaynak, gölge ve perspektif içerir. Tekil ayağın fotoğraf görünümlü örneğidir; tüm ayaklara birebir kaplama taraması diye sunulmamalı."}, {"id": "side", "imageKey": "studio", "quad": [[178, 941], [398, 1010], [398, 1512], [178, 1425]], "widthCm": 40, "heightCm": 55, "visibleGrainOrientation": "vertical", "notes": "Fotoğraf03 sol yandaki çerçeve içi düz panel. Dört köşe tam panelin İÇİNDEN seçildi; bu yüzden boyut etiketleri yaklaşık fiziksel hedef yüzeydir. Yuvarlak çerçeve, arka/ön dikme ve alt ray dışarıda. Perspektif düzeltme gerekir."}, {"id": "top", "imageKey": "studio", "quad": [[190, 879], [1514, 648], [1740, 687], [447, 938]], "widthCm": 198, "heightCm": 45, "visibleGrainOrientation": "along-long-edge", "notes": "Fotoğraf03 üst düzleminin iç dörtgeni. Obje, yazı, arka plan yok; tüm yuvarlatılmış kenarlar hariç. Uzun damar ilk iki köşe boyunca uzanır. Perspektif rektifikasyon gerekir; aydınlatma fotoğrafa gömülüdür. İç kırpım bütün tabla ölçüsüne açıldığı için doku ölçeği küçük miktarda değişebilir."}, {"id": "frame-bottom-front", "imageKey": "front", "quad": [[110, 1550], [1880, 1550], [1880, 1562], [110, 1562]], "widthCm": 198, "heightCm": 2.5, "visibleGrainOrientation": "horizontal", "notes": "Root: original photo01 bottom frame inner strip, below door crops and above apron. Rounded edges excluded; low native strip resolution disclosed."}], "sources": {"front": {"url": "https://cdn.shopify.com/s/files/1/0888/4745/0385/files/Avila-Konsol-_Genis_-_Mese.png?v=1786097875", "sha256": "ebd626879f2babadac99c0228c57135f7ad33bb73ca7c1dedb750e91f305cc9a", "widthPx": 2000, "heightPx": 2000}, "studio": {"url": "https://cdn.shopify.com/s/files/1/0888/4745/0385/files/DSC_1770_af4089c8-1794-4828-afa8-38274e0cca20.png?v=1785310079", "sha256": "11c4b3bb06733e09e8533a17de79581704637cd83e6a76657e0134e1f7a22162", "widthPx": 2000, "heightPx": 2000}}};const SOURCE_PIXELS=new WeakMap();
const evidence={kind:'photo-derived surface appearance',isManufacturerScan:false,isMeasuredPBR:false,source:'Original official SO-MASS studio photographs 01 and 03',operations:'One projective perspective rectification with bilinear pixel sampling from immutable original per tile. No generative image processing.',limitations:'Photographic lighting remains partly baked in; clearcoat, roughness and hidden faces are representative.'};
function load(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Kaplama fotoğrafı yüklenemedi.'));im.src=src;});}
function sampleCanvas(image,def){
 let source=SOURCE_PIXELS.get(image);if(!source){const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;const sc=c.getContext('2d',{willReadFrequently:true});sc.drawImage(image,0,0);source={width:c.width,height:c.height,data:sc.getImageData(0,0,c.width,c.height).data};SOURCE_PIXELS.set(image,source);}const data=source.data;
 const q=def.quad,edge=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);const w=Math.max(8,Math.round(Math.max((edge(q[0],q[1])+edge(q[3],q[2]))/2,(edge(q[0],q[3])+edge(q[1],q[2]))/2*def.widthCm/def.heightCm))),h=Math.max(8,Math.round(w*def.heightCm/def.widthCm));
 const dx1=q[1][0]-q[2][0],dx2=q[3][0]-q[2][0],dx3=q[0][0]-q[1][0]+q[2][0]-q[3][0],dy1=q[1][1]-q[2][1],dy2=q[3][1]-q[2][1],dy3=q[0][1]-q[1][1]+q[2][1]-q[3][1],den=dx1*dy2-dx2*dy1;
 const G=Math.abs(den)>1e-10?(dx3*dy2-dx2*dy3)/den:0,H=Math.abs(den)>1e-10?(dx1*dy3-dx3*dy1)/den:0,A=q[1][0]-q[0][0]+G*q[1][0],B=q[3][0]-q[0][0]+H*q[3][0],C=q[0][0],D=q[1][1]-q[0][1]+G*q[1][1],E=q[3][1]-q[0][1]+H*q[3][1],F=q[0][1];
 const out=document.createElement('canvas');out.width=w;out.height=h;const ctx=out.getContext('2d'),px=ctx.createImageData(w,h);
 for(let y=0;y<h;y++){const v=(y+.5)/h;for(let x=0;x<w;x++){const u=(x+.5)/w;
  const div=G*u+H*v+1;const sx=Math.max(0,Math.min(source.width-1.001,(A*u+B*v+C)/div)),sy=Math.max(0,Math.min(source.height-1.001,(D*u+E*v+F)/div));const ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy,oi=(y*w+x)*4;
  for(let k=0;k<3;k++){const p00=data[(iy*source.width+ix)*4+k],p10=data[(iy*source.width+ix+1)*4+k],p01=data[((iy+1)*source.width+ix)*4+k],p11=data[((iy+1)*source.width+ix+1)*4+k];px.data[oi+k]=(p00*(1-fx)+p10*fx)*(1-fy)+(p01*(1-fx)+p11*fx)*fy;}px.data[oi+3]=255;
 }}
 // Recover the low-contrast top grain lost in the photographed studio wash.
 // Work only on the derived pixels, around their own linear-light mean.
 if(def.id==='top'){
  const linear=v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);};
  const srgb=v=>{v=Math.max(0,Math.min(1,v));return 255*(v<=.0031308?12.92*v:1.055*Math.pow(v,1/2.4)-.055);};
  const mean=[0,0,0],count=w*h;
  for(let i=0;i<px.data.length;i+=4)for(let k=0;k<3;k++)mean[k]+=linear(px.data[i+k])/count;
  for(let i=0;i<px.data.length;i+=4)for(let k=0;k<3;k++)px.data[i+k]=srgb(mean[k]+1.6*(linear(px.data[i+k])-mean[k]));
 }
 ctx.putImageData(px,0,0);return out;
}
function texture(T,canvas,channel=2,repeat=false){const tx=new T.CanvasTexture(canvas);tx.colorSpace=T.SRGBColorSpace;tx.channel=channel;tx.wrapS=tx.wrapT=repeat?T.MirroredRepeatWrapping:T.ClampToEdgeWrapping;tx.anisotropy=8;tx.name='Avila reference photograph · '+canvas.width+'×'+canvas.height;return tx;}
async function create(T,{images,model}){
 const loaded={};await Promise.all(Object.entries(images).map(async([key,src])=>loaded[key]=await load(src)));
 const tiles=new Map(),materials=[],textures=[];
 for(const def of ATLAS.tiles){const im=loaded[def.imageKey];if(!im)continue;const canvas=sampleCanvas(im,def);tiles.set(def.id,{def,canvas});}
 const find=id=>tiles.get(id)||tiles.get('door-1');
 function surface(tile,channel=2,repeat=false,shade=1){const tx=texture(T,tile.canvas,channel,repeat);textures.push(tx);const isTop=tile.def.id==='top';
  // The original top photograph contains a bright studio-light wash. Remove its
  // mean colour cast in linear RGB using top/door measurements, without changing
  // the source pixels or physical grain/UV scale. PBR response remains estimated.
  const color=isTop?new T.Color().setRGB(.41065*shade,.3171*shade,.23555*shade):new T.Color().setScalar(shade);
  const m=new T.MeshPhysicalMaterial({name:'Photo-derived Avila oak · '+tile.def.id,map:tx,color,roughness:isTop?.74:.58,metalness:0,clearcoat:isTop?.03:.18,clearcoatRoughness:isTop?.7:.4,bumpScale:0});m.userData={photoDerived:true,tile:tile.def.id,evidence,...(isTop?{photoIlluminationCorrection:{linearRGB:[.41065,.3171,.23555],photoMeanRatio:[.8213,.6342,.4711],illuminationExposure:.5,grainContrast:1.6,source:'Top/door photo means plus visual lighting normalization; not a measured albedo scan'}}:{})};materials.push(m);return m;}
 const meshMaterials=new Map(),report=[];
 model.traverse(o=>{if(!o.isMesh)return;const g=o.geometry,p=g.attributes.position,n=g.attributes.normal,info=o.userData.reviewPart||{},role=info.role,col=info.column;
  let tileId=role==='drawer'?'drawer-'+col:role==='door'?'door-'+col:role==='side'?'side':role==='top'?'top':role==='leg'||role==='support'?'leg-front':role==='apron'?'apron-front':role==='frame'?'frame-left-front':'door-1';
  let tile=find(tileId),frontTile=tile;
  if(role==='top')frontTile=find('frame-top-front');else if(role==='bottom')frontTile=find('frame-bottom-front');
  const base=surface(tile,2,true,role==='interior'?.32:1),edge=base.clone(),cavity=base.clone(),front=surface(frontTile,3,false);edge.name='Veneer edge / edge band, representative';cavity.name='Recessed photographed oak';cavity.color.setScalar(.32);materials.push(edge,cavity);const top=role==='top'?surface(tile,3,false):front;const list=[base,edge,cavity,front,top];meshMaterials.set(o.uuid,list);
  g.computeBoundingBox();const box=g.boundingBox,size=new T.Vector3();box.getSize(size);const uv2=new Float32Array(p.count*2),uv3=new Float32Array(p.count*2),faces=g.userData.somassUV?.faces||[],mask=g.attributes.gripRegion;
  const axis=info.grainAxis||'X',along=axis==='X'?0:axis==='Y'?1:2;
  function coord(i,k){return k===0?p.getX(i):k===1?p.getY(i):p.getZ(i);}
  const dims=[size.x,size.y,size.z],min=[box.min.x,box.min.y,box.min.z],center=[(box.min.x+box.max.x)/2,(box.min.y+box.max.y)/2,(box.min.z+box.max.z)/2];
  let groupStart=0,last=-1;g.clearGroups();
  for(let i=0;i<p.count;i+=3){const nx=(n.getX(i)+n.getX(i+1)+n.getX(i+2))/3,ny=(n.getY(i)+n.getY(i+1)+n.getY(i+2))/3,nz=(n.getZ(i)+n.getZ(i+1)+n.getZ(i+2))/3;
   const isSide=role==='side'&&tiles.has('side')&&Math.abs(nx)>.96,isTop=role==='top'&&tiles.has('top')&&ny>.9,isFront=nz>.96&&role!=='side',isCavity=!!mask&&mask.getX(i)+mask.getX(i+1)+mask.getX(i+2)>1.5;
   let exact=(isFront&&(role==='drawer'||role==='door'||frontTile.def.id!== 'door-1'))||isSide||isTop;
   if(['interior','back'].includes(role))exact=false;
   const mi=isCavity?2:isTop?4:exact?3:faces[i/3]?.endGrain?1:0;
   if(mi!==last){if(last>=0)g.addGroup(groupStart,i-groupStart,last);groupStart=i;last=mi;}
   for(let j=0;j<3;j++){const k=i+j,x=p.getX(k),y=p.getY(k),z=p.getZ(k),a=coord(k,along)-min[along];let acrossAxis=Math.abs(ny)>.8?2:Math.abs(nz)>.8?1:0;if(acrossAxis===along)acrossAxis=(along+1)%3;let across=coord(k,acrossAxis)-center[acrossAxis];
    // Generic boards use the actual photograph's physical grain scale.
    // Photographic tile U is across its width, V is vertical in the source.
    const verticalSource=tile.def.grain==='vertical'||/^(side|leg-front|frame-left-front|frame-right-front)$/.test(tile.def.id);if(verticalSource){uv2[k*2]=(across+tile.def.widthCm*.5)/tile.def.widthCm;uv2[k*2+1]=a/tile.def.heightCm;}else{uv2[k*2]=a/tile.def.widthCm;uv2[k*2+1]=(across+tile.def.heightCm*.5)/tile.def.heightCm;}
    let u=(x-box.min.x)/Math.max(size.x,.001),v=(y-box.min.y)/Math.max(size.y,.001);
    if(role==='drawer'||role==='door'){const cut=g.userData.gripProfile?.frontFlatEndFromEdgeCm||1.35;const lo=box.min.y+(role==='drawer'?cut:0),hi=box.max.y-(role==='door'?cut:0);v=(y-lo)/(hi-lo);}
    if(isSide){u=(z-box.min.z)/size.z;v=(y-box.min.y)/size.y;}
    if(isTop){u=(x-box.min.x)/size.x;v=1-(z-box.min.z)/size.z;}
    uv3[k*2]=u;uv3[k*2+1]=v;
   }
  }if(last>=0)g.addGroup(groupStart,p.count-groupStart,last);
  g.setAttribute('uv2',new T.Float32BufferAttribute(uv2,2));g.setAttribute('uv3',new T.Float32BufferAttribute(uv3,2));g.userData.photoUV={sourceTile:tile.def.id,frontTile:frontTile.def.id,evidence,positionUnchanged:true,photoAxes:axis};
  report.push({part:o.userData.label||o.name,role,tile:tile.def.id,frontTile:frontTile.def.id,vertices:p.count,finiteUV:uv2.every(Number.isFinite)&&uv3.every(Number.isFinite)});
 });
 return {materialsFor:o=>meshMaterials.get(o.uuid),report,evidence,dispose(){for(const m of materials)m.dispose();for(const t of textures)t.dispose();},tiles:[...tiles.values()].map(t=>({id:t.def.id,pixels:[t.canvas.width,t.canvas.height],physicalCm:[t.def.widthCm,t.def.heightCm]}))};
}
global.SomassAvilaPhotoOak={create,evidence};
})(typeof window!=='undefined'?window:globalThis);

/* The reviewed natural-oak Avila is shared by the room planner and review page.
 * Plan coordinates and saved product IDs stay unchanged. No generic cabinet fallback.
 */
(function(global){
  'use strict';
  const PRODUCT_ID='CAT_10721054949649_52848848699665';
  const images={"front": "/somass-room-planner/assets/img-ebd626879f2babadac99c0228c57135f7ad33bb73ca7c1dedb750e91f305cc9a.png", "studio": "/somass-room-planner/assets/img-11c4b3bb06733e09e8533a17de79581704637cd83e6a76657e0134e1f7a22162.png"};
  function canHandle(p){return p?.id===PRODUCT_ID;}
  function createProduct(T,p,item={},onReady=()=>{}){
    const wrapper=new T.Group(),mat=global.SomassOakReview.createMaterialSet(T,{mode:'clay'});
    const model=global.SomassAvilaReview.create(T,{materialSet:mat,mode:'clay'});
    const recess=new T.MeshStandardMaterial({color:'#5f4933',roughness:.8});
    wrapper.name=p.name;wrapper.add(model);model.position.set(99.05,0,22.5);
    const reveals=global.SomassAvilaReveals.create(T);reveals.position.copy(model.position);wrapper.add(reveals);
    wrapper.scale.set(p.w/198.1,1,p.d/45);
    wrapper.userData={productId:p.id,itemKey:item.key,footprintCm:{w:p.w,d:p.d},
      modelRevision:'avila-source-r2-photo-oak',modelEvidence:{isOfficial3D:false,localBack:'z=0',
        geometry:'Same source-constrained revision 2 used in the Avila review',
        material:'Same photo-derived oak used in the Avila review; room illumination differs',
        isMeasuredPBR:false}};
    model.traverse(o=>{if(o.isMesh&&o.userData.reviewPart?.role==='support')o.visible=false;});
    let alive=true,photo=null;
    wrapper.userData.disposeProduct=()=>{alive=false;photo?.dispose();mat.dispose();recess.dispose();reveals.userData.disposeMaterial();};
    wrapper.userData.materialReady=global.SomassAvilaPhotoOak.create(T,{images,model}).then(result=>{
      if(!alive){result.dispose();return false;}
      photo=result;
      model.traverse(o=>{if(!o.isMesh)return;o.material=o.userData.reviewPart?.role==='finger-grip'?Array(5).fill(recess):photo.materialsFor(o);});
      wrapper.userData.materialStatus='ready';onReady();return true;
    }).catch(error=>{if(alive){wrapper.userData.materialStatus='error';console.error('Avila kaplama yüklemesi:',error);onReady();}return false;});
    wrapper.userData.materialStatus='loading';
    return wrapper;
  }
  global.SomassAvilaPlanner={canHandle,createProduct};
})(typeof window!=='undefined'?window:globalThis);

/* Room design finishes, separate from manufacturer furniture materials. */
(function(global){'use strict';
const floors=[{id:'oak',name:'Açık meşe',color:'#c8ac86'},{id:'walnut',name:'Koyu ahşap',color:'#79604a'},{id:'tile',name:'Açık taş',color:'#d5cec0'},{id:'concrete',name:'Beton',color:'#b8b8b0'},{id:'plain',name:'Düz renk',color:'#e3dace'}];
const walls=[['Kırık beyaz','#eeeae2'],['Kum','#d9cdbb'],['Adaçayı','#b6c0ac'],['Taş','#bbb9b0'],['Pudra','#dbc3b8'],['Gece mavisi','#596b78'],['Antrasit','#565b57'],['Beyaz','#ffffff']];
const valid=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
function normalize(a={}){a=a&&typeof a==='object'?a:{};return{wallColor:valid(a.wallColor)?a.wallColor:'#eeeae2',floorColor:valid(a.floorColor)?a.floorColor:'#c8ac86',ceilingColor:valid(a.ceilingColor)?a.ceilingColor:'#ffffff',floorType:floors.some(f=>f.id===a.floorType)?a.floorType:'oak',floorDirection:(typeof a.floorDirection==='number'||typeof a.floorDirection==='string'&&a.floorDirection.trim()!=='')&&Number(a.floorDirection)===90?90:0,accentWall:(typeof a.accentWall==='number'||typeof a.accentWall==='string'&&a.accentWall.trim()!=='')&&Number.isInteger(Number(a.accentWall))&&Number(a.accentWall)>=0&&Number(a.accentWall)<12?Number(a.accentWall):-1,accentColor:valid(a.accentColor)?a.accentColor:'#b6c0ac'};}
function floorTexture(T,a){if(!global.document)return null;const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.fillStyle='#d5d0c5';ctx.fillRect(0,0,512,512);let seed=6149;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 if(['oak','walnut'].includes(a.floorType)){for(let x=0;x<512;x+=64){ctx.fillStyle=`rgb(${205+rand()*22},${205+rand()*22},${205+rand()*22})`;ctx.fillRect(x,0,64,512);ctx.strokeStyle='#a3a097';ctx.lineWidth=.75;ctx.strokeRect(x+.5,.5,63,511);for(let k=0;k<30;k++){const xx=x+rand()*64;ctx.strokeStyle=`rgba(70,64,50,${.025+rand()*.05})`;ctx.beginPath();ctx.moveTo(xx,0);for(let y=0;y<=512;y+=32)ctx.lineTo(xx+Math.sin(y*.018+k)*1.5,y);ctx.stroke();}ctx.strokeStyle='#aaa79f';const yy=(x/64%3)*170+70;ctx.beginPath();ctx.moveTo(x,yy);ctx.lineTo(x+64,yy);ctx.stroke();}}
 else if(a.floorType==='tile'){ctx.strokeStyle='#aca99f';ctx.lineWidth=3;ctx.strokeRect(1.5,1.5,509,509);for(let i=0;i<1200;i++){ctx.fillStyle=`rgba(50,45,40,${rand()*.045})`;ctx.fillRect(rand()*512,rand()*512,rand()*7,1);}}
 else if(a.floorType==='concrete'){for(let i=0;i<11000;i++){ctx.fillStyle=`rgba(${rand()>.5?'255,255,255':'30,30,30'},${rand()*.06})`;ctx.fillRect(rand()*512,rand()*512,2,2);}}
 else return null;
 const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(1/(a.floorType==='tile'?60:240),1/(a.floorType==='tile'?60:240));texture.rotation=a.floorDirection*Math.PI/180;texture.anisotropy=8;return texture;
}
function apply(T,materials,appearance){const a=normalize(appearance);materials.wall.color.set(a.wallColor);materials.floor.color.set(a.floorColor);materials.trim.color.set(a.ceilingColor);materials.floor.map?.dispose();materials.floor.map=floorTexture(T,a);materials.floor.roughness=a.floorType==='tile'?.65:.87;materials.floor.needsUpdate=true;return a;}
function createPreview(element){let renderer,scene,camera,shell,lastDefinition,resizeObserver;const T=global.THREE;if(!T||!element)return{render(){}};try{renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(global.devicePixelRatio||1,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.setClearColor('#f3f0e9');element.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Duvar ve zemin renklerinin üç boyutlu önizlemesi');scene=new T.Scene();scene.add(new T.HemisphereLight(0xffffff,0x8a8a80,2.2));const key=new T.DirectionalLight(0xfffcf3,2.5);key.position.set(-200,600,350);scene.add(key);camera=new T.PerspectiveCamera(40,1,1,15000);}catch(_){element.textContent='Renk seçimin odada uygulanacak.';return{render(){}};}
 function render(def){lastDefinition=def;if(!global.SomassCustomRooms?.validate(def).valid){renderer.clear();return;}const r=global.SomassCustomRooms.build(def),a=normalize(def.appearance);if(shell){scene.remove(shell);shell.traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{m.map?.dispose();m.dispose();});});}shell=global.Somass3DRooms.createRoom(T,r,{});shell.traverse(o=>{if(o.userData.shellPart==='baseboard'){o.material=o.material.clone();o.material.color.set(a.ceilingColor);}if(o.userData.shellPart?.includes('wall')||['opening-spandrel','opening-lintel'].includes(o.userData.shellPart)){o.material=o.material.clone();o.material.color.set(o.userData.wallIndex===a.accentWall?a.accentColor:a.wallColor);}});const floor=shell.userData.floor;floor.material=floor.material.clone();floor.material.color.set(a.floorColor);floor.material.map=floorTexture(T,a);for(const wall of shell.userData.wallGroups||[])wall.visible=wall.userData.normal[0]<0||wall.userData.normal[2]<0;scene.add(shell);const w=element.clientWidth||420,h=element.clientHeight||300;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();const size=Math.max(r.w,r.h,r.wallHeight),dist=size*2.05/Math.min(1,w/h);camera.position.set(r.w/2+dist*.65,dist*.76,r.h/2+dist*.8);camera.lookAt(r.w/2,r.wallHeight*.2,r.h/2);renderer.render(scene,camera);}
 if(global.ResizeObserver){resizeObserver=new ResizeObserver(()=>{if(lastDefinition&&element.clientWidth&&element.clientHeight)render(lastDefinition);});resizeObserver.observe(element);}return{render,dispose(){resizeObserver?.disconnect();renderer?.dispose();}};
}
global.SomassRoomFinishes={floors,walls,normalize,apply,createPreview};if(typeof module!=='undefined')module.exports=global.SomassRoomFinishes;
})(typeof window!=='undefined'?window:globalThis);

/* User room geometry. All coordinates and dimensions are centimetres.
   x points east, y north; polygon edges run counter-clockwise. */
(function (global) {
  'use strict';
  const EPS = .01;
  const numeric = (value, fallback) => {
    if (value === undefined || value === null) return fallback;
    const n = typeof value === 'string' && !value.trim() ? NaN : Number(String(value).replace(',', '.'));
    return Number.isFinite(n) ? Math.round(n * 10) / 10 : NaN;
  };
  const text = value => String(value ?? '').trim().replace(/\s+/g, ' ');
  const format = value => Number(value).toLocaleString('tr-TR', {maximumFractionDigits: 1});
  function normalize(input = {}) {
    const source = input && typeof input === 'object' ? input : {};
    const height = numeric(source.height, 270);
    return {
      id: text(source.id || 'custom_room').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80),
      name: text(source.name ?? 'Kendi Odam'), shape: text(source.shape || 'rect').toLowerCase(),
      width: numeric(source.width, 400), depth: numeric(source.depth, 400), height,
      cutWidth: numeric(source.cutWidth, 120), cutDepth: numeric(source.cutDepth, 100),
      cutCorner: text(source.cutCorner || 'NE').toUpperCase(),
      appearance: global.SomassRoomFinishes?.normalize(source.appearance)||{wallColor:'#eeeae2',floorColor:'#c8ac86',ceilingColor:'#ffffff',floorType:'oak',floorDirection:0,accentWall:-1,accentColor:'#b6c0ac'},
      openings: Array.isArray(source.openings) ? source.openings.map((opening, index) => {
        const o = opening && typeof opening === 'object' ? opening : {}, type = text(o.type || 'door');
        return {
          id: text(o.id || ('opening_' + index)).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80),
          type, wall: numeric(o.wall, 0), offset: numeric(o.offset, 20),
          width: numeric(o.width, type === 'window' ? 120 : 90),
          height: numeric(o.height, type === 'window' ? Math.min(140, height - 85) : Math.min(210, height)),
          sill: type === 'door' ? 0 : numeric(o.sill, 85),
          hinge: text(o.hinge || 'start'), swing: text(o.swing || 'in')
        };
      }) : []
    };
  }
  function polygon(input) {
    const d = normalize(input), w = d.width, h = d.depth, cw = d.cutWidth, ch = d.cutDepth;
    if (d.shape !== 'l') return [[0, 0], [w, 0], [w, h], [0, h]];
    if (d.cutCorner === 'NW') return [[0, 0], [w, 0], [w, h], [cw, h], [cw, h - ch], [0, h - ch]];
    if (d.cutCorner === 'SE') return [[0, 0], [w - cw, 0], [w - cw, ch], [w, ch], [w, h], [0, h]];
    if (d.cutCorner === 'SW') return [[cw, 0], [w, 0], [w, h], [0, h], [0, ch], [cw, ch]];
    return [[0, 0], [w, 0], [w, h - ch], [w - cw, h - ch], [w - cw, h], [0, h]];
  }
  function walls(input) {
    const points = polygon(input);
    return points.map((a, index) => {
      const b = points[(index + 1) % points.length], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      return {index, a: a.slice(), b: b.slice(), length, label: 'Duvar ' + (index + 1) + ' · ' + format(length) + ' cm'};
    });
  }
  function validate(input) {
    const d = normalize(input), errors = [];
    const range = (n, low, high) => Number.isFinite(n) && n >= low - EPS && n <= high + EPS;
    if (!/^custom_[a-zA-Z0-9_-]+$/.test(d.id)) errors.push('Oda kimliği custom_ ile başlamalı.');
    if (!d.name || d.name.length > 50) errors.push('Oda adı 1–50 karakter olmalı.');
    if (!['rect', 'l'].includes(d.shape)) errors.push('Dikdörtgen veya L biçiminde oda seçin.');
    if (!range(d.width, 150, 2000)) errors.push('Oda eni 150–2000 cm arasında olmalı.');
    if (!range(d.depth, 150, 2000)) errors.push('Oda boyu 150–2000 cm arasında olmalı.');
    if (!range(d.height, 200, 600)) errors.push('Tavan yüksekliği 200–600 cm arasında olmalı.');
    if (d.shape === 'l') {
      if (!['NE', 'NW', 'SE', 'SW'].includes(d.cutCorner)) errors.push('Girinti köşesini seçin.');
      if (!range(d.cutWidth, 40, d.width - 100)) errors.push('Girinti eni en az 40 cm olmalı; kalan oda eni en az 100 cm olmalı.');
      if (!range(d.cutDepth, 40, d.depth - 100)) errors.push('Girinti boyu en az 40 cm olmalı; kalan oda boyu en az 100 cm olmalı.');
    }
    if (d.openings.length > 16) errors.push('Bir odaya en fazla 16 kapı veya pencere ekleyebilirsiniz.');
    const edges = walls(d), ids = new Set();
    for (let i = 0; i < d.openings.length; i++) {
      const o = d.openings[i], label = (o.type === 'window' ? 'Pencere ' : 'Kapı ') + d.openings.slice(0, i + 1).filter(q => q.type === o.type).length, edge = edges[o.wall];
      if (ids.has(o.id)) errors.push(label + ': açıklık kimliği tekrar ediyor.'); ids.add(o.id);
      if (!['door', 'window'].includes(o.type)) errors.push(label + ': kapı veya pencere türünü seçin.');
      if (!Number.isInteger(o.wall) || !edge) { errors.push(label + ': geçerli bir duvar seçin.'); continue; }
      if (!range(o.width, 30, edge.length)) errors.push(label + ': genişlik en az 30 cm olmalı ve duvarı aşmamalı.');
      if (!range(o.offset, 0, edge.length - o.width)) errors.push(label + ': konum ve genişlik birlikte duvar uzunluğunu aşıyor.');
      if (!range(o.height, 30, d.height)) errors.push(label + ': yükseklik 30 cm ile tavan yüksekliği arasında olmalı.');
      if (!range(o.sill, 0, d.height - o.height)) errors.push(label + ': denizlik ve pencere yüksekliği tavanı aşıyor.');
      if (!['start', 'end'].includes(o.hinge)) errors.push(label + ': menteşe tarafını seçin.');
      if (!['in', 'out'].includes(o.swing)) errors.push(label + ': açılma yönünü seçin.');
      for (let j = 0; j < i; j++) {
        const other = d.openings[j];
        if (other.wall === o.wall && Math.min(o.offset + o.width, other.offset + other.width) - Math.max(o.offset, other.offset) > EPS) {
          errors.push(label + ': aynı duvardaki başka bir kapı veya pencereyle çakışıyor.'); break;
        }
      }
    }
    return {valid: errors.length === 0, errors, definition: d};
  }
  function build(input) {
    const check = validate(input); if (!check.valid) throw new Error(check.errors.join('\n'));
    const d = check.definition, poly = polygon(d), edgeList = walls(d), doors = [], windows = [], thickness = 9;
    const pointOn = (edge, offset) => [edge.a[0] + (edge.b[0] - edge.a[0]) * offset / edge.length, edge.a[1] + (edge.b[1] - edge.a[1]) * offset / edge.length];
    const path = points => 'M' + points.map(p => p.map(n => Math.round(n * 1000) / 1000).join(' ')).join('L');
    const wallParts = [], openingParts = [];
    for (const edge of edgeList) {
      const u = [(edge.b[0] - edge.a[0]) / edge.length, (edge.b[1] - edge.a[1]) / edge.length], inward = [-u[1], u[0]], outward = [u[1], -u[0]];
      const cuts = d.openings.filter(o => o.wall === edge.index).sort((a, b) => a.offset - b.offset);
      let cursor = 0;
      const solid = (start, end) => {
        if (end - start < EPS) return;
        const a = pointOn(edge, start), b = pointOn(edge, end), outer = p => [p[0] + outward[0] * thickness, p[1] + outward[1] * thickness];
        wallParts.push('<path d="' + path([a, b, outer(b), outer(a)]) + 'Z" fill="#f3f1eb"/>');
      };
      for (const o of cuts) {
        solid(cursor, o.offset); cursor = o.offset + o.width;
        const a = pointOn(edge, o.offset), b = pointOn(edge, cursor), side = Math.abs(outward[0]) > .5 ? (outward[0] > 0 ? 'east' : 'west') : (outward[1] > 0 ? 'north' : 'south');
        if (o.type === 'window') {
          windows.push({id: o.id, kind: 'window', wall: edge.index, side, width_cm: o.width, heightCm: o.height, sillCm: o.sill, segmentLocal: [a, b]});
          for (const off of [1, thickness / 2, thickness - 1]) openingParts.push('<path d="' + path([a, b].map(p => [p[0] + outward[0] * off, p[1] + outward[1] * off])) + '"/>');
          openingParts.push('<path d="' + path([a, [a[0] + outward[0] * thickness, a[1] + outward[1] * thickness]]) + '"/><path d="' + path([b, [b[0] + outward[0] * thickness, b[1] + outward[1] * thickness]]) + '"/>');
        } else {
          const hinge = o.hinge === 'end' ? b : a, closed = o.hinge === 'end' ? a : b, turn = o.swing === 'out' ? -1 : 1;
          const open = [hinge[0] + inward[0] * o.width * turn, hinge[1] + inward[1] * o.width * turn];
          doors.push({id: o.id, kind: 'entry', wall: edge.index, side, width_cm: o.width, heightCm: o.height, sillCm: 0, hinge: o.hinge, swing: o.swing,
            openingLocal: [a, b], hingeLocal: hinge, leafClosedEndLocal: closed, leafOpenEndLocal: open});
          let angle = Math.atan2(closed[1] - hinge[1], closed[0] - hinge[0]), delta = Math.atan2(open[1] - hinge[1], open[0] - hinge[0]) - angle;
          while (delta > Math.PI) delta -= Math.PI * 2; while (delta < -Math.PI) delta += Math.PI * 2;
          const arc = Array.from({length: 25}, (_, i) => [hinge[0] + Math.cos(angle + delta * i / 24) * o.width, hinge[1] + Math.sin(angle + delta * i / 24) * o.width]);
          openingParts.push('<path d="' + path([hinge, open]) + '" stroke-width="1.4"/><path d="' + path(arc) + '" stroke-width=".65"/>');
        }
      }
      solid(cursor, edge.length);
    }
    const floor = '<path d="' + path(poly) + 'Z" fill="#f7f6f1" stroke="none"/>';
    const arch = '<g transform="translate(0 ' + d.depth + ') scale(1 -1)" fill="none" stroke="var(--sp-ink, #494c43)" stroke-width=".8" stroke-linejoin="round">' + floor + wallParts.join('') + openingParts.join('') + '</g>';
    const area = (d.width * d.depth - (d.shape === 'l' ? d.cutWidth * d.cutDepth : 0)) / 10000;
    return {id: d.id, name: d.name, custom: true, definition: d, appearance:d.appearance, w: d.width, h: d.depth, wallHeight: d.height, poly, arch,
      area: format(area) + ' m²', sizeLabel: format(d.width) + ' × ' + format(d.depth) + ' cm' + (d.shape === 'l' ? ' · Girinti ' + format(d.cutWidth) + ' × ' + format(d.cutDepth) + ' cm' : ''),
      doors, windows, minimumNightGap: 5};
  }
  const api = {normalize, polygon, walls, validate, build};
  global.SomassCustomRooms = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* Room shell in centimetres. Plan (x,y) maps to scene (x,verticalY,room.h-y).
   Heights are visual assumptions, not heights measured from the source DWG. */
(function (global) {
  'use strict';
  function createRoom(THREE, room, context = {}) {
    const group = new THREE.Group();
    group.name = 'room-shell-' + room.id;
    const poly = room.poly, roomH = room.h, H = room.wallHeight ?? context.wallHeight ?? 270;
    const T = context.wallThickness || 9, sill = context.windowSill ?? 85;
    const windowHeight = context.windowHeight || 140, doorHeight = context.doorHeight || 210;
    const supplied = context.materials || {};
    const material = (name, options) => supplied[name] || context[name + 'Material'] || new THREE.MeshStandardMaterial(options);
    const mats = {
      wall: material('wall', {color: 0xe6e1d8, roughness: .92}),
      floor: material('floor', {color: 0xbdb4a6, roughness: .88, side: THREE.DoubleSide}),
      trim: material('trim', {color: 0xe9e4db, roughness: .8}),
      door: material('door', {color: 0xb9a58c, roughness: .74}),
      frame: material('frame', {color: 0xaaa59b, roughness: .65}),
      metal: material('metal', {color: 0x777870, roughness: .38, metalness: .55}),
      glass: supplied.glass || context.glassMaterial || new THREE.MeshStandardMaterial({color: 0xc7dfe1, transparent: true, opacity: .19, roughness: .18, depthWrite: false, side: THREE.DoubleSide})
    };
    const appearance=global.SomassRoomFinishes?.normalize(room.appearance),accent=appearance&&appearance.accentWall>=0?mats.wall.clone():null;if(accent)accent.color.set(appearance.accentColor);
    let signedArea = 0;
    for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; signedArea += a[0] * b[1] - b[0] * a[1]; }
    const sign = signedArea >= 0 ? 1 : -1;
    const walls = [], wallGroups = [], openings = [];
    const segments = poly.map((a, i) => {
      const b = poly[(i + 1) % poly.length], dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
      const u = [dx / length, dy / length], out = [u[1] * sign, -u[0] * sign];
      return {index: i, a, b, length, u, out, normal: [out[0], 0, -out[1]], angle: Math.atan2(dy, dx), cuts: []};
    });
    const sideOf = s => Math.abs(s.out[0]) > Math.abs(s.out[1]) ? (s.out[0] > 0 ? 'E' : 'W') : (s.out[1] > 0 ? 'N' : 'S');
    function wallTag(mesh, s, kind) {
      mesh.userData = {...mesh.userData, wall: true, normal: s.normal.slice(), normalPlan: s.out.slice(), side: sideOf(s), wallIndex: s.index, shellPart: kind};
      mesh.castShadow = kind !== 'glass'; mesh.receiveShadow = true;
      walls.push(mesh); return mesh;
    }
    function boxAlong(s, start, end, bottom, height, depth, outward, mat, kind) {
      if (end - start < .01 || height < .01) return null;
      const mesh = wallTag(new THREE.Mesh(new THREE.BoxGeometry(end - start, height, depth), accent&&s.index===appearance.accentWall&&mat===mats.wall?accent:mat), s, kind);
      const mid = (start + end) / 2;
      mesh.position.set(s.a[0] + s.u[0] * mid + s.out[0] * outward, bottom + height / 2, roomH - s.a[1] - s.u[1] * mid - s.out[1] * outward);
      mesh.rotation.y = s.angle;
      s.group.add(mesh); return mesh;
    }
    // Project door symbols drawn 10–12.5cm beyond the net enclosure back to
    // the nearest parallel perimeter edge; preserve the actual hinge/open leaf.
    function project(segment) {
      if (!segment?.[0] || !segment?.[1]) return null;
      const [a, b] = segment, dl = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (dl < .01) return null;
      const u = [(b[0] - a[0]) / dl, (b[1] - a[1]) / dl], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      let best = null;
      for (const s of segments) {
        if (Math.abs(u[0] * s.u[1] - u[1] * s.u[0]) > .001) continue;
        const t = (mid[0] - s.a[0]) * s.u[0] + (mid[1] - s.a[1]) * s.u[1];
        if (t < -.05 || t > s.length + .05) continue;
        const target = [s.a[0] + s.u[0] * t, s.a[1] + s.u[1] * t], delta = [target[0] - mid[0], target[1] - mid[1]], distance = Math.hypot(...delta);
        if (distance > 25 || best && distance >= best.distance) continue;
        const projected = segment.map(p => [p[0] + delta[0], p[1] + delta[1]]);
        const ts = projected.map(p => (p[0] - s.a[0]) * s.u[0] + (p[1] - s.a[1]) * s.u[1]).sort((x, y) => x - y);
        best = {s, delta, distance, start: Math.max(0, ts[0]), end: Math.min(s.length, ts[1]), projected};
      }
      return best;
    }
    for (const window of room.windows || []) {
      const p = project(window.segmentLocal); if (!p) continue;
      const bottom = window.sillCm ?? sill, height = window.heightCm ?? windowHeight;
      const cut = {...p, kind: 'window', bottom, top: Math.min(H, bottom + height), source: window};
      p.s.cuts.push(cut); openings.push(cut);
    }
    for (const door of room.doors || []) {
      const p = project(door.openingLocal); if (!p) continue;
      const cut = {...p, kind: 'door', bottom: 0, top: Math.min(H, door.heightCm ?? doorHeight), source: door};
      p.s.cuts.push(cut); openings.push(cut);
    }
    const shape = new THREE.Shape();
    poly.forEach((p, i) => i ? shape.lineTo(p[0], p[1]) : shape.moveTo(p[0], p[1])); shape.closePath();
    const floorGeometry = new THREE.ShapeGeometry(shape); floorGeometry.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(floorGeometry, mats.floor); floor.position.z = roomH; floor.position.y = -.04;
    floor.name = 'net-room-floor'; floor.receiveShadow = true; group.add(floor);
    const ceilingGeometry=floorGeometry.clone();const ci=ceilingGeometry.index;if(ci)for(let i=0;i<ci.count;i+=3){const t=ci.array[i+1];ci.array[i+1]=ci.array[i+2];ci.array[i+2]=t;}ceilingGeometry.computeVertexNormals();const ceilingMaterial=new THREE.MeshStandardMaterial({color:appearance?.ceilingColor||'#ffffff',roughness:.95});const ceiling=new THREE.Mesh(ceilingGeometry,ceilingMaterial);ceiling.name='room-ceiling-interior';ceiling.position.set(0,H,roomH);group.add(ceiling);
    for (const s of segments) {
      s.group = new THREE.Group(); s.group.name = 'wall-' + s.index;
      s.group.userData = {wall: true, normal: s.normal.slice(), normalPlan: s.out.slice(), side: sideOf(s), wallIndex: s.index};
      wallGroups.push(s.group); group.add(s.group);
      const breaks = [...new Set([0, s.length, ...s.cuts.flatMap(c => [c.start, c.end])])].sort((a, b) => a - b);
      for (let i = 1; i < breaks.length; i++) {
        const a = breaks[i - 1], b = breaks[i], mid = (a + b) / 2;
        const cuts = s.cuts.filter(c => mid >= c.start - .01 && mid <= c.end + .01);
        if (!cuts.length) {
          boxAlong(s, a, b, 0, H, T, T / 2, mats.wall, 'solid-wall');
          boxAlong(s, a, b, 0, 7, 1.1, -.55, mats.trim, 'baseboard');
        } else {
          // Union all vertically open spans, then build only their complement.
          const spans = cuts.map(c => [c.bottom, c.top]).sort((x, y) => x[0] - y[0]); let cursor = 0;
          for (const [lo, hi] of spans) { if (lo > cursor) boxAlong(s, a, b, cursor, lo - cursor, T, T / 2, mats.wall, 'opening-spandrel'); cursor = Math.max(cursor, hi); }
          if (cursor < H) boxAlong(s, a, b, cursor, H - cursor, T, T / 2, mats.wall, 'opening-lintel');
        }
      }
      for (const c of s.cuts) {
        const frameWidth = c.kind === 'door' ? 2.4 : 2.8, frameDepth = T + .8;
        boxAlong(s, c.start, c.start + frameWidth, c.bottom, c.top - c.bottom, frameDepth, T / 2, mats.frame, 'opening-jamb');
        boxAlong(s, c.end - frameWidth, c.end, c.bottom, c.top - c.bottom, frameDepth, T / 2, mats.frame, 'opening-jamb');
        boxAlong(s, c.start, c.end, c.top - frameWidth, frameWidth, frameDepth, T / 2, mats.frame, 'opening-head');
        if (c.kind === 'window') {
          boxAlong(s, c.start, c.end, c.bottom, frameWidth, frameDepth, T / 2, mats.frame, 'window-sill');
          boxAlong(s, c.start + frameWidth, c.end - frameWidth, c.bottom + frameWidth, c.top - c.bottom - 2 * frameWidth, .55, T / 2, mats.glass, 'glass');
          if (c.end - c.start > 120) { const m = (c.start + c.end) / 2; boxAlong(s, m - .8, m + .8, c.bottom, c.top - c.bottom, 3, T / 2, mats.frame, 'window-mullion'); }
        } else {
          const d = c.source, shift = p => p && [p[0] + c.delta[0], p[1] + c.delta[1]];
          const hinge = shift(d.hingeLocal) || c.projected[0], end = shift(d.leafOpenEndLocal) || c.projected[1];
          const dx = end[0] - hinge[0], dy = end[1] - hinge[1], length = Math.hypot(dx, dy);
          if (length > 1) {
            const leaf = wallTag(new THREE.Mesh(new THREE.BoxGeometry(length, c.top - 1, 3.2), mats.door), s, 'door-leaf');
            leaf.position.set((hinge[0] + end[0]) / 2, c.top / 2, roomH - (hinge[1] + end[1]) / 2); leaf.rotation.y = Math.atan2(dy, dx); s.group.add(leaf);
            const knob = wallTag(new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), mats.metal), s, 'door-handle');
            knob.position.set(hinge[0] + dx * .89, Math.min(100, c.top * .48), roomH - hinge[1] - dy * .89); s.group.add(knob);
          }
        }
      }
    }
    group.userData.walls = walls;
    group.userData.wallGroups = wallGroups;
    group.userData.floor = floor;
    group.userData.openings = openings.map(c => ({kind: c.kind, sourceKind: c.source.kind, wallIndex: c.s.index, start: c.start, end: c.end, width: c.end - c.start, bottom: c.bottom, top: c.top}));
    group.userData.assumptions = {units: 'cm', wallHeight: H, wallThickness: T, windowSill: sill, windowHeight, doorHeight, heightsVerified: room.custom === true, heightSource: room.custom ? 'user' : 'visual-assumption'};
    group.userData.disposeProduct=()=>{accent?.dispose();ceilingMaterial.dispose();};
    return group;
  }
  global.Somass3DRooms = {createRoom};
})(typeof window !== 'undefined' ? window : globalThis);

/* Three.js room view. Plan coordinates remain the single source of truth. */
(function (global) {
  'use strict';
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  global.Somass3DViewer = {create};
  function create(options) {
    const T=global.THREE, host=options.element, root=options.root, D=options.data, G=options.geometry;
    let active=true, failed=false, room=null, roomGroup=null, productGroups=new Map(), selected=null;
    let renderRequest=0, interaction=null, moving=false, wallMode='auto', disposed=false, lastShellSignature=null,lastGeometrySignature=null;
    const scene=new T.Scene(); scene.background=new T.Color('#f2f0eb');
    const camera=new T.PerspectiveCamera(41,1,1,6500), target=new T.Vector3();
    const orbit={theta:-.66,elevation:.85,radius:850};
    let renderer;
    try {
      renderer=new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
      renderer.setPixelRatio(Math.min(global.devicePixelRatio||1,2));
      renderer.outputColorSpace=T.SRGBColorSpace;
      renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=1.0;
      renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFSoftShadowMap;
      host.appendChild(renderer.domElement);
      renderer.domElement.setAttribute('aria-label','Döndürülebilen ve ürün taşınabilen üç boyutlu oda');
      renderer.domElement.setAttribute('role','img'); renderer.domElement.tabIndex=0;
    } catch(error) {
      failed=true;host.innerHTML='<div class="sp3-error">Bu tarayıcıda 3D görünüm açılamadı. Üstteki 2D Plan düğmesiyle yerleşimi açabilirsiniz.</div>';
      return {sync(){},setActive(){},isAvailable:()=>false};
    }
    const canvas=renderer.domElement;
    let materialEnvironment=null;
    try{materialEnvironment=global.SomassStudioEnvironment.attach(T,renderer,scene);}catch(error){console.warn("SO-MASS studio reflection unavailable",error);}
    scene.add(new T.HemisphereLight(0xfffcf5,0x8b8e83,.9));
    const sun=new T.DirectionalLight(0xfffcf4,2.6);sun.position.set(-300,800,450);sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.00015;sun.shadow.normalBias=.35;sun.shadow.radius=3.2;
    sun.shadow.camera.near=10;sun.shadow.camera.far=2400;scene.add(sun);scene.add(sun.target);
    const fill=new T.DirectionalLight(0xf1f5ff,.4);fill.position.set(550,450,-450);scene.add(fill);
    const materials={floor:new T.MeshStandardMaterial({color:0xd8d2c5,roughness:.9,side:T.DoubleSide}),
      wall:new T.MeshStandardMaterial({color:0xe7e3da,roughness:.95}),
      trim:new T.MeshStandardMaterial({color:0xe6e1d7,roughness:.8}),
      frame:new T.MeshStandardMaterial({color:0xa4a39a,roughness:.72}),
      door:new T.MeshStandardMaterial({color:0xd0c0a8,roughness:.8})};
    const context={materials,cache:{},renderer};
    const selection=new T.Group();scene.add(selection);
    const selectMat=new T.LineBasicMaterial({color:0x365f4b,depthTest:false,transparent:true,opacity:.95});
    const raycaster=new T.Raycaster(), pointer=new T.Vector2(), ground=new T.Plane(new T.Vector3(0,1,0),0);
    const title=root.querySelector('#sp3-selection'),status=root.querySelector('#sp3-status');
    const toolbar=root.querySelector('#sp3-tools');
    function askRender(){if(active&&!renderRequest&&!disposed)renderRequest=requestAnimationFrame(render);}
    function updateCamera(){
      const c=Math.cos(orbit.elevation)*orbit.radius;
      camera.position.set(target.x+Math.sin(orbit.theta)*c,target.y+Math.sin(orbit.elevation)*orbit.radius,target.z+Math.cos(orbit.theta)*c);
      camera.lookAt(target);camera.updateMatrixWorld();
      if(roomGroup){
        for(const w of roomGroup.userData.wallGroups||[]){
          const n=w.userData.normal, dot=n[0]*(camera.position.x-room.w/2)+n[2]*(camera.position.z-room.h/2);
          w.visible=wallMode==='all'||(wallMode==='auto'&&dot<0);
        }
      }
    }
    function render(){renderRequest=0;if(!active||disposed)return;resize(false);updateCamera();renderer.render(scene,camera);}
    function resize(draw=true){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
      const size=renderer.getSize(new T.Vector2());if(size.x!==w||size.y!==h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(draw)askRender();}}
    new ResizeObserver(()=>resize()).observe(host);
    function fit(preset='room'){
      if(!room)return;target.set(room.w/2,room.custom?(room.wallHeight||270)*.28:75,room.h/2);
      const verticalSpan=room.custom?(room.wallHeight||270)*.7:190;
      orbit.radius=Math.sqrt(room.w*room.w+room.h*room.h+verticalSpan*verticalSpan)/2/Math.sin(camera.fov*Math.PI/360)*1.06/Math.min(1,(host.clientWidth||700)/(host.clientHeight||600));
      const wardrobes=options.getState().items.filter(i=>D.products[i.p].cat==='wardrobe');
      orbit.theta=wardrobes.some(i=>i.head==='W')?.66:-.66;orbit.elevation=preset==='top'?1.565:.85;
      if(preset==='front'){orbit.theta=0;orbit.elevation=.43;orbit.radius*=.9;target.y=70;}
      askRender();
    }
    function clean(group){group.userData.disposeProduct?.();group.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
    function placement(group,it){const p=D.products[it.p],r=room;
      if(it.head==='N'){group.position.set(it.x,0,r.h-it.y-p.d);group.rotation.y=0;}
      else if(it.head==='S'){group.position.set(it.x+p.w,0,r.h-it.y);group.rotation.y=Math.PI;}
      else if(it.head==='E'){group.position.set(it.x+p.d,0,r.h-it.y-p.w);group.rotation.y=-Math.PI/2;}
      else {group.position.set(it.x,0,r.h-it.y);group.rotation.y=Math.PI/2;}
      group.userData.item={...it};
    }
    function rebuildShell(r){
      global.SomassRoomFinishes?.apply(T,materials,r.appearance);
      if(roomGroup){scene.remove(roomGroup);clean(roomGroup);}
      roomGroup=global.Somass3DRooms.createRoom(T,r,context);scene.add(roomGroup);
      // A thin bevel-free plinth makes the net outline readable in dollhouse view.
      sun.target.position.set(r.w/2,0,r.h/2);sun.position.set(r.w/2-350,850,r.h/2+500);
      const span=Math.max(r.w,r.h)+160;
      camera.far=r.custom?Math.max(6500,Math.hypot(r.w,r.h)*7+(r.wallHeight||270)):6500;camera.updateProjectionMatrix();
      sun.shadow.camera.far=r.custom?Math.max(2400,Math.hypot(r.w,r.h)+1500):2400;
      Object.assign(sun.shadow.camera,{left:-span/2,right:span/2,top:span/2,bottom:-span/2});sun.shadow.camera.updateProjectionMatrix();
      sun.shadow.needsUpdate=true;
    }
    function sync(r,list,key){
      if(failed)return;
      const signature=JSON.stringify([r.id,r.w,r.h,r.poly,r.wallHeight,r.doors,r.windows,r.appearance]);
      const geometrySignature=JSON.stringify([r.id,r.w,r.h,r.poly,r.wallHeight,r.doors,r.windows]),geometryChanged=geometrySignature!==lastGeometrySignature,shellChanged=signature!==lastShellSignature;
      room=r;lastShellSignature=signature;lastGeometrySignature=geometrySignature;
      if(shellChanged)rebuildShell(r);
      if(geometryChanged)fit();
      const keys=new Set(list.map(it=>it.key));
      for(const [k,group] of productGroups)if(!keys.has(k)){scene.remove(group);clean(group);productGroups.delete(k);}
      for(const it of list){let group=productGroups.get(it.key);
        const presentationSignature=JSON.stringify([it.p,it.beddingStyle||'linen-white',global.SomassWatkinsDrawerUI?.canHandle(D.products[it.p])?(it.drawerConfiguration||'none'):null]);
        if(!group||group.userData.pid!==it.p||group.userData.presentationSignature!==presentationSignature){
          if(group){scene.remove(group);clean(group);}
          const product=D.products[it.p];
          if(global.SomassNoahHistoricalComponentAssembly?.canHandle(product)){group=global.SomassNoahHistoricalComponentAssembly.createProduct(T,product,it,{...context,onReady:askRender});}else if(global.SomassDiamond192SourceAssembly?.canHandle(product)){group=global.SomassDiamond192SourceAssembly.createProduct(T,product,it,{...context,onReady:askRender});}else if(global.SomassHenlowSourcePartsAssembly?.canHandle(product)){group=global.SomassHenlowSourcePartsAssembly.createProduct(T,product,it,{...context,onReady:askRender});}else if(global.SomassOriginalSceneModels?.canHandle(product)){
            group=global.SomassOriginalSceneModels.createProduct(T,product,it,{...context,...(context.nestingPresentation!==undefined?{nestDisplayPose:context.nestingPresentation}:{}),onReady:askRender});
          }else if(global.SomassWatkinsBed180Derived?.canHandle(product)){
            group=global.SomassWatkinsBed180Derived.createProduct(T,product,it,{...context,onReady:askRender});
          }else if(global.SomassWatkinsTV180Derived?.canHandle(product)){
            group=global.SomassWatkinsTV180Derived.createProduct(T,product,it,{...context,onReady:askRender});
          }else if(global.SomassLineaLargeDerived?.canHandle(product)){
            group=global.SomassLineaLargeDerived.createProduct(T,product,it,{...context,onReady:askRender});
          }else if(global.SomassOriginalWatkins?.canHandle(product)){
            group=global.SomassOriginalWatkins.createProduct(T,product,it,askRender);
          }else if(global.SomassAvilaPlanner?.canHandle(product)){
            group=global.SomassAvilaPlanner.createProduct(T,product,it,askRender);
          }else if(global.SomassPhotoSeatingModels?.canHandle(product)){group=global.SomassPhotoSeatingModels.createProduct(T,product,it,context);
          }else if(global.SomassPhotoCasegoodsModels?.canHandle(product)){group=global.SomassPhotoCasegoodsModels.createProduct(T,product,it,context);
          }else if(global.SomassPhotoTableModels?.canHandle(product)){group=global.SomassPhotoTableModels.createProduct(T,product,it,context);
          }else if(product.modelTemplate){
            group=global.Somass3DModels.createProduct(T,{...product,id:product.modelTemplate},it,context);
            const dark=/koyu|dark|ceviz|walnut|siyah|black/i.test(product.finish||''),clones=new Map();
            group.traverse(o=>{if(!o.isMesh)return;const variantMaterial=m=>{
              const wood=m.userData?.somassTimber||(m.color&&['eee0c4','fff0d6','b69b70','a58b63'].includes(m.color.getHexString()));
              const upholstered=product.upholsteryColor&&/headboard inset|rounded upholstered bench seat|upholstery edge piping/i.test(o.name);
              if((dark&&wood)||upholstered){if(!clones.has(m)){const copy=m.clone();copy.color.set(upholstered?product.upholsteryColor:/siyah|black/i.test(product.finish)?'#33332f':'#8c6544');clones.set(m,copy);}return clones.get(m);}return m;};
              o.material=Array.isArray(o.material)?o.material.map(variantMaterial):variantMaterial(o.material);
            });
            if(clones.size){const priorDispose=group.userData.disposeProduct;group.userData.disposeProduct=()=>{clones.forEach(m=>m.dispose());priorDispose?.();};}
          }else if(D.baseProductIds?.includes(it.p))group=global.Somass3DModels.createProduct(T,product,it,context);
          else group=global.Somass3DCatalogModels.createProduct(T,product,it,context);
          global.SomassProductPresentation?.decorate(T,group,product,it,context,askRender);
          global.SomassPhysicalWoodResponse.bindProduct(T,group,product,{envMapIntensity:.45});
          global.SomassBoundedUpholsteryPBRReview.bindProduct(T,group,product,{renderer:context.renderer,item:it,onReady:askRender});
          global.SomassStudioMaterialRegistry?.apply(T,group,product,{...context,onReady:askRender});
          global.SomassCatalogFinishCalibration?.bindProduct(T,group,product,{renderer:context.renderer,onReady:askRender});
          global.SomassCatalogMaterialStudio?.bindProduct(T,group,product,{onReady:askRender});
          if(group.userData.materialReady)group.userData.materialReady.then(()=>{
            group.traverse(o=>{if(o.isMesh){o.castShadow=!o.userData.recessShadow;o.receiveShadow=!o.userData.recessShadow&&!(group.userData.originalSourceGeometry===true&&String(group.userData.modelRevision||'').startsWith('MODESTO_FLOOR_MIRROR_SOURCE_REV-original-dwg-')&&o.userData.originalSourceGeometry===true&&o.userData.sourceIsClosedOrSolid===false&&['56e031d3-4750-4d97-9639-77a81bda9a11','7add4a78-a5e6-42b7-b5aa-7bcfaac8a2a5'].includes(o.userData.sourceObjectId));o.userData.itemKey=it.key;}});
            askRender();
          });
          group.userData.pid=it.p;group.userData.presentationSignature=presentationSignature;group.userData.key=it.key;group.name='product-'+it.key;
          group.traverse(o=>{if(o.isMesh){o.castShadow=!o.userData.recessShadow;o.receiveShadow=!o.userData.recessShadow&&!(group.userData.originalSourceGeometry===true&&String(group.userData.modelRevision||'').startsWith('MODESTO_FLOOR_MIRROR_SOURCE_REV-original-dwg-')&&o.userData.originalSourceGeometry===true&&o.userData.sourceIsClosedOrSolid===false&&['56e031d3-4750-4d97-9639-77a81bda9a11','7add4a78-a5e6-42b7-b5aa-7bcfaac8a2a5'].includes(o.userData.sourceObjectId));o.userData.itemKey=it.key;}});
          productGroups.set(it.key,group);scene.add(group);
        }
        placement(group,it);
      }
      selected=key;updateSelection();askRender();
    }
    function updateSelection(){
      while(selection.children.length){const child=selection.children[0];selection.remove(child);child.geometry?.dispose();}
      const group=productGroups.get(selected),it=group?.userData.item;
      const rotateButton=root.querySelector('#sp3-rotate');if(rotateButton)rotateButton.disabled=!it;
      if(!it){title.textContent='Ürünü seçerek düzenleyin';return;}
      title.textContent=D.products[it.p].name;const b=G.box(it),z=room.h-b.y-b.h;
      const points=[new T.Vector3(b.x,.8,z),new T.Vector3(b.x+b.w,.8,z),new T.Vector3(b.x+b.w,.8,z+b.h),new T.Vector3(b.x,.8,z+b.h)];
      const line=new T.LineLoop(new T.BufferGeometry().setFromPoints(points),selectMat);line.renderOrder=9;selection.add(line);
    }
    function point(e){const b=canvas.getBoundingClientRect();pointer.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);raycaster.setFromCamera(pointer,camera);}
    function hitProduct(e){point(e);const hits=raycaster.intersectObjects([...productGroups.values()],true);return hits.find(h=>h.object.visible&&h.object.userData.itemKey)?.object.userData.itemKey||null;}
    function floorPoint(e){point(e);return raycaster.ray.intersectPlane(ground,new T.Vector3());}
    const touchPoints=new Map();let pinch=null;
    const maximumZoomRadius=()=>room?.custom?Math.max(2000,Math.hypot(room.w,room.h)*6):2000;
    function setMoving(value){moving=value;root.querySelector('#sp3-orbit').setAttribute('aria-pressed',String(!moving));root.querySelector('#sp3-move').setAttribute('aria-pressed',String(moving));canvas.classList.toggle('sp3-moving',moving);status.textContent=moving?'Ürünü tutup zeminde taşıyın':'Sürükle: döndür · Tekerlek: yakınlaş · Sağ tuş: kaydır';}
    function down(e){
      if(!active||e.button>2)return;if(e.pointerType==='touch'){touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touchPoints.size===2){if(interaction?.kind==='move'&&interaction.moved)options.onMoveEnd(interaction.before,true);interaction=null;const a=[...touchPoints.values()];pinch={distance:Math.max(1,Math.hypot(a[1].x-a[0].x,a[1].y-a[0].y)),radius:orbit.radius,cx:(a[0].x+a[1].x)/2,cy:(a[0].y+a[1].y)/2,target:target.clone()};canvas.setPointerCapture(e.pointerId);e.preventDefault();return;}}if(interaction||pinch)return;e.preventDefault();canvas.focus({preventScroll:true});
      const key=hitProduct(e),p=floorPoint(e);const state=options.getState(),it=state.items.find(i=>i.key===key);
      if(key)options.onSelect(key);
      interaction={id:e.pointerId,sx:e.clientX,sy:e.clientY,x:e.clientX,y:e.clientY,theta:orbit.theta,elevation:orbit.elevation,key,
        kind:moving&&it&&p?'move':e.button===2||e.shiftKey?'pan':'orbit',moved:false,start:p,
        before:options.onMoveStart(),item:it?{...it}:null,target:target.clone()};
      canvas.setPointerCapture(e.pointerId);
    }
    function move(e){
      if(touchPoints.has(e.pointerId))touchPoints.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pinch&&touchPoints.size>=2){const a=[...touchPoints.values()],distance=Math.hypot(a[1].x-a[0].x,a[1].y-a[0].y),dx=(a[0].x+a[1].x)/2-pinch.cx,dy=(a[0].y+a[1].y)/2-pinch.cy;orbit.radius=clamp(pinch.radius*pinch.distance/Math.max(1,distance),160,maximumZoomRadius());const scale=orbit.radius*.0014;target.copy(pinch.target);target.x+=(-dx*Math.cos(orbit.theta)-dy*Math.sin(orbit.theta))*scale;target.z+=(dx*Math.sin(orbit.theta)-dy*Math.cos(orbit.theta))*scale;askRender();return;}if(!interaction||interaction.id!==e.pointerId)return;const a=interaction,dx=e.clientX-a.sx,dy=e.clientY-a.sy;
      if(!a.moved&&Math.hypot(dx,dy)<3)return;a.moved=true;
      if(a.kind==='move'){
        const p=floorPoint(e);if(!p)return;
        const x=Math.round((a.item.x+p.x-a.start.x)*10)/10,y=Math.round((a.item.y-p.z+a.start.z)*10)/10;
        options.onMovePreview(a.key,x,y);const group=productGroups.get(a.key);placement(group,{...a.item,x,y});selected=a.key;updateSelection();
      } else if(a.kind==='orbit'){
        orbit.theta=a.theta-dx*.008;orbit.elevation=clamp(a.elevation+dy*.006,.16,1.565);
      } else {
        const scale=orbit.radius*.0014;
        target.copy(a.target);target.x+=(-dx*Math.cos(orbit.theta)-dy*Math.sin(orbit.theta))*scale;
        target.z+=(dx*Math.sin(orbit.theta)-dy*Math.cos(orbit.theta))*scale;
      }
      askRender();
    }
    function finish(e,cancel=false){touchPoints.delete(e.pointerId);if(pinch){pinch=null;interaction=null;for(const id of touchPoints.keys())if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);touchPoints.clear();askRender();return;}if(!interaction||interaction.id!==e.pointerId)return;const a=interaction;interaction=null;
      if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
      if(a.kind==='move'&&a.moved)options.onMoveEnd(a.before,cancel);else if(!a.moved&&!a.key)options.onSelect(null);else if(!a.moved&&a.key)root.dispatchEvent(new CustomEvent('somass:product-selected',{detail:{key:a.key}}));
      askRender();
    }
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);
    canvas.addEventListener('pointerup',e=>finish(e));canvas.addEventListener('pointercancel',e=>finish(e,true));
    canvas.addEventListener('lostpointercapture',e=>finish(e,true));
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('wheel',e=>{if(!active)return;e.preventDefault();orbit.radius=clamp(orbit.radius*Math.exp(e.deltaY*.0012),220,maximumZoomRadius());askRender();},{passive:false});
    canvas.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&interaction){finish({pointerId:interaction.id},true);return;}
      const step=.12;
      if(e.key==='ArrowLeft')orbit.theta-=step;else if(e.key==='ArrowRight')orbit.theta+=step;
      else if(e.key==='ArrowUp')orbit.elevation=clamp(orbit.elevation+step,.16,1.565);
      else if(e.key==='ArrowDown')orbit.elevation=clamp(orbit.elevation-step,.16,1.565);
      else if(e.key==='+'||e.key==='=')orbit.radius=clamp(orbit.radius*.9,220,maximumZoomRadius());
      else if(e.key==='-')orbit.radius=clamp(orbit.radius*1.1,220,maximumZoomRadius());else return;
      e.preventDefault();askRender();
    });
    toolbar.addEventListener('click',e=>{const button=e.target.closest('button');if(!button)return;
      if(button.id==='sp3-orbit')setMoving(false);if(button.id==='sp3-move')setMoving(true);
      if(button.id==='sp3-home')fit();if(button.id==='sp3-top')fit('top');
      if(button.id==='sp3-walls'){wallMode=wallMode==='auto'?'none':wallMode==='none'?'all':'auto';button.textContent='Duvarlar: '+({auto:'otomatik',none:'gizli',all:'açık'}[wallMode]);askRender();}
    });
    setMoving(false);
    return {sync,setActive(value){active=value;host.hidden=!value;toolbar.hidden=!value;if(value){resize();askRender();}},
      fit,zoom(factor){orbit.radius=clamp(orbit.radius/factor,220,maximumZoomRadius());askRender();},isAvailable:()=>!failed,
      dispose(){disposed=true;for(const group of productGroups.values())clean(group);productGroups.clear();materialEnvironment?.dispose();renderer.dispose();}};
  }
})(typeof window!=='undefined'?window:globalThis);

/* Catalog visibility is a view; source product records and placed room items stay intact. */
(function(g){'use strict';
const manifest={"schemaVersion":1,"revision":"catalog-user-removals-20261101-v2","hiddenCatalogEntryIds":["CAT_10174342594833","CAT_11072030703889","CAT_10211920478481","CAT_10211942531345","CAT_10211944628497","CAT_10771626197265","CAT_10771672891665"],"hiddenProductIds":["CAT_10174342594833_51215647801617","CAT_10174342594833_51215647834385","CAT_11072030703889_53617786880273"],"hiddenEntryKinds":["set","bundle"],"hideBundleComponentVariants":true,"unavailableLabelTr":"Bu ürün katalogdan kaldırıldı.","scopeNotes":["Renda, Ladin, Nord glass, structural bundles and both standalone Watkins drawer accessory entries are hidden at the user request.","Only walnut entries are hidden for both Viking chair families; natural and dark oak including fabric choices remain.","Placed room items and bed drawer controls stay intact; immutable product and CAD source records remain."]};
const entryIds=new Set(manifest.hiddenCatalogEntryIds),pids=new Set(manifest.hiddenProductIds),kinds=new Set(manifest.hiddenEntryKinds);
function productIdExcluded(id){return typeof id==='string'&&(pids.has(id)||entryIds.has(id)||manifest.hiddenCatalogEntryIds.some(entry=>id.startsWith(entry+'_')));}
function entryExcluded(e){return !!e&&(entryIds.has(e.id)||kinds.has(e.kind)||(Array.isArray(e.bundleComponents)&&e.bundleComponents.length>0));}
function productExcluded(p,entries=[]){if(!p)return false;const id=typeof p==='string'?p:p.id;if(productIdExcluded(id))return true;if(typeof p!=='object')return false;if(entryIds.has(p.catalogProduct)||kinds.has(p.kind)||(Array.isArray(p.bundleComponents)&&p.bundleComponents.length>0))return true;const e=entries.find(e=>e.id===p.catalogProduct);return entryExcluded(e);}
function variantExcluded(e,v,products={}){return entryExcluded(e)||productExcluded(products[v?.pid]||v?.pid)||!!(manifest.hideBundleComponentVariants&&Array.isArray(v?.bundleComponents)&&v.bundleComponents.length);}
function filterEntries(entries,products={}){return entries.flatMap(e=>{if(entryExcluded(e))return[];const variants=[],sourceVariantIndices=[];for(const[vIndex,v]of(e.variants||[]).entries())if(!variantExcluded(e,v,products)){variants.push(v);sourceVariantIndices.push(e.sourceVariantIndices?.[vIndex]??vIndex);}return variants.length?[{...e,variants,sourceVariantIndices}]:[];});}
function filterProducts(products,entries=[]){return Object.values(products).filter(p=>!productExcluded(p,entries));}
function blockedTarget(entries,entryId,pid,products={}){
 // A valid individual PID wins over an obsolete bundle entry in an old link.
 if(pid){if(productExcluded(products[pid]||pid,entries))return true;if(products[pid])return false;}
 for(const token of[pid,entryId]){if(!token)continue;if(productIdExcluded(token))return true;const e=entries.find(e=>e.id===token);if(entryExcluded(e))return true;const parent=entries.find(e=>(e.variants||[]).some(v=>v.pid===token));if(parent&&variantExcluded(parent,parent.variants.find(v=>v.pid===token),products))return true;}
 return false;
}
g.SomassCatalogVisibility={manifest,entryExcluded,productExcluded,variantExcluded,filterEntries,filterProducts,blockedTarget,unavailableLabel:manifest.unavailableLabelTr};
})(typeof window!=='undefined'?window:globalThis);

/* Catalog grouping is a view; source entries, CAD IDs and placed items stay intact. */
(function(root){
'use strict';
const norm=s=>String(s??'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/\s+/g,' ').trim();
const sizePattern=/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?/i;
// Explicit source-entry membership: this changes the view, never the sale/CAD/scene records.
const familyConfig={"revision":"catalog-family-axes-20261103-v1","families":{"curve-shelf":{"key":"curve-shelf","name":"Curve Raf","axes":["sizeLabel"],"sourceEntryIds":["CAT_10979005137169","CAT_10479827681553","CAT_10979004055825","CAT_10479839019281","CAT_10979006152977","CAT_10978997928209","CAT_10977558298897","CAT_10979002548497","CAT_10979005694225","CAT_10505863692561","CAT_10384919920913","CAT_10505863299345","CAT_10384912089361","CAT_10505862938897","CAT_10505863069969","CAT_10505864282385","CAT_10505863201041","CAT_10505864511761"]},"cutout-console":{"key":"cutout-console","name":"Cut Out Konsol","axes":["modelLabel"],"sourceEntryIds":["CAT_10747581137169","CAT_10728860418321","CAT_10628034658577","CAT_10544524853521"]},"moby-desk":{"key":"moby-desk","name":"Moby Çalışma Masası","axes":["surfaceLabel"],"sourceEntryIds":["CAT_10483025445137","CAT_10748462465297","CAT_10483032850705"]},"modesto-dresser":{"key":"modesto-dresser","name":"Modesto Şifonyer","axes":["modelLabel"],"sourceEntryIds":["CAT_10958501871889","CAT_10232713052433","CAT_10958512816401","CAT_10228368670993"]},"moris-bench":{"key":"moris-bench","name":"Moris Bank","axes":["sizeLabel"],"sourceEntryIds":["CAT_10173749592337","CAT_10159469003025","CAT_10173750182161","CAT_10152485257489"]},"moris-dining":{"key":"moris-dining","name":"Moris Sabit Yemek Masası","axes":["sizeLabel"],"sourceEntryIds":["CAT_10173751361809","CAT_10159469461777","CAT_10173752312081","CAT_10152491614481"]},"shizen-coffee":{"key":"shizen-coffee","name":"Shizen Kahve Masası","axes":["sizeLabel"],"sourceEntryIds":["CAT_10748453585169","CAT_10747528478993","CAT_10748453257489","CAT_10747812774161"]},"viking-chair":{"key":"viking-chair","name":"Viking Sandalye","axes":["seatLabel","fabricLabel"],"sourceEntryIds":["CAT_10211942531345","CAT_10174349443345","CAT_10174349869329","CAT_10211944628497","CAT_10174350197009","CAT_10152522809617"]},"watkins-console":{"key":"watkins-console","name":"Watkins Dresuar","axes":["sizeLabel"],"sourceEntryIds":["CAT_10972335800593","CAT_10972335276305","CAT_11054695285009","CAT_11054694760721"]},"henlow-table":{"key":"henlow-table","name":"Henlow Yemek Masası","axes":["formLabel","mechanismLabel","sizeLabel"],"sourceEntryIds":["CAT_10173591716113","CAT_10135351427345","CAT_10173722722577","CAT_10152445051153","CAT_10173602890001","CAT_10152445739281","CAT_10173612622097","CAT_10135487611153"]},"diamond-table":{"key":"diamond-table","name":"Diamond Yemek Masası","axes":["formLabel","mechanismLabel","sizeLabel"],"sourceEntryIds":["CAT_11009272643857","CAT_11009271234833","CAT_10494974624017","CAT_10477433913617","CAT_11009273889041","CAT_11009273004305","CAT_11012365910289","CAT_11012349559057"]},"avila-bookcase":{"key":"avila-bookcase","name":"Avila Kitaplık","axes":["modelLabel"],"sourceEntryIds":["CAT_10591378080017","CAT_10153509421329","CAT_10591371493649","CAT_10160916988177"]},"avila-console":{"key":"avila-console","name":"Avila Konsol","axes":["modelLabel"],"sourceEntryIds":["CAT_10748441133329","CAT_10721054949649","CAT_10173543285009","CAT_10153508602129"]}},"members":{"CAT_10979005137169":{"family":"curve-shelf","expectedType":"Duvar Rafı","expectedSeries":"Curve","expectedName":"Curve Raf - 45 cm | Bordo/Mor","sizeLabel":"45 cm"},"CAT_10479827681553":{"family":"curve-shelf","expectedType":"Duvar Rafı","expectedSeries":"Curve","expectedName":"Curve Raf - 45 cm | Koyu Meşe","sizeLabel":"45 cm"},"CAT_10979004055825":{"family":"curve-shelf","expectedType":"Duvar Rafı","expectedSeries":"Curve","expectedName":"Curve Raf - 45 cm | Limon Sarı","sizeLabel":"45 cm"},"CAT_10479839019281":{"family":"curve-shelf","expectedType":"Duvar Rafı","expectedSeries":"Curve","expectedName":"Curve Raf - 45 cm | Natürel Meşe","sizeLabel":"45 cm"},"CAT_10979006152977":{"family":"curve-shelf","expectedType":"Duvar Rafı","expectedSeries":"Curve","expectedName":"Curve Raf - 45 cm | Orta Koyu Yeşil","sizeLabel":"45 cm"},"CAT_10978997928209":{"family":"curve-shelf","expectedType":"Duvar Rafı","expectedSeries":"Curve","expectedName":"Curve Raf - 45 cm | Orta Pembe/Kırmızı","sizeLabel":"45 cm"},"CAT_10977558298897":{"family":"curve-shelf","expectedType":"Duvar Rafı","expectedSeries":"Curve","expectedName":"Curve Raf - 45 cm | Soluk Yeşil","sizeLabel":"45 cm"},"CAT_10979002548497":{"family":"curve-shelf","expectedType":"Duvar Rafı","expectedSeries":"Curve","expectedName":"Curve Raf - 45 cm | Turkuaz","sizeLabel":"45 cm"},"CAT_10979005694225":{"family":"curve-shelf","expectedType":"Duvar Rafı","expectedSeries":"Curve","expectedName":"Curve Raf - 45 cm | Çimento Gri","sizeLabel":"45 cm"},"CAT_10505863692561":{"family":"curve-shelf","expectedType":"Duvar Rafı","expectedSeries":"Curve","expectedName":"Curve Raf - 75 cm | Bordo/Mor","sizeLabel":"75 cm"},"CAT_10384919920913":{"family":"curve-shelf","expectedType":"Duvar Rafı","expectedSeries":"Curve","expectedName":"Curve Raf - 75 cm | Koyu Meşe","sizeLabel":"75 cm"},"CAT_10505863299345":{"family":"curve-shelf","expectedType":"Duvar Rafı","expectedSeries":"Curve","expectedName":"Curve Raf - 75 cm | Limon Sarı","sizeLabel":"75 cm"},"CAT_10384912089361":{"family":"curve-shelf","expectedType":"Duvar Rafı","expectedSeries":"Curve","expectedName":"Curve Raf - 75 cm | Natürel Meşe","sizeLabel":"75 cm"},"CAT_10505862938897":{"family":"curve-shelf","expectedType":"Duvar Rafı","expectedSeries":"Curve","expectedName":"Curve Raf - 75 cm | Orta Koyu Yeşil","sizeLabel":"75 cm"},"CAT_10505863069969":{"family":"curve-shelf","expectedType":"Duvar Rafı","expectedSeries":"Curve","expectedName":"Curve Raf - 75 cm | Orta Pembe/Kırmızı","sizeLabel":"75 cm"},"CAT_10505864282385":{"family":"curve-shelf","expectedType":"Duvar Rafı","expectedSeries":"Curve","expectedName":"Curve Raf - 75 cm | Soluk Yeşil","sizeLabel":"75 cm"},"CAT_10505863201041":{"family":"curve-shelf","expectedType":"Duvar Rafı","expectedSeries":"Curve","expectedName":"Curve Raf - 75 cm | Turkuaz","sizeLabel":"75 cm"},"CAT_10505864511761":{"family":"curve-shelf","expectedType":"Duvar Rafı","expectedSeries":"Curve","expectedName":"Curve Raf - 75 cm | Çimento Gri","sizeLabel":"75 cm"},"CAT_10747581137169":{"family":"cutout-console","expectedType":"Konsol","expectedSeries":"Cut","expectedName":"Cut Out Geniş Konsol | Koyu Meşe","modelLabel":"Geniş · 184,8 cm"},"CAT_10728860418321":{"family":"cutout-console","expectedType":"Konsol","expectedSeries":"Cut","expectedName":"Cut Out Geniş Konsol | Natürel Meşe","modelLabel":"Geniş · 184,8 cm"},"CAT_10628034658577":{"family":"cutout-console","expectedType":"Konsol","expectedSeries":"Cut","expectedName":"Cut Out Konsol | Koyu Meşe","modelLabel":"Standart · 158 cm"},"CAT_10544524853521":{"family":"cutout-console","expectedType":"Konsol","expectedSeries":"Cut","expectedName":"Cut Out Konsol | Natürel Meşe","modelLabel":"Standart · 158 cm"},"CAT_10483025445137":{"family":"moby-desk","expectedType":"Çalışma Masası","expectedSeries":"Moby","expectedName":"Moby Çalışma Masası | Natürel Meşe","surfaceLabel":"Ahşap","finishLabel":"Natürel Meşe","finishCode":"natural_oak"},"CAT_10748462465297":{"family":"moby-desk","expectedType":"Çalışma Masası","expectedSeries":"Moby","expectedName":"Moby Çalışma Masası | Natürel Meşe | Siyah Linolyum","surfaceLabel":"Siyah linolyum","finishLabel":"Natürel Meşe","finishCode":"natural_oak"},"CAT_10483032850705":{"family":"moby-desk","expectedType":"Çalışma Masası","expectedSeries":"Moby","expectedName":"Moby Çalışma Masası | Natürel Meşe | Yeşil Linolyum","surfaceLabel":"Yeşil linolyum","finishLabel":"Natürel Meşe","finishCode":"natural_oak"},"CAT_10958501871889":{"family":"modesto-dresser","expectedType":"Şifonyer","expectedSeries":"Modesto","expectedName":"Modesto 4 Çekmeceli Şifonyer | Koyu Meşe","modelLabel":"4 çekmeceli"},"CAT_10232713052433":{"family":"modesto-dresser","expectedType":"Şifonyer","expectedSeries":"Modesto","expectedName":"Modesto 4 Çekmeceli Şifonyer | Natürel Meşe","modelLabel":"4 çekmeceli"},"CAT_10958512816401":{"family":"modesto-dresser","expectedType":"Şifonyer","expectedSeries":"Modesto","expectedName":"Modesto 5 Çekmeceli Şifonyer | Koyu Meşe","modelLabel":"5 çekmeceli"},"CAT_10228368670993":{"family":"modesto-dresser","expectedType":"Şifonyer","expectedSeries":"Modesto","expectedName":"Modesto 5 Çekmeceli Şifonyer | Natürel Meşe","modelLabel":"5 çekmeceli"},"CAT_10173749592337":{"family":"moris-bench","expectedType":"Bank","expectedSeries":"Moris","expectedName":"Moris Büyük Bank 40x150 cm | Koyu Meşe","sizeLabel":"150 cm"},"CAT_10159469003025":{"family":"moris-bench","expectedType":"Bank","expectedSeries":"Moris","expectedName":"Moris Büyük Bank 40x150 cm | Natürel Meşe","sizeLabel":"150 cm"},"CAT_10173751361809":{"family":"moris-dining","expectedType":"Yemek Masası","expectedSeries":"Moris","expectedName":"Moris Büyük Sabit Yemek Masası 90x200 cm | Koyu Meşe","sizeLabel":"200 cm"},"CAT_10159469461777":{"family":"moris-dining","expectedType":"Yemek Masası","expectedSeries":"Moris","expectedName":"Moris Büyük Sabit Yemek Masası 90x200 cm | Natürel Meşe","sizeLabel":"200 cm"},"CAT_10173750182161":{"family":"moris-bench","expectedType":"Bank","expectedSeries":"Moris","expectedName":"Moris Küçük Bank 40x110 cm | Koyu Meşe","sizeLabel":"110 cm"},"CAT_10152485257489":{"family":"moris-bench","expectedType":"Bank","expectedSeries":"Moris","expectedName":"Moris Küçük Bank 40x110 cm | Natürel Meşe","sizeLabel":"110 cm"},"CAT_10173752312081":{"family":"moris-dining","expectedType":"Yemek Masası","expectedSeries":"Moris","expectedName":"Moris Küçük Sabit Yemek Masası 90x160 cm | Koyu Meşe","sizeLabel":"160 cm"},"CAT_10152491614481":{"family":"moris-dining","expectedType":"Yemek Masası","expectedSeries":"Moris","expectedName":"Moris Küçük Sabit Yemek Masası 90x160 cm | Natürel Meşe","sizeLabel":"160 cm"},"CAT_10748453585169":{"family":"shizen-coffee","expectedType":"Orta Sehpa","expectedSeries":"Shizen","expectedName":"Shizen Büyük Kahve Masası 87x145 cm | Koyu Meşe","sizeLabel":"145 × 87 cm"},"CAT_10747528478993":{"family":"shizen-coffee","expectedType":"Orta Sehpa","expectedSeries":"Shizen","expectedName":"Shizen Büyük Kahve Masası 87x145 cm | Natürel Meşe","sizeLabel":"145 × 87 cm"},"CAT_10748453257489":{"family":"shizen-coffee","expectedType":"Orta Sehpa","expectedSeries":"Shizen","expectedName":"Shizen Küçük Kahve Masası 72x120 cm | Koyu Meşe","sizeLabel":"120 × 72 cm"},"CAT_10747812774161":{"family":"shizen-coffee","expectedType":"Orta Sehpa","expectedSeries":"Shizen","expectedName":"Shizen Küçük Kahve Masası 72x120 cm | Natürel Meşe","sizeLabel":"120 × 72 cm"},"CAT_10211942531345":{"family":"viking-chair","expectedType":"Sandalye","expectedSeries":"Viking","expectedName":"Viking Döşemeli Sandalye | Ceviz","seatLabel":"Döşemeli","fabricFromVariant":true},"CAT_10174349443345":{"family":"viking-chair","expectedType":"Sandalye","expectedSeries":"Viking","expectedName":"Viking Döşemeli Sandalye | Koyu Meşe","seatLabel":"Döşemeli","fabricFromVariant":true},"CAT_10174349869329":{"family":"viking-chair","expectedType":"Sandalye","expectedSeries":"Viking","expectedName":"Viking Döşemeli Sandalye | Natürel Meşe","seatLabel":"Döşemeli","fabricFromVariant":true},"CAT_10211944628497":{"family":"viking-chair","expectedType":"Sandalye","expectedSeries":"Viking","expectedName":"Viking İp Örgülü Sandalye | Ceviz","seatLabel":"İp örgülü","fabricFromVariant":false},"CAT_10174350197009":{"family":"viking-chair","expectedType":"Sandalye","expectedSeries":"Viking","expectedName":"Viking İp Örgülü Sandalye | Koyu Meşe","seatLabel":"İp örgülü","fabricFromVariant":false},"CAT_10152522809617":{"family":"viking-chair","expectedType":"Sandalye","expectedSeries":"Viking","expectedName":"Viking İp Örgülü Sandalye | Natürel Meşe","seatLabel":"İp örgülü","fabricFromVariant":false},"CAT_10972335800593":{"family":"watkins-console","expectedType":"Dresuar","expectedSeries":"Watkins","expectedName":"Watkins Dresuar - 120 cm | Koyu Meşe","sizeLabel":"120 cm"},"CAT_10972335276305":{"family":"watkins-console","expectedType":"Dresuar","expectedSeries":"Watkins","expectedName":"Watkins Dresuar - 120 cm | Natürel Meşe","sizeLabel":"120 cm"},"CAT_11054695285009":{"family":"watkins-console","expectedType":"Dresuar","expectedSeries":"Watkins","expectedName":"Watkins Dresuar - 90 cm | Koyu Meşe","sizeLabel":"90 cm"},"CAT_11054694760721":{"family":"watkins-console","expectedType":"Dresuar","expectedSeries":"Watkins","expectedName":"Watkins Dresuar - 90 cm | Natürel Meşe","sizeLabel":"90 cm"},"CAT_10173591716113":{"family":"henlow-table","expectedType":"Yemek Masası","expectedSeries":"Henlow","expectedName":"Henlow İlaveli Yemek Masası 180-235 cm | Koyu Meşe","formLabel":"Dikdörtgen","mechanismLabel":"İlaveli","sizeLabel":"180–235 × 85 cm"},"CAT_10135351427345":{"family":"henlow-table","expectedType":"Yemek Masası","expectedSeries":"Henlow","expectedName":"Henlow İlaveli Yemek Masası 180-235 cm | Natürel Meşe","formLabel":"Dikdörtgen","mechanismLabel":"İlaveli","sizeLabel":"180–235 × 85 cm"},"CAT_10173722722577":{"family":"henlow-table","expectedType":"Yemek Masası","expectedSeries":"Henlow","expectedName":"Henlow Oval Yemek Masası 200 cm | Koyu Meşe","formLabel":"Oval","mechanismLabel":"Sabit","sizeLabel":"200 × 120 cm"},"CAT_10152445051153":{"family":"henlow-table","expectedType":"Yemek Masası","expectedSeries":"Henlow","expectedName":"Henlow Oval Yemek Masası 200 cm | Natürel Meşe","formLabel":"Oval","mechanismLabel":"Sabit","sizeLabel":"200 × 120 cm"},"CAT_10173602890001":{"family":"henlow-table","expectedType":"Yemek Masası","expectedSeries":"Henlow","expectedName":"Henlow Sabit Dikdörtgen Yemek Masası 160 cm | Koyu Meşe","formLabel":"Dikdörtgen","mechanismLabel":"Sabit","sizeLabel":"160 × 85 cm"},"CAT_10152445739281":{"family":"henlow-table","expectedType":"Yemek Masası","expectedSeries":"Henlow","expectedName":"Henlow Sabit Dikdörtgen Yemek Masası 160 cm | Natürel Meşe","formLabel":"Dikdörtgen","mechanismLabel":"Sabit","sizeLabel":"160 × 85 cm"},"CAT_10173612622097":{"family":"henlow-table","expectedType":"Yemek Masası","expectedSeries":"Henlow","expectedName":"Henlow Sabit Kare Yemek Masası 90 cm | Koyu Meşe","formLabel":"Kare","mechanismLabel":"Sabit","sizeLabel":"90 × 90 cm"},"CAT_10135487611153":{"family":"henlow-table","expectedType":"Yemek Masası","expectedSeries":"Henlow","expectedName":"Henlow Sabit Kare Yemek Masası 90 cm | Natürel Meşe","formLabel":"Kare","mechanismLabel":"Sabit","sizeLabel":"90 × 90 cm"},"CAT_11009272643857":{"family":"diamond-table","expectedType":"Yemek Masası","expectedSeries":"Diamond","expectedName":"Diamond İlaveli Yemek Masası - 180 cm | Koyu Meşe","formLabel":"Dikdörtgen","mechanismLabel":"İlaveli","sizeLabel":"180 cm kapalı"},"CAT_11009271234833":{"family":"diamond-table","expectedType":"Yemek Masası","expectedSeries":"Diamond","expectedName":"Diamond İlaveli Yemek Masası - 180 cm | Natürel Meşe","formLabel":"Dikdörtgen","mechanismLabel":"İlaveli","sizeLabel":"180 cm kapalı"},"CAT_10494974624017":{"family":"diamond-table","expectedType":"Yemek Masası","expectedSeries":"Diamond","expectedName":"Diamond İlaveli Yemek Masası - 192 cm | Koyu Meşe","formLabel":"Dikdörtgen","mechanismLabel":"İlaveli","sizeLabel":"192 cm · kaynak açık 281 cm"},"CAT_10477433913617":{"family":"diamond-table","expectedType":"Yemek Masası","expectedSeries":"Diamond","expectedName":"Diamond İlaveli Yemek Masası - 192 cm | Natürel Meşe","formLabel":"Dikdörtgen","mechanismLabel":"İlaveli","sizeLabel":"192 cm · kaynak açık 281 cm"},"CAT_11009273889041":{"family":"diamond-table","expectedType":"Yemek Masası","expectedSeries":"Diamond","expectedName":"Diamond Sabit Yemek Masası - 180 cm | Koyu Meşe","formLabel":"Dikdörtgen","mechanismLabel":"Sabit","sizeLabel":"180 × 100 cm"},"CAT_11009273004305":{"family":"diamond-table","expectedType":"Yemek Masası","expectedSeries":"Diamond","expectedName":"Diamond Sabit Yemek Masası - 180 cm | Natürel Meşe","formLabel":"Dikdörtgen","mechanismLabel":"Sabit","sizeLabel":"180 × 100 cm"},"CAT_11012365910289":{"family":"diamond-table","expectedType":"Yemek Masası","expectedSeries":"Diamond","expectedName":"Diamond Yuvarlak Sabit Yemek Masası - 120 cm | Koyu Meşe","formLabel":"Yuvarlak","mechanismLabel":"Sabit","sizeLabel":"Ø120 cm"},"CAT_11012349559057":{"family":"diamond-table","expectedType":"Yemek Masası","expectedSeries":"Diamond","expectedName":"Diamond Yuvarlak Sabit Yemek Masası - 120 cm | Natürel Meşe","formLabel":"Yuvarlak","mechanismLabel":"Sabit","sizeLabel":"Ø120 cm"},"CAT_10591378080017":{"family":"avila-bookcase","expectedType":"Kitaplık","expectedSeries":"Avila","expectedName":"Avila Düz Kitaplık | Koyu Meşe","modelLabel":"Düz"},"CAT_10153509421329":{"family":"avila-bookcase","expectedType":"Kitaplık","expectedSeries":"Avila","expectedName":"Avila Düz Kitaplık | Natürel Meşe","modelLabel":"Düz"},"CAT_10591371493649":{"family":"avila-bookcase","expectedType":"Kitaplık","expectedSeries":"Avila","expectedName":"Avila Çıtalı Kitaplık | Koyu Meşe","modelLabel":"Çıtalı"},"CAT_10160916988177":{"family":"avila-bookcase","expectedType":"Kitaplık","expectedSeries":"Avila","expectedName":"Avila Çıtalı Kitaplık | Natürel Meşe","modelLabel":"Çıtalı"},"CAT_10748441133329":{"family":"avila-console","expectedType":"Konsol","expectedSeries":"Avila","expectedName":"Avila Geniş Konsol | Koyu Meşe","modelLabel":"Geniş · 198 cm"},"CAT_10721054949649":{"family":"avila-console","expectedType":"Konsol","expectedSeries":"Avila","expectedName":"Avila Geniş Konsol | Natürel Meşe","modelLabel":"Geniş · 198 cm"},"CAT_10173543285009":{"family":"avila-console","expectedType":"Konsol","expectedSeries":"Avila","expectedName":"Avila Konsol | Koyu Meşe","modelLabel":"Standart · 150 cm"},"CAT_10153508602129":{"family":"avila-console","expectedType":"Konsol","expectedSeries":"Avila","expectedName":"Avila Konsol | Natürel Meşe","modelLabel":"Standart · 150 cm"}}};
const axisLabels={finishLabel:'Renk',modelLabel:'Model',formLabel:'Form',mechanismLabel:'Masa tipi',seatLabel:'Oturak',surfaceLabel:'Tabla yüzeyi',sizeLabel:'Ölçü',fabricLabel:'Kumaş'};
function memberFor(e){const m=familyConfig.members[e.id];return m&&e.kind==='single'&&e.type===m.expectedType&&e.series===m.expectedSeries&&e.name===m.expectedName?m:null;}
function baseName(e){
 const member=memberFor(e);if(member)return familyConfig.families[member.family].name;
 const name=String(e.name||'').trim(),finish=String(e.finishLabel||'').replace(/\s*·\s*koleksiyon referansı$/i,'').trim();
 const parts=name.split(/\s*[|·]\s*/).filter(part=>!finish||norm(part)!==norm(finish));
 return parts.filter(part=>e.type!=='Karyola'||!/^\d+(?:[.,]\d+)?\s*[x×]\s*\d+(?:[.,]\d+)?\s*(?:cm)?$/i.test(part)).join(' | ').trim();
}
function dimensions(e,v,p){
 if(e.type!=='Karyola')return {sizeLabel:'',fabricLabel:''};
 const match=String(v.label||'').match(sizePattern)||String(e.name||'').match(sizePattern);
 const m=Array.isArray(p?.mattress)&&p.mattress.length===2?p.mattress:match?[Number(match[1].replace(',','.')),Number(match[2].replace(',','.'))]:null;
 const sizeLabel=m?m.join('×')+' cm':'';
 const fabricLabel=match&&norm(v.label)===norm(match[0])||!v.label||norm(v.label)==='standart'?'':v.label;
 return {sizeLabel,fabricLabel};
}
function axesFor(e){return e.familyAxes|| (e.bedFamily?['finishLabel','sizeLabel','fabricLabel']:['finishLabel']);}
function axisChoices(e,key,allowed,selected){
 // Rope seats have no fabric option; changing the seat itself still reaches every real SKU.
 const choices=key==='fabricLabel'&&e.productFamily==='viking-chair'?allowed.filter(x=>x.v.seatLabel===selected.seatLabel):allowed;
 return [...new Set(choices.map(x=>x.v[key]||''))];
}
function searchText(e){return [e.name,e.series,e.type,...e.variants.flatMap(v=>[v.sourceName,v.finishLabel,v.originalLabel,...axesFor(e).map(k=>v[k])])].filter(Boolean).join(' ');}
function build(entries,products={}){
 const visibility=root.SomassCatalogVisibility;if(!visibility)throw Error('Catalog visibility policy must load before grouping');
 const originalEntries=entries;entries=visibility.filterEntries(entries,products);
 const sourceById=new Map(entries.map(e=>[e.id,e])),groups=[],byKey=new Map(),aliases=new Map(),byPid=new Map();
 // V120 is the placed-room alias of the same natural/beige vanity, not a second sale product.
 const vanityPid='CAT_10833994678545_53115080278289',vanityEntry=entries.find(e=>e.variants.some(v=>v.pid===vanityPid)),planAlias=vanityEntry&&entries.find(e=>e.kind==='plan'&&e.variants.some(v=>v.pid==='V120'));
 for(const e of entries){
  if(e===planAlias)continue;
  const member=memberFor(e),family=member&&familyConfig.families[member.family],title=baseName(e),changed=title!==String(e.name||'').trim();
  const key=family?'family\u0000'+family.key:changed||e.type==='Karyola'?[e.kind,e.type,e.series,norm(title)].join('\u0000'):'single\u0000'+e.id;
  let group=byKey.get(key);
  if(!group){group={...e,name:title,variants:[],sourceEntryIds:[],finishLabels:[],bedFamily:e.type==='Karyola',...(family?{productFamily:family.key,familyAxes:['finishLabel',...family.axes]}:{})};byKey.set(key,group);groups.push(group);}
  group.sourceEntryIds.push(e.id);aliases.set(e.id,group);
  e.variants.forEach((v,i)=>{
   const variant={...v,sourceEntryId:e.id,sourceVariantIndex:e.sourceVariantIndices?.[i]??i,sourceName:e.name,sourceFinishLabel:e.finishLabel||'',finishLabel:e.finishLabel||'',finishCode:e.finishCode||'',originalLabel:v.label||'Standart',...dimensions(e,v,products[v.pid])};
   if(member){for(const k of Object.keys(axisLabels))if(Object.hasOwn(member,k))variant[k]=member[k];if(member.finishCode)variant.finishCode=member.finishCode;if(Object.hasOwn(member,'fabricFromVariant'))variant.fabricLabel=member.fabricFromVariant?v.label||'Standart':'';}
   group.variants.push(variant);if(v.pid)byPid.set(v.pid,{entry:group,variantIndex:group.variants.length-1});
  });
 }
 for(const group of groups){group.finishLabels=[...new Set(group.variants.map(v=>v.finishLabel))];group.groupedColors=group.finishLabels.length>1;group.finishLabel=group.groupedColors?'':group.finishLabels[0];}
 const canonicalVanity=byPid.get(vanityPid);
 if(planAlias&&canonicalVanity){aliases.set(planAlias.id,canonicalVanity.entry);byPid.set('V120',canonicalVanity);}
 function resolve(entryId,pid){
  if(visibility.blockedTarget(originalEntries,entryId,pid,products))return null;
  const pidMatch=byPid.get(pid),entry=pidMatch?.entry||aliases.get(entryId)||groups[0];
  if(!entry)return null;
  let variantIndex=pidMatch?.entry===entry?pidMatch.variantIndex:entry.variants.findIndex(v=>v.sourceEntryId===entryId);
  if(variantIndex<0)variantIndex=0;
  return{entry,variantIndex};
 }
 function selectVariant(e,previousIndex,updates,allowed=e.variants.map((v,i)=>({v,i}))){
  const previous=e.variants[previousIndex]||e.variants[0],keys=Object.keys(updates);
  const candidates=allowed.filter(({v})=>keys.every(k=>v[k]===updates[k]));
  candidates.sort((a,b)=>{
   const priority=e.productFamily?['finishLabel','modelLabel','formLabel','mechanismLabel','seatLabel','surfaceLabel','sizeLabel','fabricLabel','originalLabel']:['finishLabel','sizeLabel','fabricLabel','originalLabel'];
   const rank=v=>priority.reduce((n,k,j)=>n+(!keys.includes(k)&&v[k]===previous[k]?2**(priority.length-j-1):0),0);
   return rank(b.v)-rank(a.v)||a.i-b.i;
  });
  return candidates[0]||null;
 }
 return{entries:groups,sourceById,aliases,byPid,resolve,baseName,selectVariant,axesFor,axisChoices,axisLabels,searchText,revision:familyConfig.revision,planAliases:planAlias?[planAlias.id]:[]};
}
root.SomassAuditColorGroups={build,baseName,axesFor,axisChoices,axisLabels,searchText,revision:familyConfig.revision};
})(typeof window==='undefined'?globalThis:window);



(function(global){
  'use strict';
  global.SomassFullCatalog={create};
  function create(options){
    const {root,catalog,products,photos}=options,host=root.querySelector('#sp-catalog');
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const norm=v=>String(v??'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
    // catalog-color-groups-v1: UI groups preserve every original record and option.
    const colorGroups=global.SomassAuditColorGroups.build(catalog.entries,products),catalogEntries=colorGroups.entries;
    global.SomassFullCatalogColorGrouping=colorGroups;
    const money=v=>v==null?'Fiyat bilgisi yok':Number(v).toLocaleString('tr-TR',{maximumFractionDigits:0})+' TL';
    const sizes=v=>v&&v.w&&v.d?[v.w,v.d,v.h].filter(n=>n!=null).map(n=>Number(n).toLocaleString('tr-TR',{maximumFractionDigits:1})).join(' × ')+' cm':'';
    let opened=false,page=0,search='',category='all',finish='all',onlyPlaceable=false,lastFocus=null;
    const chosen=new Map(),drawerChoices=new Map(),pageSize=24,DrawerUI=global.SomassWatkinsDrawerUI;
    const types=[...new Set(catalogEntries.map(e=>e.type))].sort((a,b)=>a.localeCompare(b,'tr'));
    host.className='sp-full-catalog';host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-labelledby','spc-heading');
    host.innerHTML=`<div class="spc-backdrop" data-spc-close></div><div class="spc-dialog"><header class="spc-head"><div><h2 id="spc-heading">Somass · Fotoğraflı katalog</h2><span>${catalogEntries.length} ürün · ${esc(catalog.dateLabel)}</span></div><button type="button" class="spc-close" data-spc-close aria-label="Kataloğu kapat">×</button></header><div class="spc-filters"><input id="spc-search" type="search" placeholder="Ürün veya seri ara" aria-label="Katalogda ürün veya seri ara"><select id="spc-type" aria-label="Katalog ürün kategorisi"><option value="all">Tüm kategoriler</option>${types.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('')}</select><select id="spc-finish" aria-label="Katalog renk filtresi"><option value="natural_oak">Natürel Meşe</option><option value="all">Tüm renkler</option><option value="dark_oak">Koyu Meşe</option><option value="other">Diğer renkler</option></select></div><div class="spc-results"><span id="spc-count"></span><label><input id="spc-placeable" type="checkbox"> Yalnız plana eklenebilenler</label><button type="button" id="spc-reset">Tümünü göster</button></div><div id="spc-notice" class="spc-notice" role="status" hidden></div><div class="spc-scroll"><div id="spc-grid" class="spc-grid"></div><div id="spc-empty" class="spc-empty" hidden>Bu filtrelerle ürün bulunamadı.</div></div><footer class="spc-footer"><button type="button" id="spc-prev">← Önceki</button><span id="spc-page"></span><button type="button" id="spc-next">Sonraki →</button></footer></div>`;
    const $=s=>host.querySelector(s);$('#spc-finish').value=finish;
    function availableVariants(e){const query=norm(search);return e.variants.map((v,i)=>({v,i})).filter(({v})=>(finish==='all'||(finish==='other'?!['natural_oak','dark_oak'].includes(v.finishCode):v.finishCode===finish))&&(!query||norm(e.name+' '+e.series+' '+e.type+' '+v.sourceName+' '+v.finishLabel+' '+v.originalLabel+' '+colorGroups.axesFor(e).map(k=>v[k]||'').join(' ')).includes(query))&&(!onlyPlaceable||(v.pid&&products[v.pid])||v.bundleComponents?.length));}
    function variant(e){const allowed=availableVariants(e),index=chosen.get(e.id)||0;return allowed.find(x=>x.i===index)?.v||allowed[0]?.v||e.variants[index]||e.variants[0];}
    function filtered(){return catalogEntries.filter(e=>(category==='all'||e.type===category)&&availableVariants(e).length>0);}
    function actionLabel(e,v){if(v.bundleComponents?.length)return 'Takımı odaya ekle';if(!v.pid)return /çekmece/i.test(e.type)?'Yatakla birlikte':'Ürün sayfasını aç';return options.actionLabel(products[v.pid]);}
    function bedChoices(e,v,choices){
      const sameFinish=choices.filter(x=>x.v.finishLabel===v.finishLabel),sizes=[...new Set(sameFinish.map(x=>x.v.sizeLabel))],sameSize=sameFinish.filter(x=>x.v.sizeLabel===v.sizeLabel),fabrics=[...new Set(sameSize.map(x=>x.v.fabricLabel))];
      const control=(label,axis,values,selected)=>'<label class="spc-variant-label">'+label+'<select data-spc-axis="'+axis+'" data-spc-group="'+esc(e.id)+'" aria-label="'+esc(e.name+' '+label.toLocaleLowerCase('tr-TR'))+'"'+(values.length<2?' disabled':'')+'>'+values.map(x=>'<option value="'+esc(x)+'"'+(x===selected?' selected':'')+'>'+esc(x||'Standart')+'</option>').join('')+'</select></label>';
      return control('Ölçü','sizeLabel',sizes,v.sizeLabel)+(fabrics.some(Boolean)?control('Kumaş','fabricLabel',fabrics,v.fabricLabel):'');
    }
    function familyChoices(e,v,choices){
      return colorGroups.axesFor(e).filter(key=>key!=='finishLabel').map(key=>{const values=colorGroups.axisChoices(e,key,choices,v);if(values.length<2&&!values.some(Boolean))return '';const label=colorGroups.axisLabels[key];return '<label class="spc-variant-label">'+label+'<select data-spc-axis="'+key+'" data-spc-group="'+esc(e.id)+'" aria-label="'+esc(e.name+' '+label.toLocaleLowerCase('tr-TR'))+'"'+(values.length<2?' disabled':'')+'>'+values.map(value=>'<option value="'+esc(value)+'"'+(value===(v[key]||'')?' selected':'')+'>'+esc(value||'Standart')+'</option>').join('')+'</select></label>';}).join('');
    }
    function card(e){const v=variant(e),sourceEntry=colorGroups.sourceById.get(v.sourceEntryId)||e,choices=availableVariants(e),finishLabels=[...new Set(choices.map(x=>x.v.finishLabel))],sameFinish=choices.filter(x=>x.v.finishLabel===v.finishLabel),p=v.pid?products[v.pid]:null,addable=!!p||!!v.bundleComponents?.length,available=v.available!==false;
      // provided-viking-frame-hybrid-classification-v1
      const sourceFrameHybrid=!!p&&p.nativeOriginalSourceEvidence?.sourceClassification==='original-rhino-source-frame-hybrid';
      // provided-vasso-frame-2d-glass-classification-v1
      const sourceGlassFrameHybrid=!!p&&p.nativeOriginalSourceEvidence?.sourceClassification==='original-rhino-source-frame-2d-glass-hybrid';
      const original=!!p&&(global.SomassOriginalSceneModels?.canHandle(p)||global.SomassOriginalWatkins?.canHandle(p));
      const repairedSourceAssembly=!!p&&global.SomassDiamond192SourceAssembly?.canHandle(p);
      const sourceAssembly=!!p&&(global.SomassHenlowSourcePartsAssembly?.canHandle(p)||p.nativeOriginalSourceEvidence?.sourceClassification==='original-rhino-source-assembly');
      let note=repairedSourceAssembly?'Özgün kaynak · topoloji onarıldı · açık 281 cm':sourceFrameHybrid?(p.nativeOriginalSourceEvidence?.sourceFamily==='RUBEN_CHAIR_ASSEMBLED'?(p.nativeOriginalSourceEvidence.labelTr||'Özgün CAD iskelet · yaklaşık minderler'):'Özgün CAD iskelet · yaklaşık oturak'):sourceAssembly?'Özgün CAD parçaları · belgeli montaj':v.bundleComponents?.length?v.bundleComponents.length+' parça · her ürün ayrı taşınabilir':original?'Özgün CAD · kaplama yaklaşık':addable?(p.assetKind==='cad'?'Ölçülü plan görünüşü':'Ölçülü · temsili plan / 3D'):e.kind==='set'?'Takım · parçaları ayrı ürünlerden seçin':'Yerleşim için tam ölçü teyidi gerekir';
      if(global.SomassWatkinsBed180Derived?.canHandle(p))note='160 CAD’den türetildi · 180 cm';
      if(sourceGlassFrameHybrid)note='Özgün CAD iskelet · 2D çizimden cam';
      if(global.SomassNoahHistoricalComponentAssembly?.canHandle(p))note='Özgün CAD bileşenleri · tarihî başlık eşlemesi';
      const colorPhotoFallback=v.photoSourceStatus==='entry-fallback'&&/bej|yeşil|yesil|siyah|gri|kahverengi|kiremit|dokulu/i.test(v.label||'');
      return `<article class="spc-card" data-spc-entry="${esc(e.id)}"><div class="spc-photo"><img loading="lazy" src="${photos[v.photoId||e.photoId]}" alt="${esc(e.name+' · '+v.label)}">${colorPhotoFallback?'<span class="spc-photo-note">Fotoğraf: standart ürün görünümü</span>':''}</div><div class="spc-card-body"><div class="spc-type">${esc(e.type)} · ${esc(v.finishLabel)}</div><h3>${esc(e.name)}</h3>${finishLabels.length>1?`<label class="spc-variant-label">Renk<select data-spc-finish="${esc(e.id)}" aria-label="${esc(e.name)} renk">${finishLabels.map(f=>`<option value="${esc(f)}" ${f===v.finishLabel?'selected':''}>${esc(f)}</option>`).join('')}</select></label>`:''}${e.productFamily?familyChoices(e,v,choices):e.bedFamily?bedChoices(e,v,choices):sameFinish.length>1?`<label class="spc-variant-label">Seçenek<select data-spc-variant="${esc(e.id)}" aria-label="${esc(e.name)} seçeneği">${sameFinish.map(({v:o,i:j})=>`<option value="${j}" ${o===v?'selected':''}>${esc(o.originalLabel||o.label)}${o.available===false?' · Tükendi':''}</option>`).join('')}</select></label>`:''}${p&&DrawerUI?.canHandle(p)?DrawerUI.catalogChoiceHTML(v.sourceEntryId,drawerChoices.get(v.sourceEntryId)||'none',p,{catalog,products,photos},esc):''}<div class="spc-dims">${esc(p?sizes(p):e.sizeText||'')}</div>${p?.sourceDerivedGeometry?'<small class="spc-model-source">CAD’den türetildi · yaklaşık</small>':''}<div class="spc-price">${money(v.priceTRY)}</div>${p?.photoSourceStatus==='collection-reference'?`<small class="spc-reference-note">${esc(p.photoReferenceLabel)}. ${esc(p.customerDisclosureTr)}</small>`:''}<small>${esc(note)}</small>${available?'':'<span class="spc-stock">Tükendi</span>'}<div class="spc-actions">${addable?`<button type="button" data-spc-add="${esc(e.id)}">${esc(actionLabel(e,v))}</button>`:`<a href="${esc(sourceEntry.url)}" target="_blank" rel="noopener noreferrer">${esc(actionLabel(e,v))} ↗</a>`}${addable?`<a href="${esc(sourceEntry.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(e.name)} ${e.referenceOnly?'koleksiyon referans sayfası':'resmî ürün sayfası'}">↗</a>`:''}</div></div></article>`;
    }
    function render(){if(!opened)return;const list=filtered(),pages=Math.max(1,Math.ceil(list.length/pageSize));page=Math.min(Math.max(0,page),pages-1);
      $('#spc-count').textContent=list.length+' / '+catalogEntries.length+' ürün';$('#spc-page').textContent=(page+1)+' / '+pages;
      $('#spc-grid').innerHTML=list.slice(page*pageSize,(page+1)*pageSize).map(card).join('');$('#spc-empty').hidden=!!list.length;
      $('#spc-prev').disabled=page===0;$('#spc-next').disabled=page>=pages-1;
    }
    function open(target){const unavailable=typeof target==='string'&&global.SomassCatalogVisibility.blockedTarget(catalog.entries,null,target,products);if(typeof target==='string'&&!unavailable){const match=colorGroups.resolve(colorGroups.aliases.has(target)?target:null,target);if(match){chosen.set(match.entry.id,match.variantIndex);const list=filtered();page=Math.max(0,Math.floor(list.indexOf(match.entry)/pageSize));}}$('#spc-notice').hidden=!unavailable;$('#spc-notice').textContent=unavailable?global.SomassCatalogVisibility.unavailableLabel:'';lastFocus=document.activeElement;opened=true;host.hidden=false;render();$('#spc-search').focus({preventScroll:true});root.querySelector('#sp-catalog-toggle').textContent='Kataloğu kapat';}
    function close(){opened=false;host.hidden=true;root.querySelector('#sp-catalog-toggle').textContent='+ Fotoğraflı katalog · '+catalogEntries.length+' ürün';if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});}
    function reset(){search='';category='all';finish='all';onlyPlaceable=false;page=0;$('#spc-search').value='';$('#spc-type').value='all';$('#spc-finish').value='all';$('#spc-placeable').checked=false;render();}
    $('#spc-search').addEventListener('input',e=>{search=e.target.value;page=0;render();});
    $('#spc-type').addEventListener('change',e=>{category=e.target.value;page=0;render();});
    $('#spc-finish').addEventListener('change',e=>{finish=e.target.value;page=0;render();});
    $('#spc-placeable').addEventListener('change',e=>{onlyPlaceable=e.target.checked;page=0;render();});
    $('#spc-reset').addEventListener('click',reset);
    $('#spc-prev').addEventListener('click',()=>{page--;render();$('.spc-scroll').scrollTop=0;});$('#spc-next').addEventListener('click',()=>{page++;render();$('.spc-scroll').scrollTop=0;});
    host.addEventListener('change',e=>{if(e.target.dataset.spcAxis){const entry=catalogEntries.find(q=>q.id===e.target.dataset.spcGroup),previous=entry&&variant(entry),match=entry&&colorGroups.selectVariant(entry,entry.variants.indexOf(previous),{[e.target.dataset.spcAxis]:e.target.value},availableVariants(entry));if(match){chosen.set(entry.id,match.i);render();}return;}if(e.target.dataset.spcFinish){const entry=catalogEntries.find(q=>q.id===e.target.dataset.spcFinish),previous=entry&&variant(entry),allowed=entry&&availableVariants(entry).filter(x=>x.v.finishLabel===e.target.value),match=entry&&colorGroups.selectVariant(entry,entry.variants.indexOf(previous),{finishLabel:e.target.value},availableVariants(entry));if(match){chosen.set(entry.id,match.i);render();}return;}if(e.target.dataset.spcVariant){chosen.set(e.target.dataset.spcVariant,Number(e.target.value));render();}});
    host.addEventListener('click',e=>{const closeButton=e.target.closest('[data-spc-close]');if(closeButton){close();return;}
      const drawer=e.target.closest('[data-spc-drawer]');if(drawer){const entry=colorGroups.aliases.get(drawer.dataset.spcDrawerEntry),v=entry&&variant(entry),p=v?.pid&&products[v.pid],mode=drawer.dataset.spcDrawer;if(p&&DrawerUI?.canHandle(p)&&['none','four'].includes(mode)){drawerChoices.set(v.sourceEntryId,mode);render();host.querySelector('[data-spc-entry="'+entry.id+'"] [data-spc-drawer="'+mode+'"]')?.focus({preventScroll:true});}return;}
      const b=e.target.closest('[data-spc-add]');if(!b)return;const entry=catalogEntries.find(q=>q.id===b.dataset.spcAdd);if(!entry)return;const v=variant(entry);if(global.SomassCatalogVisibility.variantExcluded(entry,v,products)||(!v?.pid&&!v?.bundleComponents?.length))return;
      const result=v.bundleComponents?.length?options.onAddBundle(v.bundleComponents,entry,v):options.onAdd(v.pid,{drawerConfiguration:DrawerUI?.canHandle(products[v.pid])?(drawerChoices.get(v.sourceEntryId)||'none'):undefined});if(result?.ok!==false)close();else{$('#spc-notice').hidden=false;$('#spc-notice').textContent=result.message||'Ürün eklenemedi.';}
    });
    host.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();return;}
      if(e.key==='Tab'){const focusables=[...host.querySelectorAll('button,input,select,a[href]')].filter(e=>!e.disabled&&e.getClientRects().length);if(!focusables.length)return;const first=focusables[0],last=focusables[focusables.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
    });
    root.querySelector('#sp-catalog-toggle').textContent='+ Fotoğraflı katalog · '+catalogEntries.length+' ürün';
    return {open,close,toggle(){opened?close():open();},refresh:render,isOpen:()=>opened};
  }
})(typeof window!=='undefined'?window:globalThis);

/* Room inspector view only: every choice resolves to an existing catalog SKU. */
(function(root){
'use strict';
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const priorities=['finishLabel','modelLabel','formLabel','mechanismLabel','seatLabel','surfaceLabel','sizeLabel','fabricLabel','originalLabel'];
function create({catalog,products,groups,escape:escape=escapeHTML}){
 const grouping=groups||root.SomassAuditColorGroups.build(catalog.entries||catalog,products);
 const entries=catalog.entries||catalog;
 const policy=root.SomassCatalogVisibility;
 const allowedFor=e=>e.variants.map((v,i)=>({v,i})).filter(({v})=>v.pid&&products[v.pid]&&!products[v.pid].hidden&&!policy.productExcluded(products[v.pid],entries));
 const usable=grouping.entries.filter(e=>allowedFor(e).length);
 const groupsById=new Map(usable.map(e=>[e.id,e]));
 function selection(pid){
  if(!products[pid]||policy.productExcluded(products[pid],entries))return null;
  let found=grouping.byPid.get(pid);
  if(!found){
   // Legacy scene aliases carry their original sale identity. Never use resolve's first-row fallback.
   const p=products[pid],variantId=p.variantId||String(p.source?.url||'').match(/[?&]variant=(\d+)/)?.[1];
   if(p.catalogProduct&&variantId)found=grouping.byPid.get(p.catalogProduct+'_'+variantId);
   if(!found&&variantId){
    const candidates=usable.flatMap(entry=>entry.variants.map((v,variantIndex)=>({entry,variantIndex,v})))
     .filter(x=>String(x.v.id)===String(variantId)&&(!p.catalogProduct||x.v.sourceEntryId===p.catalogProduct));
    if(candidates.length===1)found=candidates[0];
   }
  }
  if(!found||!allowedFor(found.entry).some(x=>x.i===found.variantIndex))return null;
  return {entry:found.entry,variantIndex:found.variantIndex,variant:found.entry.variants[found.variantIndex]};
 }
 function fields(state){
  if(!state)return[];
  const {entry,variant}=state,allowed=allowedFor(entry),keys=[...grouping.axesFor(entry)];
  // Families without specialized axes still expose their actual fabric/option SKUs.
  const remainingLabels=[...new Set(allowed.map(x=>x.v.originalLabel||''))];
  if(remainingLabels.length>1&&allowed.some(a=>allowed.some(b=>a.i!==b.i&&keys.every(k=>a.v[k]===b.v[k])&&a.v.originalLabel!==b.v.originalLabel)))keys.push('originalLabel');
  return [...new Set(keys)].map(key=>({
   key,label:key==='originalLabel'?(['bed','chair','bench','armchair','sofa'].includes(products[variant.pid].cat)?'Kumaş':'Seçenek'):(grouping.axisLabels[key]||'Seçenek'),
   values:(key==='originalLabel'?[...new Set(allowed.map(x=>x.v.originalLabel||''))]:grouping.axisChoices(entry,key,allowed,variant)).filter(Boolean),value:variant[key]||''
  })).filter(field=>field.values.length);
 }
 function controlsHTML(pid){
  const p=products[pid];if(!p)return'';
  const state=selection(pid),sameCategory=usable.filter(e=>allowedFor(e).some(x=>products[x.v.pid].cat===p.cat));
  const option=(value,label,selected)=>'<option value="'+escape(value)+'"'+(selected?' selected':'')+'>'+escape(label)+'</option>';
  const familyOptions=(!state?option('',p.name,true):'')+sameCategory.map(e=>option(e.id,e.name,state?.entry===e)).join('');
  const fieldHTML=fields(state).map(field=>'<label class="sp-sub">'+escape(field.label)+'<select class="sp-modelselect" data-sp-family-axis="'+escape(field.key)+'"'+(field.values.length===1?' disabled':'')+'>'+field.values.map(value=>option(value,value,value===field.value)).join('')+'</select></label>').join('');
  return '<div class="sp-family-controls"><label class="sp-sub">Ürün<select class="sp-modelselect" data-sp-family-product="true">'+familyOptions+'</select></label>'+fieldHTML+'</div>';
 }
 function closest(entry,previous,allowed){
  return [...allowed].sort((a,b)=>{
   const rank=v=>priorities.reduce((n,key,index)=>n+(previous&&v[key]===previous[key]?2**(priorities.length-index-1):0),0);
   return rank(b.v)-rank(a.v)||a.i-b.i;
  })[0]||null;
 }
 function targetFromEvent(pid,target){
  const p=products[pid];if(!p||!target?.dataset)return null;
  const state=selection(pid);let result=null;
  if(target.dataset.spFamilyProduct){
   const entry=groupsById.get(target.value);if(!entry)return null;
   if(state?.entry===entry)return null;
   result=closest(entry,state?.variant,allowedFor(entry).filter(x=>products[x.v.pid].cat===p.cat));
  }else if(target.dataset.spFamilyAxis&&state){
   const key=target.dataset.spFamilyAxis,field=fields(state).find(f=>f.key===key);
   if(!field||!field.values.includes(target.value)||state.variant[key]===target.value)return null;
   result=grouping.selectVariant(state.entry,state.variantIndex,{[key]:target.value},allowedFor(state.entry).filter(x=>products[x.v.pid].cat===p.cat));
  }
  const resultPid=result?.v.pid;
  return resultPid&&products[resultPid]&&products[resultPid].cat===p.cat?resultPid:null;
 }
 return {controlsHTML,targetFromEvent,selection,fields,hasFabricControl:pid=>fields(selection(pid)).some(f=>f.label==='Kumaş'),revision:'room-inspector-family-20261105-v1'};
}
root.SomassInspectorFamily={create};
})(typeof window==='undefined'?globalThis:window);

(function(global){
  'use strict';
  global.SomassRoomEditor={create};
  function create(options){
    const root=options.root,geometry=options.geometry,host=root.querySelector('#sp-room-editor');
    if(!host||!geometry)throw new Error('Oda düzenleyici hazırlanamadı.');
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fmt=n=>Number(n).toLocaleString('tr-TR',{maximumFractionDigits:1});
    const $=s=>host.querySelector(s);
    let definition=null,editing=false,opened=false,lastFocus=null,busy=false,sequence=0,step=0,selectedWall=0,openingDrag=null,miniPreview=null;
    host.className='spr-overlay';host.hidden=true;host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-labelledby','spr-heading');
    host.innerHTML=`<div class="spr-backdrop" data-spr-close></div><form class="spr-dialog" id="spr-form" novalidate><header class="spr-head"><div><span class="spr-eyebrow">SO-MASS ROOM STUDIO</span><h2 id="spr-heading">Odanı birlikte kuralım</h2><p>Ölçülerini gir, detayları ekle ve tarzını seç.</p></div><button type="button" class="spr-close" data-spr-close aria-label="Oda düzenleyiciyi kapat">×</button></header><nav class="spr-steps" aria-label="Oda oluşturma adımları"><button type="button" data-spr-step="0" aria-current="step"><b>1</b> Ölçüler</button><button type="button" data-spr-step="1"><b>2</b> Kapı ve pencere</button><button type="button" data-spr-step="2"><b>3</b> Renk ve zemin</button></nav><div class="spr-body"><div class="spr-fields"><section class="spr-section" data-spr-panel="0"><h3>Odanın biçimi ve ölçüleri</h3><label class="spr-field">Oda adı<input id="spr-name" maxlength="50" required autocomplete="off" placeholder="Örn. Salonum"></label><label class="spr-field">Oda biçimi<select id="spr-shape"><option value="rect">▭ Dikdörtgen / kare</option><option value="l">⌜ L biçiminde / köşesi girintili</option></select></label><p class="spr-help">Duvarların içten içe ölçüsünü santimetre olarak yaz. Örneğin 4 metre için 400 gir.</p><div class="spr-field-grid"><label class="spr-field">En <span>cm</span><input id="spr-width" type="number" inputmode="decimal" step="0.1" min="150" max="2000" required></label><label class="spr-field">Boy <span>cm</span><input id="spr-depth" type="number" inputmode="decimal" step="0.1" min="150" max="2000" required></label><label class="spr-field">Tavan <span>cm</span><input id="spr-height" type="number" inputmode="decimal" step="0.1" min="200" max="600" required></label></div><div class="spr-presets"><span>Hızlı başlangıç</span><button type="button" data-spr-size="300,300">3 × 3 m</button><button type="button" data-spr-size="400,350">4 × 3,5 m</button><button type="button" data-spr-size="500,400">5 × 4 m</button></div><div id="spr-cut-fields" hidden><div class="spr-cut-intro">L biçimi için ana dikdörtgenden çıkarılan köşeyi gir.</div><label class="spr-field">Girinti köşesi<select id="spr-cut-corner"><option value="NE">Sağ üst</option><option value="NW">Sol üst</option><option value="SE">Sağ alt</option><option value="SW">Sol alt</option></select></label><div class="spr-field-grid spr-grid-two"><label class="spr-field">Girinti eni <span>cm</span><input id="spr-cut-width" type="number" inputmode="decimal" step="0.1" min="40"></label><label class="spr-field">Girinti boyu <span>cm</span><input id="spr-cut-depth" type="number" inputmode="decimal" step="0.1" min="40"></label></div></div><div id="spr-size-summary" class="spr-size-summary" aria-live="polite"></div></section><section class="spr-section" data-spr-panel="1" hidden><h3>Kapı ve pencerelerin yerini belirle</h3><p class="spr-help">Planda bir duvara dokun, kapı veya pencere ekle. Eklediklerini duvar boyunca sürükleyebilir ya da kesin ölçüsünü yazabilirsin.</p><div id="spr-wall-picker" class="spr-wall-picker" aria-label="Açıklık eklenecek duvar"></div><div class="spr-opening-actions"><button type="button" id="spr-add-door">+ Kapı</button><button type="button" id="spr-add-window">+ Pencere</button></div><div class="spr-section-title"><h3>Eklenenler</h3><span id="spr-opening-count"></span></div><div id="spr-openings"></div></section><section class="spr-section" data-spr-panel="2" hidden><h3>Odanın havasını seç</h3><p class="spr-help">Seçimlerini önizlemede gör. Renkleri daha sonra da değiştirebilirsin.</p><h4>Duvar rengi</h4><div id="spr-wall-swatches" class="spr-swatches"></div><label class="spr-custom-color">Kendi duvar rengim<input id="spr-wall-color" type="color" aria-label="Özel duvar rengi"></label><h4>Zemin</h4><div id="spr-floor-types" class="spr-floor-types"></div><div class="spr-field-grid spr-grid-two"><label class="spr-custom-color">Zemin tonu<input id="spr-floor-color" type="color" aria-label="Zemin rengi"></label><label class="spr-field">Döşeme yönü<select id="spr-floor-direction"><option value="0">Boyuna</option><option value="90">Enine</option></select></label></div><details class="spr-accent"><summary>Tek duvara farklı renk uygula</summary><label class="spr-field">Vurgu duvarı<select id="spr-accent-wall"><option value="-1">Yok · tüm duvarlar aynı</option></select></label><label class="spr-custom-color">Vurgu rengi<input id="spr-accent-color" type="color" aria-label="Vurgu duvarı rengi"></label></details><label class="spr-custom-color">Tavan ve süpürgelik<input id="spr-ceiling-color" type="color" aria-label="Tavan ve süpürgelik rengi"></label></section></div><aside class="spr-preview-column"><div class="spr-preview-head"><h3 id="spr-preview-heading">Canlı oda planın</h3><span id="spr-live-area"></span></div><div id="spr-preview" class="spr-preview"></div><div id="spr-preview-3d" class="spr-preview-3d" hidden></div><div class="spr-legend"><span><i class="spr-legend-door"></i>Kapı</span><span><i class="spr-legend-window"></i>Pencere</span><span><i class="spr-legend-wall">1</i>Duvar</span></div><p class="spr-preview-tip">Ölçülerin değiştikçe önizleme de güncellenir.</p><div id="spr-preview-message" class="spr-preview-message" aria-live="polite"></div></aside></div><footer class="spr-footer"><div class="spr-footer-leading"><button type="button" id="spr-delete" class="spr-delete" hidden>Odayı sil</button><div id="spr-delete-confirm" hidden><span>Bu oda silinsin mi? Geri al ile geri getirebilirsin.</span><button type="button" id="spr-delete-cancel">Vazgeç</button><button type="button" id="spr-delete-yes">Evet, sil</button></div></div><div id="spr-error" class="spr-error" role="alert" tabindex="-1" hidden></div><div class="spr-submit-actions"><button type="button" id="spr-prev" hidden>← Geri</button><button type="button" id="spr-next" class="spr-primary">Devam et →</button><button type="submit" id="spr-save" class="spr-primary" hidden>Odayı oluştur</button></div></footer></form>`;
    const fields={name:'name',shape:'shape',width:'width',depth:'depth',height:'height','cut-width':'cutWidth','cut-depth':'cutDepth','cut-corner':'cutCorner'};
    function walls(){try{return geometry.walls(definition);}catch(_){return [];}}
    function setError(messages){const error=$('#spr-error');error.hidden=!messages?.length;error.innerHTML=(messages||[]).map(s=>`<div>${esc(s)}</div>`).join('');}
    function validate(){try{const result=geometry.validate(definition);return {valid:result.valid===true||result.ok===true,errors:result.errors||[],definition:result.definition||geometry.normalize(definition)};}catch(error){return {valid:false,errors:[error.message||'Odanın ölçülerini kontrol edin.']};}}
    function openingMarkup(o,index){const ws=walls(),isDoor=o.type==='door',title=isDoor?'Kapı':'Pencere',same=definition.openings.slice(0,index+1).filter(q=>q.type===o.type).length;
      const number=(key,label,value,min=0)=>`<label class="spr-field">${label} <span>cm</span><input type="number" inputmode="decimal" step="0.1" min="${min}" max="5000" required value="${esc(value)}" data-spr-opening="${esc(o.id)}" data-spr-key="${key}" aria-label="${title} ${same} ${label.toLocaleLowerCase('tr-TR')}"></label>`;
      return `<article class="spr-opening" data-spr-opening-card="${esc(o.id)}"><div class="spr-opening-title"><h4>${title} ${same}</h4><button type="button" class="spr-remove" data-spr-remove="${esc(o.id)}" aria-label="${title} ${same} kaldır">Kaldır</button></div><label class="spr-field">Yerleştirilecek duvar<select data-spr-opening="${esc(o.id)}" data-spr-key="wall" aria-label="${title} ${same} duvarı">${ws.map(w=>`<option value="${w.index}" ${w.index===Number(o.wall)?'selected':''}>${esc(w.label)}</option>`).join('')}</select></label><div class="spr-field-grid spr-grid-two">${number('offset','Duvar başlangıcından',o.offset)}${number('width','Genişlik',o.width,1)}${number('height','Yükseklik',o.height,1)}${isDoor?`<label class="spr-field">Menteşe konumu<select data-spr-opening="${esc(o.id)}" data-spr-key="hinge" aria-label="Kapı ${same} menteşe konumu"><option value="start" ${o.hinge!=='end'?'selected':''}>Başlangıç tarafı</option><option value="end" ${o.hinge==='end'?'selected':''}>Bitiş tarafı</option></select></label><label class="spr-field">Açılma yönü<select data-spr-opening="${esc(o.id)}" data-spr-key="swing" aria-label="Kapı ${same} açılma yönü"><option value="in" ${o.swing!=='out'?'selected':''}>Odanın içine</option><option value="out" ${o.swing==='out'?'selected':''}>Odanın dışına</option></select></label>`:number('sill','Yerden yüksekliği',o.sill)}</div></article>`;
    }
    function renderOpenings(){const list=definition.openings;$('#spr-openings').innerHTML=list.length?list.map(openingMarkup).join(''):'<div class="spr-openings-empty">Henüz kapı veya pencere eklenmedi.</div>';$('#spr-opening-count').textContent=list.length?list.length+' açıklık':'';}
    function refreshWalls(){const ws=walls();host.querySelectorAll('select[data-spr-key="wall"]').forEach(select=>{const item=definition.openings.find(o=>o.id===select.dataset.sprOpening);if(!item)return;if(!ws.some(w=>w.index===Number(item.wall)))item.wall=0;select.innerHTML=ws.map(w=>`<option value="${w.index}">${esc(w.label)}</option>`).join('');select.value=String(item.wall);});}
    function drawPreview(){
      const w=Number(definition.width),d=Number(definition.depth),result=validate();
      if(!(w>0&&d>0&&w<=5000&&d<=5000)){$('#spr-preview').innerHTML='<div class="spr-preview-empty">Önizleme için oda ölçülerini girin.</div>';$('#spr-preview-message').textContent='';return;}
      let poly,ws;try{poly=geometry.polygon(definition);ws=geometry.walls(definition);}catch(_){poly=[];ws=[];}
      if(!Array.isArray(poly)||poly.length<3||!poly.every(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]))){$('#spr-preview').innerHTML='<div class="spr-preview-empty">Oda ve boşluk ölçülerini kontrol edin.</div>';$('#spr-preview-message').textContent='';return;}
      const scale=Math.max(w,d),pad=scale*.15,font=Math.max(12,scale*.06),stroke=scale*.013,sy=p=>[p[0],d-p[1]],pt=p=>sy(p).map(v=>Number(v.toFixed(2))).join(','),items=[];
      items.push(`<polygon points="${poly.map(pt).join(' ')}" fill="#f2eee4" stroke="#627263" stroke-width="${stroke}" stroke-linejoin="round"/>`);
      for(const wall of ws){const a=wall.a,b=wall.b,len=wall.length;if(!(len>0))continue;const tx=(b[0]-a[0])/len,ty=(b[1]-a[1])/len,nx=-ty,ny=tx,mid=[(a[0]+b[0])/2-nx*font*.92,(a[1]+b[1])/2-ny*font*.92],m=sy(mid);
        const labelOffset=(Math.abs(ty)<.1&&len<font*6)?3.1:2.1,labelX=(a[0]+b[0])/2-nx*font*labelOffset,labelY=d-((a[1]+b[1])/2-ny*font*labelOffset);
        if(len>font*3){const start=[a[0]+tx*font*.7+nx*font*.7,a[1]+ty*font*.7+ny*font*.7],end=[start[0]+tx*Math.min(len*.2,font*1.6),start[1]+ty*Math.min(len*.2,font*1.6)],left=[end[0]-tx*font*.38+nx*font*.23,end[1]-ty*font*.38+ny*font*.23],right=[end[0]-tx*font*.38-nx*font*.23,end[1]-ty*font*.38-ny*font*.23];items.push(`<polyline points="${pt(start)} ${pt(end)}" fill="none" stroke="#a2b49a" stroke-width="${stroke*.17}"/><polyline points="${pt(left)} ${pt(end)} ${pt(right)}" fill="none" stroke="#a2b49a" stroke-width="${stroke*.17}"/>`);}
        items.push(`<line x1="${pt(a).split(',')[0]}" y1="${pt(a).split(',')[1]}" x2="${pt(b).split(',')[0]}" y2="${pt(b).split(',')[1]}" stroke="${wall.index===selectedWall?'#335b46':'transparent'}" stroke-width="${stroke*2.6}" opacity=".42" data-spr-wall="${wall.index}"/><g data-spr-wall="${wall.index}" style="cursor:pointer"><circle cx="${m[0]}" cy="${m[1]}" r="${font*.64}" fill="#fff" stroke="#aab4a5" stroke-width="${stroke*.12}"/><text x="${m[0]}" y="${m[1]}" fill="#334b3b" font-size="${font*.82}" font-weight="600" text-anchor="middle" dominant-baseline="central">${wall.index+1}</text><text x="${labelX}" y="${labelY}" fill="#7c8776" font-size="${font*.7}" text-anchor="middle" dominant-baseline="central">${fmt(len)}</text></g>`);
      }
      for(const opening of definition.openings){const wall=ws.find(q=>q.index===Number(opening.wall));if(!wall||!Number.isFinite(Number(opening.offset))||!Number.isFinite(Number(opening.width))||opening.width<=0||opening.offset<0||Number(opening.offset)+Number(opening.width)>wall.length+.01)continue;
        const len=wall.length,tx=(wall.b[0]-wall.a[0])/len,ty=(wall.b[1]-wall.a[1])/len,nx=-ty,ny=tx,start=[wall.a[0]+tx*Number(opening.offset),wall.a[1]+ty*Number(opening.offset)],end=[start[0]+tx*Number(opening.width),start[1]+ty*Number(opening.width)],sp=sy(start),ep=sy(end);
        items.push(`<line x1="${sp[0]}" y1="${sp[1]}" x2="${ep[0]}" y2="${ep[1]}" stroke="#f2eee4" stroke-width="${stroke*1.6}"/>`);
        if(opening.type==='window'){items.push(`<line x1="${sp[0]}" y1="${sp[1]}" x2="${ep[0]}" y2="${ep[1]}" stroke="#6a9d9b" stroke-width="${stroke*1.4}" data-spr-drag="${esc(opening.id)}" style="cursor:ew-resize"/><line x1="${sp[0]}" y1="${sp[1]}" x2="${ep[0]}" y2="${ep[1]}" stroke="#dce9e5" stroke-width="${stroke*.2}"/><line x1="${sp[0]}" y1="${sp[1]}" x2="${ep[0]}" y2="${ep[1]}" stroke="transparent" stroke-width="22" vector-effect="non-scaling-stroke" pointer-events="stroke" data-spr-drag="${esc(opening.id)}" style="cursor:grab"/>`);continue;}
        const hinge=opening.hinge==='end'?end:start,closed=opening.hinge==='end'?start:end,sign=opening.swing==='out'?-1:1,openedPoint=[hinge[0]+nx*Number(opening.width)*sign,hinge[1]+ny*Number(opening.width)*sign],hp=sy(hinge),op=sy(openedPoint),angle=Math.atan2(closed[1]-hinge[1],closed[0]-hinge[0]),target=Math.atan2(openedPoint[1]-hinge[1],openedPoint[0]-hinge[0]);let delta=target-angle;while(delta>Math.PI)delta-=Math.PI*2;while(delta<-Math.PI)delta+=Math.PI*2;
        const arc=[];for(let step=0;step<=16;step++){const t=angle+delta*step/16;arc.push(pt([hinge[0]+Math.cos(t)*Number(opening.width),hinge[1]+Math.sin(t)*Number(opening.width)]));}
        items.push(`<polyline points="${arc.join(' ')}" fill="none" stroke="#b18c62" stroke-width="${stroke*.25}" stroke-dasharray="${stroke*.65} ${stroke*.4}"/><line x1="${hp[0]}" y1="${hp[1]}" x2="${op[0]}" y2="${op[1]}" stroke="#9a724d" stroke-width="${stroke*.8}" data-spr-drag="${esc(opening.id)}" style="cursor:grab"/><circle cx="${hp[0]}" cy="${hp[1]}" r="${stroke*.28}" fill="#9a724d"/><line x1="${hp[0]}" y1="${hp[1]}" x2="${op[0]}" y2="${op[1]}" stroke="transparent" stroke-width="22" vector-effect="non-scaling-stroke" pointer-events="stroke" data-spr-drag="${esc(opening.id)}" style="cursor:grab"/>`);
      }
      $('#spr-preview').innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${w+pad*2} ${d+pad*2}" role="img" aria-label="${esc(definition.name||'Oda')} duvarları, kapı ve pencereleri"><title>${esc(definition.name||'Oda')} · ${fmt(w)} × ${fmt(d)} cm</title>${items.join('')}</svg>`;
      $('#spr-preview-message').textContent=result.valid?'':(result.errors[0]||'Ölçüleri kontrol edin.');const area=(w*d-(definition.shape==='l'?definition.cutWidth*definition.cutDepth:0))/10000;$('#spr-live-area').textContent=fmt(area)+' m²';$('#spr-size-summary').textContent=fmt(w)+' × '+fmt(d)+' cm · '+fmt(area)+' m²';if(step===2)miniPreview?.render(definition);
    }
    function renderShape(){const isL=definition.shape==='l';$('#spr-cut-fields').hidden=!isL;$('#spr-cut-width').required=isL;$('#spr-cut-depth').required=isL;}
    function open(value){lastFocus=document.activeElement;editing=!!value;definition=geometry.normalize(value||{id:'custom_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6),name:'Yeni odam',shape:'rect',width:400,depth:350,height:270,cutWidth:150,cutDepth:150,cutCorner:'NE',openings:[]});definition.openings=definition.openings||[];definition.appearance=SomassRoomFinishes.normalize(definition.appearance);step=0;selectedWall=0;opened=true;host.hidden=false;setError([]);$('#spr-delete-confirm').hidden=true;$('#spr-delete').hidden=!editing||typeof options.onDelete!=='function';$('#spr-heading').textContent=editing?'Odamı düzenle':'Kendi odamı oluştur';$('#spr-save').textContent=editing?'Değişiklikleri uygula':'Odayı oluştur';$('.spr-preview-tip').textContent=editing?'Duvar üzerindeki oklar ölçüm yönünü gösterir. Değişiklikleri uyguladığınızda mevcut ürünlerin konumu korunur.':'Duvar üzerindeki oklar ölçüm yönünü gösterir. Ürünleri odayı oluşturduktan sonra katalogdan ekleyebilirsiniz.';Object.entries(fields).forEach(([id,key])=>$('#spr-'+id).value=definition[key]??'');renderShape();renderOpenings();renderDesign();setStep(0);drawPreview();$('.spr-body').scrollTop=0;$('#spr-name').focus({preventScroll:true});$('#spr-name').select();}
    function close(){if(busy)return;opened=false;host.hidden=true;if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});}
    function update(e){const el=e.target,key=el.dataset.sprKey,id=el.dataset.sprOpening;if(key&&id){const item=definition.openings.find(o=>o.id===id);if(!item)return;item[key]=['wall','offset','width','height','sill'].includes(key)?el.valueAsNumber??Number(el.value):el.value;if(el.tagName==='SELECT'&&key==='wall')item.wall=Number(el.value);}else{const field=fields[el.id?.replace('spr-','')];if(!field){if(el.id==='spr-wall-color')definition.appearance.wallColor=el.value;else if(el.id==='spr-floor-color')definition.appearance.floorColor=el.value;else if(el.id==='spr-ceiling-color')definition.appearance.ceilingColor=el.value;else if(el.id==='spr-accent-color')definition.appearance.accentColor=el.value;else if(el.id==='spr-accent-wall')definition.appearance.accentWall=Number(el.value);else if(el.id==='spr-floor-direction')definition.appearance.floorDirection=Number(el.value);else return;renderDesign(false);drawPreview();return;}definition[field]=['width','depth','height','cutWidth','cutDepth'].includes(field)?el.valueAsNumber:el.value;if(field==='shape')renderShape();if(['width','depth','shape','cutWidth','cutDepth','cutCorner'].includes(field))refreshWalls();}setError([]);drawPreview();}
    function setStep(value){step=Math.max(0,Math.min(2,Number(value)));host.querySelectorAll('[data-spr-panel]').forEach(el=>el.hidden=Number(el.dataset.sprPanel)!==step);host.querySelectorAll('[data-spr-step]').forEach(el=>{if(Number(el.dataset.sprStep)===step)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});$('#spr-prev').hidden=step===0;$('#spr-next').hidden=step===2;$('#spr-save').hidden=step!==2;$('#spr-preview').hidden=step===2;$('#spr-preview-3d').hidden=step!==2;$('.spr-legend').hidden=step===2;$('#spr-preview-heading').textContent=step===2?'Renklerin odandaki görünümü':'Canlı oda planın';$('.spr-preview-tip').textContent=step===1?'Duvara dokunarak seç. Kapı ve pencereyi sürükleyerek konumlandır.':step===2?'Bu odanın renklerini ve zeminini daha sonra da düzenleyebilirsin.':'Ölçülerin değiştikçe planın güncellenir.';$('.spr-body').scrollTop=0;if(step===2){miniPreview=miniPreview||SomassRoomFinishes.createPreview($('#spr-preview-3d'));miniPreview.render(definition);}renderWallPicker();}
    function renderWallPicker(){const ws=walls();$('#spr-wall-picker').innerHTML=ws.map(w=>`<button type="button" data-spr-wall="${w.index}" aria-pressed="${w.index===selectedWall}">${w.index+1}<small>${fmt(w.length)} cm</small></button>`).join('');}
    function renderDesign(reset=true){const a=definition.appearance,F=SomassRoomFinishes;$('#spr-wall-swatches').innerHTML=F.walls.map(([name,color])=>`<button type="button" data-spr-wall-color="${color}" title="${name}" aria-label="${name} duvar" aria-pressed="${a.wallColor===color}" style="--swatch:${color}"><i></i><span>${name}</span></button>`).join('');$('#spr-floor-types').innerHTML=F.floors.map(f=>`<button type="button" data-spr-floor="${f.id}" aria-pressed="${a.floorType===f.id}" style="--swatch:${f.color}"><i></i><span>${f.name}</span></button>`).join('');if(reset){$('#spr-wall-color').value=a.wallColor;$('#spr-floor-color').value=a.floorColor;$('#spr-ceiling-color').value=a.ceilingColor;$('#spr-accent-color').value=a.accentColor;$('#spr-floor-direction').value=String(a.floorDirection);$('#spr-accent-wall').innerHTML='<option value="-1">Yok · tüm duvarlar aynı</option>'+walls().map(w=>`<option value="${w.index}">Duvar ${w.index+1}</option>`).join('');$('#spr-accent-wall').value=String(a.accentWall);}}
    $('#spr-prev').addEventListener('click',()=>setStep(step-1));$('#spr-next').addEventListener('click',()=>{if(step===0){const check=geometry.validate({...definition,openings:[]});if(!check.valid){setError(check.errors);return;}}if(step===1){const check=validate();if(!check.valid){setError(check.errors);return;}}setError([]);setStep(step+1);});
    host.addEventListener('click',e=>{const tab=e.target.closest('[data-spr-step]');if(tab){setStep(tab.dataset.sprStep);return;}const wall=e.target.closest('[data-spr-wall]');if(wall){selectedWall=Number(wall.dataset.sprWall);renderWallPicker();drawPreview();return;}const size=e.target.closest('[data-spr-size]');if(size){const[w,d]=size.dataset.sprSize.split(',').map(Number);definition.width=w;definition.depth=d;$('#spr-width').value=w;$('#spr-depth').value=d;refreshWalls();drawPreview();return;}const color=e.target.closest('[data-spr-wall-color]');if(color){definition.appearance.wallColor=color.dataset.sprWallColor;renderDesign();drawPreview();return;}const floor=e.target.closest('[data-spr-floor]');if(floor){const f=SomassRoomFinishes.floors.find(x=>x.id===floor.dataset.sprFloor);definition.appearance.floorType=f.id;definition.appearance.floorColor=f.color;renderDesign();drawPreview();}});
    const preview=$('#spr-preview');
    const planPoint=e=>{const svg=preview.querySelector('svg');if(!svg)return null;const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(svg.getScreenCTM().inverse());return[q.x,definition.depth-q.y];};
    preview.addEventListener('pointerdown',e=>{const target=e.target.closest('[data-spr-drag]');if(!target||step!==1)return;const o=definition.openings.find(x=>x.id===target.dataset.sprDrag),w=walls()[o.wall],p=planPoint(e);if(!w||!p)return;const t=((p[0]-w.a[0])*(w.b[0]-w.a[0])+(p[1]-w.a[1])*(w.b[1]-w.a[1]))/w.length;openingDrag={pointerId:e.pointerId,id:o.id,delta:t-o.offset,wall:w};selectedWall=o.wall;preview.setPointerCapture(e.pointerId);e.preventDefault();});
    preview.addEventListener('pointermove',e=>{if(!openingDrag||e.pointerId!==openingDrag.pointerId)return;const p=planPoint(e),o=definition.openings.find(x=>x.id===openingDrag.id),w=openingDrag.wall;if(!p||!o)return;const t=((p[0]-w.a[0])*(w.b[0]-w.a[0])+(p[1]-w.a[1])*(w.b[1]-w.a[1]))/w.length;o.offset=Math.round(Math.max(0,Math.min(w.length-o.width,t-openingDrag.delta)));const field=host.querySelector(`[data-spr-opening="${o.id}"][data-spr-key="offset"]`);if(field)field.value=o.offset;drawPreview();e.preventDefault();});
    const finishOpening=e=>{if(openingDrag?.pointerId!==e.pointerId)return;openingDrag=null;if(preview.hasPointerCapture(e.pointerId))preview.releasePointerCapture(e.pointerId);drawPreview();};preview.addEventListener('pointerup',finishOpening);preview.addEventListener('pointercancel',finishOpening);
    $('#spr-form').addEventListener('input',update);$('#spr-form').addEventListener('change',e=>{if(e.target.tagName==='SELECT')update(e);});
    function findOpeningSpot(type){
      const desiredWidth=type==='door'?90:120,ws=walls().filter(w=>Number.isFinite(w.length)&&w.length>0),preferred=[selectedWall,...(type==='window'?[2,0]:[0])];
      const ordered=[...preferred.map(index=>ws.find(w=>w.index===index)).filter(Boolean),...ws.filter(w=>!preferred.includes(w.index))],gaps=[];
      for(const wall of ordered){const occupied=definition.openings.filter(o=>Number(o.wall)===wall.index&&Number.isFinite(Number(o.offset))&&Number.isFinite(Number(o.width))).map(o=>[Math.max(0,Number(o.offset)-5),Math.min(wall.length,Number(o.offset)+Number(o.width)+5)]).filter(pair=>pair[1]>pair[0]).sort((a,b)=>a[0]-b[0]);let cursor=0;
        for(const pair of occupied){if(pair[0]>cursor)gaps.push({wall:wall.index,start:cursor,end:pair[0]});cursor=Math.max(cursor,pair[1]);}
        if(cursor<wall.length)gaps.push({wall:wall.index,start:cursor,end:wall.length});
      }
      const full=gaps.find(gap=>gap.end-gap.start>=desiredWidth),gap=full||gaps.filter(gap=>gap.end-gap.start>=30).sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0];
      if(gap){const width=Math.min(desiredWidth,Math.floor((gap.end-gap.start)*10)/10);return {wall:gap.wall,offset:Math.round((gap.start+(gap.end-gap.start-width)/2)*10)/10,width};}
      const wall=ordered.slice().sort((a,b)=>b.length-a.length)[0],width=Math.min(desiredWidth,wall?.length||desiredWidth);return {wall:wall?.index||0,offset:wall?Math.max(0,(wall.length-width)/2):0,width};
    }
    function addOpening(type){const spot=findOpeningSpot(type);definition.openings.push({id:'opening_'+Date.now().toString(36)+'_'+(++sequence),type,...spot,height:type==='door'?Math.min(210,definition.height):Math.min(120,definition.height-90),sill:type==='door'?0:90,hinge:'start',swing:'in'});setError([]);renderOpenings();drawPreview();const list=$('#spr-openings');list.lastElementChild?.querySelector('select')?.focus({preventScroll:true});if(!global.matchMedia?.('(max-width:780px)').matches)list.lastElementChild?.scrollIntoView({block:'nearest',behavior:'smooth'});else $('.spr-body').scrollTop=0;}
    $('#spr-add-door').addEventListener('click',()=>addOpening('door'));$('#spr-add-window').addEventListener('click',()=>addOpening('window'));
    host.addEventListener('click',e=>{if(e.target.closest('[data-spr-close]')){close();return;}const remove=e.target.closest('[data-spr-remove]');if(remove){definition.openings=definition.openings.filter(o=>o.id!==remove.dataset.sprRemove);setError([]);renderOpenings();drawPreview();}});
    $('#spr-form').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;const bad=[...host.querySelectorAll('input[required]')].find(el=>!el.checkValidity());if(bad){setStep(bad.closest('[data-spr-panel]')?Number(bad.closest('[data-spr-panel]').dataset.sprPanel):0);bad.reportValidity();return;}definition.name=String(definition.name||'').trim();if(!definition.name){setError(['Odanıza bir ad verin.']);$('#spr-name').focus();return;}const result=validate();if(!result.valid){setError(result.errors.length?result.errors:['Oda ölçülerini kontrol edin.']);$('#spr-error').focus({preventScroll:true});return;}busy=true;$('#spr-save').disabled=true;try{const saved=await options.onSave(result.definition);if(saved?.ok===false)setError([saved.message||'Oda kaydedilemedi.']);else{busy=false;close();}}catch(error){setError([error.message||'Oda kaydedilemedi. Lütfen tekrar deneyin.']);}finally{busy=false;$('#spr-save').disabled=false;}});
    $('#spr-delete').addEventListener('click',()=>{$('#spr-delete').hidden=true;$('#spr-delete-confirm').hidden=false;$('#spr-delete-cancel').focus();});$('#spr-delete-cancel').addEventListener('click',()=>{$('#spr-delete-confirm').hidden=true;$('#spr-delete').hidden=false;$('#spr-delete').focus();});
    $('#spr-delete-yes').addEventListener('click',async()=>{if(busy||!options.onDelete)return;busy=true;$('#spr-delete-yes').disabled=true;try{const deleted=await options.onDelete(definition.id);if(deleted?.ok===false)setError([deleted.message||'Oda silinemedi.']);else{busy=false;close();}}catch(error){setError([error.message||'Oda silinemedi.']);}finally{busy=false;$('#spr-delete-yes').disabled=false;}});
    host.addEventListener('keydown',e=>{if(!opened)return;if(e.key==='Escape'){e.stopPropagation();e.preventDefault();close();return;}if(e.key==='Tab'){const focusables=[...host.querySelectorAll('button,input,select,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length),first=focusables[0],last=focusables[focusables.length-1];if(!first)return;if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
    return {open,close,isOpen:()=>opened};
  }
})(typeof window!=='undefined'?window:globalThis);

/* Product configurator controls. All data remains in the existing room state. */
(function(global){'use strict';
function create(options){const root=options.root,F=global.SomassRoomFinishes,esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const button=document.createElement('button');button.type='button';button.id='sp-room-style';button.textContent='Duvar ve zemin';root.querySelector('.sp-filebar').appendChild(button);
 const aside=root.querySelector('.sp-aside');aside.insertAdjacentHTML('afterbegin','<div class="sp-mobile-panel-head"><h3>Odadaki ürünler</h3><button type="button" data-config-close aria-label="Ürün panelini kapat">×</button></div>');
 const nav=document.createElement('nav');nav.className='sp-mobile-nav';nav.setAttribute('aria-label','Oda tasarım araçları');nav.innerHTML='<button type="button" data-config-action="catalog"><b>＋</b>Ürün ekle</button><button type="button" data-config-action="room"><b>▱</b>Oda ölçüsü</button><button type="button" data-config-action="style"><b>◐</b>Duvar / zemin</button><button type="button" data-config-action="products"><b>▦</b>Ürünlerim</button>';root.appendChild(nav);
 const curtain=document.createElement('button');curtain.type='button';curtain.className='sp-mobile-curtain';curtain.setAttribute('aria-label','Ürün panelini kapat');curtain.hidden=true;root.appendChild(curtain);
 const style=document.createElement('section');style.className='sp-style-dialog';style.hidden=true;style.setAttribute('role','dialog');style.setAttribute('aria-modal','true');style.setAttribute('aria-labelledby','sp-style-title');style.innerHTML=`<div class="sp-style-backdrop" data-style-close></div><div class="sp-style-card"><header><div><small>ROOM STUDIO</small><h2 id="sp-style-title">Duvar ve zemin</h2></div><button type="button" data-style-close aria-label="Renk panelini kapat">×</button></header><div class="sp-style-body"><h3>Duvar rengi</h3><div class="spr-swatches">${F.walls.map(([name,color])=>`<button type="button" data-wall="${color}" aria-label="${name} duvar" style="--swatch:${color}"><i></i><span>${name}</span></button>`).join('')}</div><label class="spr-custom-color">Özel duvar rengi<input type="color" id="sp-style-wall" aria-label="Odanın özel duvar rengi"></label><h3>Zemin</h3><div class="spr-floor-types">${F.floors.map(f=>`<button type="button" data-floor="${f.id}" style="--swatch:${f.color}"><i></i><span>${f.name}</span></button>`).join('')}</div><label class="spr-custom-color">Zemin tonu<input type="color" id="sp-style-floor" aria-label="Odanın zemin rengi"></label><label class="spr-field">Döşeme yönü<select id="sp-style-direction"><option value="0">Boyuna</option><option value="90">Enine</option></select></label><details><summary>Vurgu duvarı ve tavan</summary><label class="spr-field">Vurgu duvarı<select id="sp-style-accent"></select></label><label class="spr-custom-color">Vurgu rengi<input type="color" id="sp-style-accent-color" aria-label="Odanın vurgu rengi"></label><label class="spr-custom-color">Tavan ve süpürgelik<input type="color" id="sp-style-ceiling" aria-label="Odanın tavan rengi"></label></details></div><footer><span>Değişiklikler odana anında uygulanır.</span><button type="button" data-style-close>Tamam</button></footer></div>`;root.appendChild(style);
 let appearance=F.normalize(),returnFocus=null;const $=s=>style.querySelector(s);
 function closeStyle(){style.hidden=true;returnFocus?.focus({preventScroll:true});}
 function refresh(){$('#sp-style-wall').value=appearance.wallColor;$('#sp-style-floor').value=appearance.floorColor;$('#sp-style-direction').value=String(appearance.floorDirection);$('#sp-style-accent-color').value=appearance.accentColor;$('#sp-style-ceiling').value=appearance.ceilingColor;style.querySelectorAll('[data-wall]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.wall===appearance.wallColor)));style.querySelectorAll('[data-floor]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.floor===appearance.floorType)));}
 function apply(){appearance=F.normalize(appearance);options.onAppearance({...appearance});refresh();}
 function openStyle(){returnFocus=document.activeElement;appearance=F.normalize(options.getRoom()?.appearance);const r=options.getRoom();$('#sp-style-accent').innerHTML='<option value="-1">Yok · tüm duvarlar aynı</option>'+(r?.poly||[]).map((_,i)=>`<option value="${i}">Duvar ${i+1}</option>`).join('');$('#sp-style-accent').value=String(appearance.accentWall);refresh();style.hidden=false;$('#sp-style-wall').focus({preventScroll:true});}
 function closeProducts(){root.classList.remove('sp-mobile-products-open');curtain.hidden=true;}
 function products(){root.classList.toggle('sp-mobile-products-open');curtain.hidden=!root.classList.contains('sp-mobile-products-open');}
 root.addEventListener('somass:product-selected',e=>{if(e.detail?.key&&global.matchMedia?.('(max-width:850px)').matches){root.classList.add('sp-mobile-products-open');curtain.hidden=false;}});
 button.addEventListener('click',openStyle);curtain.addEventListener('click',closeProducts);aside.querySelector('[data-config-close]').addEventListener('click',closeProducts);
 nav.addEventListener('click',e=>{const action=e.target.closest('[data-config-action]')?.dataset.configAction;if(action==='catalog'){closeProducts();options.openCatalog();}if(action==='style')openStyle();if(action==='products')products();if(action==='room'){closeProducts();options.editRoom();}});
 style.addEventListener('click',e=>{if(e.target.closest('[data-style-close]')){closeStyle();return;}const w=e.target.closest('[data-wall]'),f=e.target.closest('[data-floor]');if(w){appearance.wallColor=w.dataset.wall;apply();}if(f){const floor=F.floors.find(x=>x.id===f.dataset.floor);appearance.floorType=floor.id;appearance.floorColor=floor.color;apply();}});
 style.addEventListener('input',e=>{const id=e.target.id,k={'sp-style-wall':'wallColor','sp-style-floor':'floorColor','sp-style-direction':'floorDirection','sp-style-accent':'accentWall','sp-style-accent-color':'accentColor','sp-style-ceiling':'ceilingColor'}[id];if(k){appearance[k]=['floorDirection','accentWall'].includes(k)?Number(e.target.value):e.target.value;apply();}});
 style.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();closeStyle();}if(e.key==='Tab'){const els=[...style.querySelectorAll('button,input,select,summary')].filter(x=>x.getClientRects().length),first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 return{openStyle,closeProducts};
}
global.SomassConfiguratorUI={create};
})(typeof window!=='undefined'?window:globalThis);

/* Private browser records. Customer names and layouts never enter site files. */
(function (global) {
  'use strict';
  const DB_NAME = 'somass-room-planner-customers-v1';
  const STORE = 'customers';
  const MAX_SNAPSHOT_BYTES = 2000000;
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  function fail(code, message, cause) {
    const error = new Error(message);
    error.code = code;
    if (cause) error.cause = cause;
    return error;
  }
  function storageError(cause) {
    if (cause?.code && ['conflict', 'not-found', 'archived', 'validation', 'closed'].includes(cause.code)) return cause;
    if (cause?.name === 'QuotaExceededError') return fail('storage', 'Kayıt alanı dolu. Değişiklikler kaydedilemedi.', cause);
    return fail('storage', 'Müşteri kaydı tamamlanamadı. Tarayıcı kayıt iznini kontrol edip yeniden deneyin.', cause);
  }
  function nameOf(value) {
    if (typeof value !== 'string') throw fail('validation', 'Müşteri adını yazın.');
    const name = value.trim().replace(/\s+/g, ' ');
    if (!name || name.length > 100) throw fail('validation', 'Müşteri adı 1–100 karakter olmalı.');
    return name;
  }
  function snapshotOf(value, validateSnapshot) {
    let source;
    try {
      const json = JSON.stringify(value);
      const bytes = json && global.TextEncoder ? new global.TextEncoder().encode(json).byteLength : json?.length;
      if (!json || bytes > MAX_SNAPSHOT_BYTES) throw new Error('size');
      source = JSON.parse(json);
    } catch (cause) { throw fail('validation', 'Oda kaydı geçersiz veya çok büyük.', cause); }
    const model = source?.modelContent || source;
    const privateContent = source?.privateContent || {};
    if (model?.version !== 15 || !Array.isArray(model.customRooms) || model.customRooms.length > 8 || !model.layouts || !model.variants) {
      throw fail('validation', 'Güncel oda düzeni bulunamadı. En fazla 8 oda kaydedebilirsiniz.');
    }
    const ids = new Set();
    const customRooms = model.customRooms.map(input => {
      let definition = input;
      if (global.SomassCustomRooms?.validate) {
        const check = global.SomassCustomRooms.validate(input);
        if (!check.valid) throw fail('validation', check.errors.join(' '));
        definition = check.definition;
      }
      if (!definition || typeof definition.id !== 'string' || !/^custom_[a-zA-Z0-9_-]{1,73}$/.test(definition.id) || ids.has(definition.id)) {
        throw fail('validation', 'Oda kimliği geçersiz veya yineleniyor.');
      }
      if (typeof definition.name !== 'string' || !definition.name.trim() || definition.name.length > 50) {
        throw fail('validation', 'Oda adı 1–50 karakter olmalı.');
      }
      ids.add(definition.id);
      // Only room definitions belong here; archived supplier/client rooms are
      // deliberately absent from every customer snapshot.
      return copy(definition);
    });
    const layouts = {}, variants = {}, roomStyles = {};
    for (const id of ids) {
      const list = model.layouts[id];
      if (!Array.isArray(list) || list.length > 35) throw fail('validation', 'Odadaki ürün listesi geçersiz.');
      const keys = new Set();
      layouts[id] = list.map(item => {
        if (!item || typeof item.key !== 'string' || !item.key || item.key.length > 80 || keys.has(item.key) ||
            typeof item.p !== 'string' || !item.p || item.p.length > 160 || !['N', 'E', 'S', 'W'].includes(item.head) ||
            ![item.x, item.y].every(number => typeof number === 'number' && Number.isFinite(number) && Math.abs(number) <= 10000)) {
          throw fail('validation', 'Ürün veya konumu geçersiz.');
        }
        keys.add(item.key);
        return copy(item);
      });
      if (!['custom', 'room_empty'].includes(model.variants[id])) throw fail('validation', 'Oda yerleşim seçeneği geçersiz.');
      variants[id] = model.variants[id];
      if (model.roomStyles && own(model.roomStyles, id)) roomStyles[id] = copy(model.roomStyles[id]);
    }
    const snapshot = {
      modelContent: {
        version: 15,
        finish: typeof model.finish === 'string' ? model.finish : 'Natürel Meşe',
        room: ids.has(model.room) ? model.room : customRooms[0]?.id || null,
        customRooms, layouts, variants, roomStyles
      },
      privateContent: {
        dims: privateContent.dims !== false,
        labels: privateContent.labels !== false,
        openings: privateContent.openings === true,
        raw: privateContent.raw === true,
        zoom: Number.isFinite(privateContent.zoom) ? Math.max(.65, Math.min(2.5, privateContent.zoom)) : 1,
        wardBudget: privateContent.wardBudget !== false
      }
    };
    if (typeof validateSnapshot === 'function') {
      try { validateSnapshot(copy(snapshot)); }
      catch (cause) { throw fail('validation', cause.message || 'Oda düzeni geçersiz.', cause); }
    }
    return snapshot;
  }
  function summary(record) {
    return {
      id: record.id, name: record.name, revision: record.revision,
      createdAt: record.createdAt, updatedAt: record.updatedAt, archivedAt: record.archivedAt,
      roomCount: record.snapshot.modelContent.customRooms.length,
      rooms: record.snapshot.modelContent.customRooms.map(room => ({id: room.id, name: room.name}))
    };
  }
  function full(record) { return record ? {...summary(record), snapshot: copy(record.snapshot)} : null; }
  function customerId() {
    return 'customer_' + (global.crypto?.randomUUID ? global.crypto.randomUUID() : Date.now().toString(36) + '_' + Math.random().toString(36).slice(2));
  }
  function idOf(id) {
    if (typeof id !== 'string' || !/^customer_[a-zA-Z0-9_-]{1,100}$/.test(id)) throw fail('validation', 'Müşteri kaydı seçin.');
    return id;
  }
  function revisionOf(revision) {
    if (!Number.isSafeInteger(revision) || revision < 1) throw fail('conflict', 'Kayıt değişmiş olabilir. Müşteriyi yeniden açıp deneyin.');
    return revision;
  }
  async function create(options = {}) {
    const indexedDB = options.indexedDB || global.indexedDB;
    const dbName = options.dbName || DB_NAME;
    if (!indexedDB?.open) throw fail('unavailable', 'Bu tarayıcı müşteri kayıtlarını saklayamıyor. Normal bir tarayıcı penceresinde yeniden açın.');
    const db = await new Promise((resolve, reject) => {
      let open, settled = false;
      try { open = indexedDB.open(dbName, 1); }
      catch (cause) { reject(storageError(cause)); return; }
      open.onupgradeneeded = () => {
        const database = open.result;
        if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, {keyPath: 'id'});
      };
      open.onblocked = () => {
        settled = true;
        reject(fail('blocked', 'Kayıt alanı başka bir sekmede açık. Diğer planlayıcı sekmesini kapatıp yeniden deneyin.'));
      };
      open.onerror = () => { settled = true; reject(storageError(open.error)); };
      open.onsuccess = () => { if (settled) open.result.close(); else { settled = true; resolve(open.result); } };
    });
    let closed = false, channel = null;
    const subscribers = new Set();
    const noticeKey = 'somass-customer-notice:' + dbName;
    const emit = notice => { for (const callback of subscribers) { try { callback(copy(notice)); } catch (_) {} } };
    try {
      const Channel = options.BroadcastChannel === null ? null : options.BroadcastChannel || global.BroadcastChannel;
      if (Channel) {
        channel = new Channel('somass-customers:' + dbName);
        channel.onmessage = event => {
          if (event.data?.type === 'customers-changed' && event.data.dbName === dbName) emit(event.data);
        };
      }
    } catch (_) { channel = null; }
    const onStorage = event => {
      if (event.key !== noticeKey || !event.newValue) return;
      try { const notice = JSON.parse(event.newValue); if (notice.dbName === dbName) emit(notice); } catch (_) {}
    };
    if (!channel) global.addEventListener?.('storage', onStorage);
    function notify(record) {
      const notice = {type: 'customers-changed', dbName, id: record.id, revision: record.revision};
      emit(notice);
      try {
        if (channel) channel.postMessage(notice);
        else { global.localStorage?.setItem(noticeKey, JSON.stringify(notice)); global.localStorage?.removeItem(noticeKey); }
      } catch (_) {} // Notifications are best effort; the committed record is durable.
    }
    function transact(mode, operation) {
      if (closed) return Promise.reject(fail('closed', 'Müşteri kayıt alanı kapandı. Sayfayı yeniden açın.'));
      return new Promise((resolve, reject) => {
        let transaction, result, resultSet = false, failure = null;
        try { transaction = db.transaction(STORE, mode); }
        catch (cause) { reject(storageError(cause)); return; }
        const setResult = value => { result = value; resultSet = true; };
        const abort = error => { failure = error; try { transaction.abort(); } catch (_) { reject(error); } };
        transaction.oncomplete = () => {
          if (resultSet) resolve(result);
          else reject(failure || storageError(new Error('Incomplete transaction')));
        };
        transaction.onerror = () => { failure = failure || storageError(transaction.error); };
        transaction.onabort = () => reject(failure || storageError(transaction.error));
        try { operation(transaction.objectStore(STORE), setResult, abort); }
        catch (error) { abort(error.code ? error : storageError(error)); }
      });
    }
    async function change({id, expectedRevision}, transform) {
      idOf(id); revisionOf(expectedRevision);
      const record = await transact('readwrite', (store, done, abort) => {
        const request = store.get(id);
        request.onsuccess = () => {
          const previous = request.result;
          if (!previous) { abort(fail('not-found', 'Müşteri kaydı bulunamadı.')); return; }
          if (previous.revision !== expectedRevision) { abort(fail('conflict', 'Bu kayıt başka bir sekmede değişti. Son kaydı açıp yeniden deneyin.')); return; }
          try {
            const next = transform(copy(previous));
            next.revision = previous.revision + 1;
            next.updatedAt = new Date().toISOString();
            const write = store.put(next);
            write.onsuccess = () => done(next);
          } catch (error) { abort(error.code ? error : storageError(error)); }
        };
      });
      notify(record);
      return full(record);
    }
    db.onversionchange = () => {
      closed = true; db.close(); channel?.close(); global.removeEventListener?.('storage', onStorage);
      emit({type: 'closed', dbName}); subscribers.clear();
    };
    return {
      async list({includeArchived = false} = {}) {
        const records = await transact('readonly', (store, done) => { const request = store.getAll(); request.onsuccess = () => done(request.result); });
        return records.filter(record => includeArchived || !record.archivedAt)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name, 'tr'))
          .map(summary);
      },
      async get(id) {
        idOf(id);
        return full(await transact('readonly', (store, done) => { const request = store.get(id); request.onsuccess = () => done(request.result || null); }));
      },
      async create({name, snapshot}) {
        const timestamp = new Date().toISOString();
        const record = {id: customerId(), name: nameOf(name), revision: 1, createdAt: timestamp, updatedAt: timestamp, archivedAt: null, snapshot: snapshotOf(snapshot, options.validateSnapshot)};
        await transact('readwrite', (store, done) => { const request = store.add(record); request.onsuccess = () => done(record); });
        notify(record);
        return full(record);
      },
      async update({id, name, snapshot, expectedRevision}) {
        const nextName = name === undefined ? undefined : nameOf(name);
        const nextSnapshot = snapshotOf(snapshot, options.validateSnapshot);
        return change({id, expectedRevision}, record => {
          if (record.archivedAt) throw fail('archived', 'Bu müşteri arşivde. Düzenlemek için önce geri alın.');
          if (nextName !== undefined) record.name = nextName;
          record.snapshot = nextSnapshot;
          return record;
        });
      },
      async archive({id, expectedRevision}) {
        return change({id, expectedRevision}, record => {
          if (record.archivedAt) throw fail('archived', 'Bu müşteri zaten arşivde.');
          record.archivedAt = new Date().toISOString();
          return record;
        });
      },
      async restoreArchive({id, expectedRevision}) {
        return change({id, expectedRevision}, record => { record.archivedAt = null; return record; });
      },
      subscribe(callback) { if (typeof callback !== 'function') throw new TypeError('Callback required'); subscribers.add(callback); return () => subscribers.delete(callback); },
      close() { if (closed) return; closed = true; db.close(); channel?.close(); global.removeEventListener?.('storage', onStorage); subscribers.clear(); }
    };
  }
  global.SomassCustomerStore = Object.freeze({create, sanitizeSnapshot: snapshotOf, defaultDatabaseName: DB_NAME});
})(typeof window !== 'undefined' ? window : globalThis);

/* Private account-scoped cloud records. Inject the official Supabase client.
 * No API keys, customer data, IndexedDB migration, or implicit local fallback.
 * SDK contract: auth.getSession/getUser/onAuthStateChange and PostgREST
 * .setHeader(), documented by supabase/supabase-js PostgrestBuilder.
 */
(function (global) {
  'use strict';
  const TABLE = 'somass_customers', PAGE = 500, MAX_RECORDS = 10000;
  const SELECT = 'id,owner_id,name,revision,created_at,updated_at,archived_at';
  const MAX_BYTES = 2000000, ID = /^customer_[a-zA-Z0-9_-]{1,100}$/;
  const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  const internalErrors = new WeakSet();
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  function fail(code, message) { const error = new Error(message); error.code = code; internalErrors.add(error); return error; }
  function mapped(error) {
    if (error && typeof error === 'object' && internalErrors.has(error)) return error;
    const code = String(error?.code || ''), status = Number(error?.status || 0);
    if (['PT401','42501','PGRST301','PGRST302','bad_jwt','session_not_found','refresh_token_not_found','user_banned'].includes(code) || status === 401 || status === 403) return fail('auth', 'Bulut kaydı için hesabınıza yeniden giriş yapın.');
    if (code === 'PT404' || code === 'PGRST116') return fail('not-found', 'Müşteri kaydı bulunamadı.');
    if (code === 'PT409' || code === '23505') return /archived/i.test(String(error.message || '') + ' ' + String(error.details || ''))
      ? fail('archived', 'Bu müşteri arşivde. Düzenlemek için önce geri alın.')
      : fail('conflict', 'Bu müşteri başka bir cihazda değişmiş olabilir. Son kaydı yeniden açın.');
    if (code === 'PT422' || code === '23514' || code === '22023') return fail('validation', 'Müşteri veya oda bilgileri geçersiz.');
    return fail('unavailable', 'Bulut kaydı doğrulanamadı. Çalışmanızı açık tutup bağlantı sağlanınca yeniden deneyin.');
  }
  function nameOf(value) {
    if (typeof value !== 'string') throw fail('validation', 'Müşteri adını yazın.');
    const name = value.trim().replace(/\s+/g, ' ');
    if (!name || name.length > 100) throw fail('validation', 'Müşteri adı 1–100 karakter olmalı.');
    return name;
  }
  function idOf(value) { if (typeof value !== 'string' || !ID.test(value)) throw fail('validation', 'Müşteri kaydı seçin.'); return value; }
  function revisionOf(value) {
    const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
    if (!Number.isSafeInteger(number) || number < 1) throw fail('conflict', 'Kayıt sürümü geçersiz. Müşteriyi yeniden açın.');
    return number;
  }
  function dateOf(value, nullable) {
    if (nullable && value === null) return null;
    if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw fail('unavailable', 'Bulut kaydının tarih bilgisi doğrulanamadı.');
    return new Date(value).toISOString();
  }
  async function create(options = {}) {
    const client = options.supabaseClient, sanitize = options.localSanitizer || global.SomassCustomerStore?.sanitizeSnapshot;
    if (!client?.auth?.getSession || !client.auth.getUser || !client.auth.onAuthStateChange || !client.from || !client.rpc || typeof sanitize !== 'function') {
      throw fail('unavailable', 'Bulut kayıt bağlantısı henüz hazır değil.');
    }
    let project = options.projectRef;
    if (!project && client.supabaseUrl) { try { project = new URL(client.supabaseUrl).hostname; } catch (_) {} }
    if (typeof project !== 'string' || !/^[a-zA-Z0-9.-]{4,100}$/.test(project)) throw fail('unavailable', 'Bulut projesi doğrulanamadı.');
    let closed = false, closeCode = 'closed', epoch = 0, ownerId = null, subscription;
    const subscribers = new Set(), requests = new Set();
    function assertOpen(context) {
      if (closed) throw fail(closeCode, closeCode === 'account-changed' ? 'Hesap değişti. Bu hesaba ait müşteri listesini yeniden açın.' : closeCode === 'auth' ? 'Bulut kaydı için hesabınıza giriş yapın.' : 'Müşteri kayıt alanı kapandı. Sayfayı yeniden açın.');
      if (context && (context.epoch !== epoch || context.ownerId !== ownerId)) throw fail('account-changed', 'Hesap değişti. Bu hesaba ait müşteri listesini yeniden açın.');
    }
    function emit(notice) { for (const callback of subscribers) { try { callback(clone(notice)); } catch (_) {} } }
    function close(code = 'closed') {
      if (closed) return;
      closed = true; closeCode = code; epoch++;
      for (const request of requests) request.abort();
      requests.clear(); subscription?.unsubscribe();
      emit({type:'closed', storage:'supabase', reason:code, ownerId}); subscribers.clear();
    }
    async function session() {
      assertOpen();
      let result;
      try { result = await client.auth.getSession(); } catch (error) { throw mapped(error); }
      assertOpen();
      if (result?.error) throw mapped(result.error);
      const value = result?.data?.session;
      if (!value?.access_token || !UUID.test(String(value?.user?.id || '')) || value.user.is_anonymous === true) throw fail('auth', 'Müşteri kayıtları için hesabınıza giriş yapın.');
      return value;
    }
    async function authorize() {
      const value = await session(), context = {epoch, ownerId:value.user.id, token:value.access_token};
      let result;
      try { result = await client.auth.getUser(context.token); } catch (error) { throw mapped(error); }
      assertOpen();
      if (result?.error) throw mapped(result.error);
      const user = result?.data?.user;
      if (!user || user.is_anonymous === true || user.id !== context.ownerId) throw fail('auth', 'Bulut oturumu doğrulanamadı. Yeniden giriş yapın.');
      if (ownerId && ownerId !== user.id) { close('account-changed'); assertOpen(); }
      ownerId = user.id; context.epoch = epoch;
      return context;
    }
    async function stillCurrent(context) {
      assertOpen(context);
      const current = await session();
      if (current.user.id !== context.ownerId) { close('account-changed'); assertOpen(); }
      assertOpen(context);
    }
    async function request(context, builder) {
      assertOpen(context);
      if (!builder?.setHeader) throw fail('unavailable', 'Bulut bağlantısı güvenli hesap sabitlemesini desteklemiyor.');
      // Capture the verified JWT per request. A shared SDK's account can change
      // while its asynchronous fetch handler is choosing an Authorization header.
      builder = builder.setHeader('Authorization', 'Bearer ' + context.token);
      const abort = global.AbortController ? new global.AbortController() : null;
      if (abort && builder.abortSignal) { requests.add(abort); builder = builder.abortSignal(abort.signal); }
      let response;
      try { response = await builder; }
      catch (error) { assertOpen(context); throw mapped(error); }
      finally { if (abort) requests.delete(abort); }
      await stillCurrent(context);
      if (response?.error) throw mapped({...response.error, status:response.status || response.error.status});
      if (!response || !Object.prototype.hasOwnProperty.call(response, 'data')) throw fail('unavailable', 'Bulut yanıtı doğrulanamadı.');
      return response.data;
    }
    function snapshotOf(value) {
      function limited(input) {
        let json;
        try { json = JSON.stringify(input); } catch (_) { throw fail('validation', 'Oda kaydı geçersiz veya çok büyük.'); }
        const bytes = json && global.TextEncoder ? new global.TextEncoder().encode(json).byteLength : json?.length;
        if (!json || bytes > MAX_BYTES) throw fail('validation', 'Oda kaydı geçersiz veya çok büyük.');
        return JSON.parse(json);
      }
      const source = limited(value);
      try { return limited(sanitize(source, options.validateSnapshot)); }
      catch (error) { if (error.code === 'validation') throw error; throw fail('validation', 'Oda kaydı geçersiz veya çok büyük.'); }
    }
    function recordOf(row, full) {
      if (!row || row.owner_id !== ownerId) throw fail('auth', 'Müşteri kaydının hesabı doğrulanamadı.');
      const snapshot = full ? snapshotOf(row.snapshot) : null;
      const rooms = full ? snapshot.modelContent.customRooms : row.rooms;
      if (!Array.isArray(rooms) || rooms.length > 8) throw fail('unavailable', 'Müşterinin oda listesi doğrulanamadı.');
      const seen = new Set(), mappedRooms = rooms.map(room => {
        if (!room || typeof room.id !== 'string' || !/^custom_[a-zA-Z0-9_-]{1,73}$/.test(room.id) || seen.has(room.id) || typeof room.name !== 'string' || !room.name.trim() || room.name.length > 50) throw fail('unavailable', 'Müşterinin oda listesi doğrulanamadı.');
        seen.add(room.id); return {id:room.id,name:room.name};
      });
      const result = {id:idOf(row.id),name:nameOf(row.name),revision:revisionOf(row.revision),createdAt:dateOf(row.created_at),updatedAt:dateOf(row.updated_at),archivedAt:dateOf(row.archived_at,true),roomCount:mappedRooms.length,rooms:mappedRooms};
      if (full) result.snapshot = snapshot;
      return result;
    }
    function notify(record) { emit({type:'customers-changed',storage:'supabase',ownerId,id:record.id,revision:record.revision}); }
    function one(data) { if (!Array.isArray(data) || data.length !== 1) throw fail('unavailable', 'Kaydedilen müşteri doğrulanamadı.'); return recordOf(data[0],true); }
    async function mutation(context, name, args) { return one(await request(context,client.rpc(name,args))); }
    async function createWithId({id,name,snapshot}) {
      idOf(id); const cleanName = nameOf(name), cleanSnapshot = snapshotOf(snapshot), context = await authorize();
      const args = {p_id:id,p_name:cleanName,p_snapshot:cleanSnapshot};
      let record;
      try { record = await mutation(context,'somass_customer_create',args); }
      catch (error) {
        if (error.code !== 'unavailable') throw error;
        // The create RPC must replay an identical existing ID and payload. This
        // handles a committed write whose first response was lost, without IDs
        // being regenerated and duplicate customer rows appearing.
        await stillCurrent(context);
        record = await mutation(context,'somass_customer_create',args);
      }
      notify(record); return record;
    }
    await authorize();
    const result = client.auth.onAuthStateChange((event,value) => {
      if (closed) return;
      if (event === 'SIGNED_OUT' || (event !== 'INITIAL_SESSION' && !value?.user?.id)) close('auth');
      else if (value?.user?.id && value.user.id !== ownerId) close('account-changed');
    });
    subscription = result?.data?.subscription;
    if (!subscription?.unsubscribe) { close(); throw fail('unavailable', 'Bulut oturum takibi hazır değil.'); }
    if (closed) { subscription.unsubscribe(); assertOpen(); }
    try { await stillCurrent({epoch,ownerId}); } catch (error) { close(error.code === 'account-changed' ? 'account-changed' : 'auth'); throw error; }
    return Object.freeze({
      identity:Object.freeze({storage:'supabase',ownerId,projectRef:project,namespace:'somass-cloud:'+project+':'+ownerId}),
      async list({includeArchived=false}={}) {
        const context = await authorize(), result = new Map();
        for (let start=0;start<MAX_RECORDS;start+=PAGE) {
          let query = client.from(TABLE).select(SELECT+',rooms:snapshot->modelContent->customRooms').eq('owner_id',ownerId);
          if (!includeArchived) query=query.is('archived_at',null);
          query=query.order('updated_at',{ascending:false}).order('name',{ascending:true}).order('id',{ascending:true}).range(start,start+PAGE-1);
          const data=await request(context,query);
          if (!Array.isArray(data) || data.length>PAGE) throw fail('unavailable','Bulut müşteri listesi doğrulanamadı.');
          for (const row of data) { const item=recordOf(row,false),prior=result.get(item.id);if(!prior||prior.revision<item.revision)result.set(item.id,item); }
          if(data.length<PAGE)return Array.from(result.values()).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.name.localeCompare(b.name,'tr'));
        }
        throw fail('unavailable','Müşteri listesi çok büyük. Listeyi daraltarak yeniden deneyin.');
      },
      async get(id) {
        idOf(id); const context=await authorize();
        const data=await request(context,client.from(TABLE).select(SELECT+',snapshot').eq('owner_id',ownerId).eq('id',id).maybeSingle());
        return data===null?null:recordOf(data,true);
      },
      async create({name,snapshot}) {
        if(!global.crypto?.randomUUID)throw fail('unavailable','Yeni müşteri kimliği oluşturulamıyor. Güncel ve güvenli bir tarayıcı kullanın.');
        return createWithId({id:'customer_'+global.crypto.randomUUID(),name,snapshot});
      },
      // Only an explicit UI import action should call this; the adapter never
      // reads or deletes browser records and never initiates automatic upload.
      async importCustomer({id,name,snapshot}) { return createWithId({id,name,snapshot}); },
      async update({id,name,snapshot,expectedRevision}) {
        idOf(id);revisionOf(expectedRevision);const cleanName=name===undefined?null:nameOf(name),cleanSnapshot=snapshotOf(snapshot),context=await authorize();
        const record=await mutation(context,'somass_customer_update',{p_id:id,p_expected_revision:expectedRevision,p_name:cleanName,p_snapshot:cleanSnapshot});notify(record);return record;
      },
      async archive({id,expectedRevision}) {
        idOf(id);revisionOf(expectedRevision);const context=await authorize(),record=await mutation(context,'somass_customer_archive',{p_id:id,p_expected_revision:expectedRevision,p_archived:true});notify(record);return record;
      },
      async restoreArchive({id,expectedRevision}) {
        idOf(id);revisionOf(expectedRevision);const context=await authorize(),record=await mutation(context,'somass_customer_archive',{p_id:id,p_expected_revision:expectedRevision,p_archived:false});notify(record);return record;
      },
      subscribe(callback) { assertOpen();if(typeof callback!=='function')throw new TypeError('Callback required');subscribers.add(callback);return()=>subscribers.delete(callback); },
      close() { close(); }
    });
  }
  global.SomassCustomerCloudStore=Object.freeze({create,version:'supabase-owner-v1',table:TABLE});
})(typeof window!=='undefined'?window:globalThis);


/* Account selection, passwordless login and explicit local-to-cloud import. */
(function (g) {
  'use strict';
  let client, initial, currentOwner = null, changing = false, attached;
  const config = () => g.SomassCloudCustomerConfig;
  const project = () => config()?.projectRef || new URL(config().url).hostname.split('.')[0];
  const modeKey = () => 'somass.customer-storage-mode.' + project() + '.v1';
  const backupKey = () => 'somass.customer-local-before-cloud.' + project() + '.v1';
  function read(storage, key) { try { return JSON.parse(storage?.getItem(key) || 'null'); } catch { return null; } }
  function write(storage, key, value) { try { storage?.setItem(key, JSON.stringify(value)); } catch {} }
  function available() { return config()?.enabled !== false && typeof config()?.url === 'string' && typeof config()?.publishableKey === 'string' && !!g.supabase?.createClient; }
  function shouldClearAtStartup() { return typeof config()?.url==='string' && read(g.localStorage,modeKey())?.mode==='cloud'; }
  function make(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
  function button(text, action) { const node = make('button', text); node.type = 'button'; node.addEventListener('click', action); return node; }
  function errorMessage(error) { return error?.message || 'Bulut hesabına ulaşılamadı. Tekrar deneyebilirsiniz.'; }
  function remember(mode, ownerId) { write(g.localStorage, modeKey(), {mode, ownerId: ownerId || null}); }
  async function prepare() {
    if (!available()) return {store:await g.SomassCustomerStore.create(), mode:'local', scope:'', isolate:false};
    if (!initial) initial = (async () => {
      client = g.supabase.createClient(config().url, config().publishableKey, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, storageKey:'somass.auth.' + project() + '.v1'}});
      const result = await client.auth.getSession();
      if (result.error) throw result.error;
      const user = result.data?.session?.user || null, previous = read(g.localStorage, modeKey());
      currentOwner = user?.id || null;
      const choice = user
        ? {store:await g.SomassCustomerCloudStore.create({supabaseClient:client, projectRef:project()}), mode:'cloud', scope:'cloud.'+project()+'.'+user.id, user, isolate:true, previousMode:previous?.mode, localBackupKey:backupKey()}
        : {store:await g.SomassCustomerStore.create(), mode:'local', scope:'', user:null, isolate:previous?.mode==='cloud', previousMode:previous?.mode, localBackupKey:backupKey()};
      remember(choice.mode, currentOwner);
      client.auth.onAuthStateChange((event, session) => {
        if (!['SIGNED_IN','SIGNED_OUT','USER_DELETED'].includes(event)) return;
        const next = session?.user?.id || null;
        if (changing || next === currentOwner) return;
        // Never call Supabase again from its auth callback: complete the
        // current callback, then preserve this owner's draft and clear the UI.
        setTimeout(() => {
          if (changing || !attached) return;
          changing = true;
          attached.api.preserveSession();
          if (choice.mode === 'local') write(g.sessionStorage, backupKey(), attached.capture());
          attached.api.resetWorkspace(attached.emptySnapshot());
          remember(next ? 'cloud' : 'local', next);
          g.location.reload();
        }, 0);
      });
      return choice;
    })();
    return initial;
  }
  function mount({root, actions, api, choice, capture, loadSnapshot, emptySnapshot, report}) {
    if (!available()) return;
    attached = {api, capture, loadSnapshot, emptySnapshot};
    const launch = button(choice.mode==='cloud' ? 'Bulut hesabım' : 'Buluta giriş', show);
    launch.className = 'sp-cloud-account-button'; actions.append(launch);
    const dialog = make('dialog', undefined, 'sp-customer-dialog sp-cloud-dialog');
    const title = make('h2', 'Bulut hesabı'); title.id = 'sp-cloud-account-title'; dialog.setAttribute('aria-labelledby',title.id);
    const head = make('header',undefined,'sp-customer-dialog-head'); head.append(title,button('Kapat',()=>dialog.close()));
    const body = make('div',undefined,'sp-customer-dialog-body'), message = make('p','', 'sp-cloud-message'); message.setAttribute('role','status');
    dialog.append(head,body); root.append(dialog);
    function show() {
      body.replaceChildren(); message.textContent = '';
      if (choice.mode==='cloud') renderAccount(); else renderLogin();
      if (!dialog.open) dialog.showModal();
    }
    function renderLogin() {
      const form=make('form'), label=make('label','E-posta adresin'), input=make('input'); input.type='email'; input.required=true; input.autocomplete='email'; input.placeholder='E-posta adresin'; input.id='sp-cloud-email'; label.htmlFor=input.id;
      const note=make('p','Giriş bağlantısını e-postana göndereceğiz. Aynı hesapla giriş yaptığında müşterilerine farklı cihazlardan ulaşabilirsin.');
      const submit=make('button','Giriş bağlantısı gönder','sp-customer-primary'); submit.type='submit';
      form.append(label,input,note,submit,message); body.append(form);
      form.addEventListener('submit',async event=>{
        event.preventDefault(); submit.disabled=true; message.textContent='Giriş bağlantısı gönderiliyor…';
        try {
          await api.flush(); api.preserveSession(); write(g.sessionStorage,backupKey(),capture());
          const result=await client.auth.signInWithOtp({email:input.value.trim(),options:{emailRedirectTo:config().redirectURL || g.location.origin+g.location.pathname,shouldCreateUser:true}});
          if(result.error)throw result.error;
          message.textContent='E-postandaki giriş bağlantısını aç. Henüz buradaki müşteriler buluta aktarılmadı.';
        } catch(error){message.textContent=errorMessage(error);report(error);} finally{submit.disabled=false;}
      });
      input.focus();
    }
    function renderAccount() {
      body.append(make('p',choice.user.email || 'Hesabına giriş yapıldı.'));
      body.append(make('p','Müşteri kayıtları bu hesaba özel olarak Supabase’te saklanır. Tarayıcıdaki eski müşteriler kendiliğinden aktarılmaz.'));
      const migrate=button('Bu tarayıcıdaki müşterileri buluta aktar',async()=>{
        migrate.disabled=true;message.textContent='Tarayıcı kayıtları kontrol ediliyor…';let local;
        try {
          await api.flush();local=await g.SomassCustomerStore.create();const records=await local.list();let count=0;
          for(const summary of records){const record=await local.get(summary.id);if(!record)continue;await choice.store.importCustomer({id:record.id,name:record.name,snapshot:record.snapshot});count++;message.textContent=count+' müşteri buluta aktarıldı…';}
          message.textContent=count ? count+' müşteri buluta aktarıldı. Tarayıcıdaki asılları korunuyor.' : 'Bu tarayıcıda aktarılacak kayıtlı müşteri bulunamadı.';
          api.refreshLibrary();
        }catch(error){message.textContent='Aktarım tamamlanamadı. '+errorMessage(error);report(error);}finally{local?.close();migrate.disabled=false;}
      });
      const logout=button('Hesaptan çık',async()=>{
        logout.disabled=true;
        try {
          await api.flush();api.preserveSession();changing=true;const previous=capture();api.resetWorkspace(emptySnapshot());
          const result=await client.auth.signOut();
          if(result.error){api.resetWorkspace(previous);changing=false;throw result.error;}
          remember('local',null);g.location.reload();
        }catch(error){changing=false;message.textContent=errorMessage(error);report(error);logout.disabled=false;}
      });
      body.append(migrate,logout,message);
    }
  }
  g.SomassCloudCustomerAuth={available,prepare,mount,shouldClearAtStartup};
})(typeof window!=='undefined'?window:globalThis);


/* Deliberately public, single-workspace customer library, approved for link access.
 * Use a dedicated Supabase SDK client with auth persistence/refresh disabled.
 * This adapter never calls Auth, accesses private owner records, reads IndexedDB,
 * or migrates local customers automatically. RLS/RPCs enforce the fixed scope.
 */
(function(global){
 'use strict';
 const WORKSPACE='5248c66f-a4bc-43df-906b-656960e5ce47',TABLE='somass_shared_customers',LIMIT=1000,MAX_BYTES=2000000;
 const FIELDS='id,workspace_id,name,revision,created_at,updated_at,archived_at';
 const ID=/^customer_[a-zA-Z0-9_-]{1,100}$/,internal=new WeakSet();
 const copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
 function fail(code,message){const error=new Error(message);error.code=code;internal.add(error);return error;}
 function mapped(error){
  if(error&&typeof error==='object'&&internal.has(error))return error;
  const code=String(error?.code||''),status=Number(error?.status||0);
  if(code==='PT429'||status===429)return fail('quota','Ortak kayıt alanı işlem veya kapasite sınırına ulaştı. Bir süre sonra yeniden deneyin.');
  if(code==='PT404'||code==='PGRST116')return fail('not-found','Müşteri kaydı veya ortak çalışma alanı bulunamadı.');
  if(code==='PT409'||code==='23505')return /archived/i.test(String(error.message||'')+' '+String(error.details||''))?fail('archived','Bu müşteri arşivde. Düzenlemek için önce geri alın.'):fail('conflict','Bu kayıt başka bir cihazda değişti veya aynı adla bir müşteri var. Listeyi yenileyip tekrar deneyin.');
  if(['PT422','23514','22023'].includes(code))return fail('validation','Müşteri veya oda bilgileri geçersiz.');
  return fail('unavailable','Ortak bulut kaydı doğrulanamadı. Çalışmanızı açık tutup bağlantı sağlanınca yeniden deneyin.');
 }
 function idOf(value){if(typeof value!=='string'||!ID.test(value))throw fail('validation','Müşteri kaydı seçin.');return value;}
 function nameOf(value){if(typeof value!=='string')throw fail('validation','Müşteri adını yazın.');const name=value.trim().replace(/\s+/g,' ');if(!name||name.length>100)throw fail('validation','Müşteri adı 1–100 karakter olmalı.');return name;}
 function revisionOf(value){const n=typeof value==='string'&&/^\d+$/.test(value)?Number(value):value;if(!Number.isSafeInteger(n)||n<1)throw fail('conflict','Kayıt sürümü geçersiz. Müşteriyi yeniden açın.');return n;}
 function dateOf(value,nullable){if(nullable&&value===null)return null;if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw fail('unavailable','Bulut kayıt tarihi doğrulanamadı.');return new Date(value).toISOString();}
 async function create(options={}){
  const client=options.supabaseClient,sanitize=options.localSanitizer||global.SomassCustomerStore?.sanitizeSnapshot;
  const workspaceId=options.workspaceId;
  if(workspaceId!==WORKSPACE)throw fail('validation','Ortak çalışma alanı doğrulanamadı.');
  if(!client?.from||!client.rpc||typeof sanitize!=='function')throw fail('unavailable','Ortak bulut bağlantısı henüz hazır değil.');
  let project=options.projectRef;if(!project&&client.supabaseUrl){try{project=new URL(client.supabaseUrl).hostname;}catch(_){}}
  if(typeof project!=='string'||!/^[a-zA-Z0-9.-]{4,100}$/.test(project))throw fail('unavailable','Bulut projesi doğrulanamadı.');
  const pollInterval=Number.isFinite(options.pollIntervalMs)?Math.max(5000,Math.min(120000,options.pollIntervalMs)):15000;
  const timeoutMs=Number.isFinite(options.requestTimeoutMs)?Math.max(1000,Math.min(120000,options.requestTimeoutMs)):20000;
  let closed=false,timer=null,polling=false,pollGeneration=0,baseline=null,lastPollAt=null,lastPollError=null;
  const subscribers=new Set(),requests=new Set();
  const visible=()=>global.document?.visibilityState!=='hidden';
  function assertOpen(){if(closed)throw fail('closed','Ortak müşteri kayıt alanı kapandı. Sayfayı yeniden açın.');}
  function emit(notice){for(const callback of subscribers){try{callback(copy(notice));}catch(_){}}}
  function cancelPoll(){pollGeneration++;if(timer!==null){global.clearTimeout(timer);timer=null;}for(const entry of requests)if(entry.poll)entry.abort?.abort();}
  function schedule(){if(timer!==null)global.clearTimeout(timer);timer=null;if(!closed&&subscribers.size&&visible())timer=global.setTimeout(async()=>{timer=null;await poll();},pollInterval);}
  async function request(builder,pollToken){
   assertOpen();const abort=global.AbortController?new global.AbortController():null,entry={abort,poll:pollToken!==undefined};let timeout=null,response;
   if(abort&&builder?.abortSignal){requests.add(entry);builder=builder.abortSignal(abort.signal);timeout=global.setTimeout(()=>abort.abort(),timeoutMs);}
   try{response=await builder;}
   catch(error){assertOpen();if(pollToken!==undefined&&pollToken!==pollGeneration)throw fail('cancelled','');throw mapped(error);}
   finally{requests.delete(entry);if(timeout!==null)global.clearTimeout(timeout);}
   assertOpen();if(pollToken!==undefined&&pollToken!==pollGeneration)throw fail('cancelled','');
   if(response?.error)throw mapped({...response.error,status:response.status||response.error.status});
   if(!response||!Object.prototype.hasOwnProperty.call(response,'data'))throw fail('unavailable','Bulut yanıtı doğrulanamadı.');
   return response.data;
  }
  function snapshotOf(value){
   function limited(input){let json;try{json=JSON.stringify(input);}catch(_){throw fail('validation','Oda kaydı geçersiz veya çok büyük.');}const bytes=json&&global.TextEncoder?new global.TextEncoder().encode(json).byteLength:json?.length;if(!json||bytes>MAX_BYTES)throw fail('validation','Oda kaydı geçersiz veya çok büyük.');return JSON.parse(json);}
   const input=limited(value);try{return limited(sanitize(input,options.validateSnapshot));}catch(error){if(error.code==='validation')throw error;throw fail('validation','Oda kaydı geçersiz veya çok büyük.');}
  }
  function scope(row){if(!row||row.workspace_id!==workspaceId)throw fail('unavailable','Ortak çalışma alanı yanıtı doğrulanamadı.');}
  function meta(row){scope(row);return{id:idOf(row.id),revision:revisionOf(row.revision),archivedAt:dateOf(row.archived_at,true)};}
  function recordOf(row,full){
   const head=meta(row),snapshot=full?snapshotOf(row.snapshot):null,rooms=full?snapshot.modelContent.customRooms:row.rooms;
   if(!Array.isArray(rooms)||rooms.length>8)throw fail('unavailable','Müşterinin oda listesi doğrulanamadı.');
   const seen=new Set(),roomList=rooms.map(room=>{if(!room||typeof room.id!=='string'||!/^custom_[a-zA-Z0-9_-]{1,73}$/.test(room.id)||seen.has(room.id)||typeof room.name!=='string'||!room.name.trim()||room.name.length>50)throw fail('unavailable','Müşterinin oda listesi doğrulanamadı.');seen.add(room.id);return{id:room.id,name:room.name};});
   const record={...head,name:nameOf(row.name),createdAt:dateOf(row.created_at),updatedAt:dateOf(row.updated_at),roomCount:roomList.length,rooms:roomList};if(full)record.snapshot=snapshot;return record;
  }
  const fingerprint=rows=>JSON.stringify(Array.from(rows.values()).sort((a,b)=>a.id.localeCompare(b.id)).map(row=>[row.id,row.revision,row.archivedAt]));
  async function metadata(pollToken){
   const data=await request(client.from(TABLE).select('id,workspace_id,revision,archived_at').eq('workspace_id',workspaceId).order('id',{ascending:true}).range(0,LIMIT),pollToken);
   if(!Array.isArray(data)||data.length>LIMIT)throw fail('quota','Ortak müşteri listesi kapasite sınırını aştı.');
   const rows=new Map();for(const row of data){const item=meta(row);if(rows.has(item.id))throw fail('unavailable','Ortak müşteri listesi yineleniyor.');rows.set(item.id,item);}return rows;
  }
  async function poll(){
   if(closed||polling||!subscribers.size||!visible())return;
   polling=true;const generation=pollGeneration;
   try{
    const next=await metadata(generation);if(closed||generation!==pollGeneration||!subscribers.size||!visible())return;
    const changed=baseline!==null&&fingerprint(baseline)!==fingerprint(next);baseline=next;lastPollAt=new Date().toISOString();lastPollError=null;
    if(changed)emit({type:'customers-changed',storage:'supabase-shared',workspaceId,external:true});
   }catch(error){if(!closed&&generation===pollGeneration&&error.code!=='cancelled')lastPollError=error.code||'unavailable';}
   finally{polling=false;schedule();}
  }
  function visibilityChanged(){if(!visible())cancelPoll();else if(subscribers.size)void poll();}
  function notify(record){if(baseline)baseline.set(record.id,{id:record.id,revision:record.revision,archivedAt:record.archivedAt});emit({type:'customers-changed',storage:'supabase-shared',workspaceId,id:record.id,revision:record.revision});}
  function one(data){if(!Array.isArray(data)||data.length!==1)throw fail('unavailable','Kaydedilen müşteri doğrulanamadı.');return recordOf(data[0],true);}
  async function mutate(name,args){return one(await request(client.rpc(name,{p_workspace_id:workspaceId,...args})));}
  async function createWithId({id,name,snapshot}){
   assertOpen();const args={p_id:idOf(id),p_name:nameOf(name),p_snapshot:snapshotOf(snapshot)};let record;
   try{record=await mutate('somass_shared_customer_create',args);}catch(error){if(error.code!=='unavailable')throw error;assertOpen();record=await mutate('somass_shared_customer_create',args);}
   notify(record);return record;
  }
  // Establish connectivity before the UI labels this as an available cloud store.
  // Only IDs/revisions/archive flags are read here; no automatic imports occur.
  baseline=await metadata();lastPollAt=new Date().toISOString();
  global.document?.addEventListener?.('visibilitychange',visibilityChanged);
  return Object.freeze({
   identity:Object.freeze({storage:'supabase-shared',projectRef:project,workspaceId,namespace:'somass-shared:'+project+':'+workspaceId}),
   async list({includeArchived=false}={}){
    assertOpen();let query=client.from(TABLE).select(FIELDS+',rooms:snapshot->modelContent->customRooms').eq('workspace_id',workspaceId);if(!includeArchived)query=query.is('archived_at',null);
    const data=await request(query.order('updated_at',{ascending:false}).order('name',{ascending:true}).order('id',{ascending:true}).range(0,LIMIT));
    if(!Array.isArray(data)||data.length>LIMIT)throw fail('quota','Ortak müşteri listesi kapasite sınırını aştı.');
    const seen=new Set(),records=data.map(row=>{const record=recordOf(row,false);if(seen.has(record.id))throw fail('unavailable','Ortak müşteri listesi yineleniyor.');seen.add(record.id);return record;});return records.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.name.localeCompare(b.name,'tr'));
   },
   async get(id){assertOpen();idOf(id);const data=await request(client.from(TABLE).select(FIELDS+',snapshot').eq('workspace_id',workspaceId).eq('id',id).maybeSingle());return data===null?null:recordOf(data,true);},
   async create({name,snapshot}){assertOpen();if(!global.crypto?.randomUUID)throw fail('unavailable','Yeni müşteri kimliği oluşturulamıyor. Güncel bir tarayıcı kullanın.');return createWithId({id:'customer_'+global.crypto.randomUUID(),name,snapshot});},
   async importCustomer({id,name,snapshot}){return createWithId({id,name,snapshot});},
   async update({id,name,snapshot,expectedRevision}){assertOpen();const args={p_id:idOf(id),p_expected_revision:revisionOf(expectedRevision),p_name:name===undefined?null:nameOf(name),p_snapshot:snapshotOf(snapshot)};const record=await mutate('somass_shared_customer_update',args);notify(record);return record;},
   async archive({id,expectedRevision}){assertOpen();const record=await mutate('somass_shared_customer_archive',{p_id:idOf(id),p_expected_revision:revisionOf(expectedRevision),p_archived:true});notify(record);return record;},
   async restoreArchive({id,expectedRevision}){assertOpen();const record=await mutate('somass_shared_customer_archive',{p_id:idOf(id),p_expected_revision:revisionOf(expectedRevision),p_archived:false});notify(record);return record;},
   subscribe(callback){assertOpen();if(typeof callback!=='function')throw new TypeError('Callback required');subscribers.add(callback);if(subscribers.size===1)void poll();return()=>{subscribers.delete(callback);if(!subscribers.size)cancelPoll();};},
   syncStatus(){return{lastPollAt,lastPollError,subscribed:subscribers.size>0,visible:visible()};},
   close(){if(closed)return;closed=true;cancelPoll();for(const entry of requests)entry.abort?.abort();requests.clear();global.document?.removeEventListener?.('visibilitychange',visibilityChanged);subscribers.clear();}
  });
 }
 global.SomassSharedCustomerStore=Object.freeze({create,version:'supabase-public-workspace-v1',workspaceId:WORKSPACE,table:TABLE});
})(typeof window!=='undefined'?window:globalThis);


/* One deliberately shared customer workspace. No login and no automatic import. */
(function(g){
 'use strict';
 let selection;
 const config=()=>g.SomassCloudCustomerConfig;
 const project=()=>config()?.projectRef||new URL(config().url).hostname.split('.')[0];
 const priorModeKey=()=> 'somass.customer-storage-mode.'+project()+'.v1';
 const baseSession='somass.room-planner.customer-session.v1';
 function read(storage,key){try{return JSON.parse(storage?.getItem(key)||'null');}catch{return null;}}
 function write(storage,key,value){try{storage?.setItem(key,JSON.stringify(value));}catch{}}
 function configured(){return config()?.mode==='shared'&&typeof config()?.url==='string'&&typeof config()?.workspaceId==='string';}
 function available(){return configured()&&typeof config()?.publishableKey==='string'&&!!g.supabase?.createClient&&!!g.SomassSharedCustomerStore?.create;}
 function shouldClearAtStartup(){return configured()&&read(g.localStorage,priorModeKey())?.mode==='cloud';}
 function preserveBeforeIsolation(snapshot){
  if(!configured())return;
  const previous=read(g.localStorage,priorModeKey());
  if(previous?.mode!=='cloud'||typeof previous.ownerId!=='string')return;
  const key=baseSession+'.cloud.'+project()+'.'+previous.ownerId,old=read(g.sessionStorage,key);
  write(g.sessionStorage,key,{customerId:old?.customerId||null,revision:old?.revision||null,snapshot});
  write(g.sessionStorage,'somass.private-before-shared.'+project()+'.'+previous.ownerId+'.v1',snapshot);
 }
 async function prepare(){
  if(!available())throw Object.assign(new Error('Ortak müşteri alanı bağlantısı hazırlanamadı. Sayfayı yenileyip tekrar deneyin.'),{code:'unavailable'});
  if(!selection)selection=(async()=>{
   const cfg=config(),client=g.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'somass.shared-public.'+project()+'.v1'}});
   const store=await g.SomassSharedCustomerStore.create({supabaseClient:client,workspaceId:cfg.workspaceId,projectRef:project()});
   const previous=read(g.localStorage,priorModeKey());
   const choice={store,mode:'shared',scope:'shared.'+project()+'.'+cfg.workspaceId,isolate:previous?.mode==='cloud',previousMode:previous?.mode};
   write(g.localStorage,priorModeKey(),{mode:'shared',workspaceId:cfg.workspaceId});
   return choice;
  })();
  return selection;
 }
 function make(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
 function button(text,action){const node=make('button',text);node.type='button';node.addEventListener('click',action);return node;}
 function mount({root,actions,api,choice,report}){
  if(choice.mode!=='shared')return;
  const launch=button('Tarayıcı kayıtlarını ortak alana aktar',review);launch.className='sp-shared-import-button';actions.append(launch);
  const dialog=make('dialog',undefined,'sp-customer-dialog sp-shared-import-dialog');dialog.setAttribute('aria-labelledby','sp-shared-import-title');
  const heading=make('h2','Tarayıcı kayıtlarını ortak alana aktar');heading.id='sp-shared-import-title';
  const header=make('header',undefined,'sp-customer-dialog-head'),close=button('Kapat',()=>{if(!importing)dialog.close();});header.append(heading,close);
  const body=make('div',undefined,'sp-customer-dialog-body');dialog.append(header,body);root.append(dialog);
  let local=null,importing=false,reviewed=[],generation=0;
  const completed=new Set();
  dialog.addEventListener('cancel',event=>{if(importing)event.preventDefault();});
  dialog.addEventListener('close',()=>{generation++;local?.close();local=null;launch.focus();});
  async function review(){
   if(importing)return;
   const request=++generation;completed.clear();reviewed=[];body.replaceChildren();
   const description=make('p','Listelenen müşteriler ve odaları, bu bağlantıya erişen herkes tarafından görülebilir ve düzenlenebilir. Tarayıcıdaki asılları korunur.');
   const list=make('div',undefined,'sp-shared-import-list'),message=make('p','Tarayıcı kayıtları yükleniyor…','sp-shared-import-message');message.setAttribute('role','status');
   const confirm=button('Ortak alana aktar',transfer);confirm.className='sp-customer-primary';confirm.disabled=true;
   body.append(description,list,message,confirm);if(!dialog.open)dialog.showModal();
   try{
    await api.flush();const opened=await g.SomassCustomerStore.create();
    if(request!==generation||!dialog.open){opened.close();return;}
    local?.close();local=opened;reviewed=await local.list();
    if(request!==generation||!dialog.open)return;
    for(const record of reviewed){
     const row=make('article',undefined,'sp-shared-import-record');row.dataset.customerId=record.id;
     const result=make('p','','sp-shared-import-result');result.setAttribute('role','status');
     row.append(make('h3',record.name),make('p',record.roomCount+' oda'),result);list.append(row);
    }
    message.textContent=reviewed.length ? reviewed.length+' müşteri ortak alana aktarılacak. Listeyi kontrol edip aşağıdaki düğmeyle paylaşabilirsiniz.' : 'Bu tarayıcıda aktarılacak kayıtlı müşteri bulunamadı.';
    confirm.disabled=reviewed.length===0;
   }catch(error){message.textContent=error?.message||'Tarayıcı kayıtları okunamadı.';report(error);}
   async function transfer(){
    if(importing||!local||!reviewed.length)return;
    importing=true;confirm.disabled=true;close.disabled=true;let failures=0;
    try{
     // Freeze the reviewed ID/revision list: additions or edits in another tab
     // cannot become an unreviewed public upload between review and consent.
     for(const summary of reviewed){
      if(completed.has(summary.id))continue;
      const row=list.children[reviewed.indexOf(summary)],result=row.querySelector('.sp-shared-import-result');
      try{
       const record=await local.get(summary.id);
       if(!record||record.archivedAt||record.revision!==summary.revision||record.name!==summary.name||record.roomCount!==summary.roomCount)throw new Error('Bu kayıt inceleme sırasında değişti. Listeyi kapatıp yeniden kontrol edin.');
       await choice.store.importCustomer({id:record.id,name:record.name,snapshot:record.snapshot});
       completed.add(summary.id);result.textContent='Ortak alana aktarıldı.';
      }catch(error){failures++;result.textContent='Aktarılamadı: '+(error?.message||'Kaydı tekrar kontrol edin.');result.dataset.error='true';}
      message.textContent=completed.size+' / '+reviewed.length+' müşteri ortak alana aktarıldı.';
     }
     message.textContent=completed.size+' / '+reviewed.length+' müşteri ortak alana aktarıldı.'+(failures?' '+failures+' kayıt aktarılamadı; ayrıntıları listede görebilirsiniz.':' Tarayıcıdaki asılları korunuyor.');
     api.refreshLibrary();
    }finally{importing=false;close.disabled=false;confirm.disabled=completed.size===reviewed.length;}
   }
  }
 }
 g.SomassSharedCustomerWorkspace={available,prepare,mount,shouldClearAtStartup,preserveBeforeIsolation};
})(typeof window!=='undefined'?window:globalThis);


/* Customer workspaces contain room definitions and placements, never model assets. */
(function (global) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const baseKey = 'somass.room-planner.customer-session.v1';
  const baseDraftKey = 'somass.room-planner.unassigned-customer-draft.v1';
  const fold = value => value.trim().normalize('NFC').replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  function button(text, action, className) {
    const node = element('button', className, text);
    node.type = 'button'; node.addEventListener('click', action); return node;
  }
  function create({root, getSnapshot, loadSnapshot, emptySnapshot, storeFactory}) {
    const capture = () => global.SomassCustomerStore.sanitizeSnapshot(getSnapshot());
    const sharedMode = global.SomassCloudCustomerConfig?.mode === 'shared';
    const startupManager = sharedMode ? global.SomassSharedCustomerWorkspace : global.SomassCloudCustomerAuth;
    let key = baseKey, draftKey = baseDraftKey, choice = {mode:'local',scope:''};
    let store, active = null, pending = null, saving = null, timer = 0;
    let switching = false, blocked = false, libraryOpen = false, query = '', navigating = false;
    let initialized = false, editedBeforeReady = false, restoredSession;
    try { restoredSession = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch {}
    let unassigned = capture();
    try { unassigned = JSON.parse(sessionStorage.getItem(draftKey) || 'null') || unassigned; } catch {}
    if (startupManager?.shouldClearAtStartup?.()) {
      // A previous account's generic widget state is hidden before any network
      // authentication can fail. Its own scoped recovery session is untouched.
      startupManager.preserveBeforeIsolation?.(capture());
      switching=true;
      try { loadSnapshot(emptySnapshot());unassigned=capture(); } finally { switching=false; }
    }
    const bar = element('section', 'sp-customer-bar');
    bar.setAttribute('aria-label', 'Müşteri ve kayıt');
    const identity = element('div', 'sp-customer-identity');
    const title = element('strong', '', 'Kaydedilmemiş çalışma');
    const status = element('span', 'sp-customer-status', 'Müşteri adıyla kaydederek odalarınıza tekrar ulaşabilirsiniz.');
    status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    identity.append(title, status);
    const actions = element('div', 'sp-customer-actions');
    const libraryButton = button('Müşteriler', () => showLibrary());
    const saveButton = button('Müşteriye kaydet', () => active ? flush().catch(report) : showSave(true), 'sp-customer-primary');
    const saveAsButton = button('Farklı müşteriye kaydet', () => showSave(true));
    saveAsButton.hidden = true;
    actions.append(libraryButton, saveAsButton, saveButton); bar.append(identity, actions);
    root.querySelector('.sp-workspacebar').before(bar);

    const dialog = element('dialog', 'sp-customer-dialog');
    dialog.setAttribute('aria-labelledby', 'sp-customer-dialog-title');
    const head = element('header', 'sp-customer-dialog-head');
    const heading = element('h2', '', 'Müşteriler'); heading.id = 'sp-customer-dialog-title';
    head.append(heading, button('Kapat', () => dialog.close()));
    const body = element('div', 'sp-customer-dialog-body');
    const notice = element('p', 'sp-customer-notice'); notice.setAttribute('role', 'status');
    const foot = element('p', 'sp-customer-footnote', 'Kayıtlar bu tarayıcıda saklanır. Başka cihazlara otomatik aktarılmaz.');
    dialog.append(head, notice, body, foot); root.append(dialog);
    dialog.addEventListener('close', () => { libraryOpen = false; libraryButton.focus(); });

    function report(error) {
      const message = error?.code === 'conflict'
        ? 'Bu müşteri başka bir sekmede değişti. Çalışmanız korunuyor; farklı müşteriye kaydedebilirsiniz.'
        : error?.message || 'Kayıt tamamlanamadı. Çalışmanız açık kalıyor; tekrar deneyin.';
      status.textContent = ['cloud','shared'].includes(choice.mode) && ['unavailable','auth','account-changed','closed'].includes(error?.code)
        ? message + ' Değişiklikler bu sekmede korunuyor; '+(choice.mode==='shared'?'ortak alan':'bulut')+' kaydı tamamlanmadı.' : message;
      status.dataset.error = 'true';
      if (dialog.open) notice.textContent = message;
    }
    function session() {
      try { sessionStorage.setItem(key, JSON.stringify({customerId:active?.id || null, revision:active?.revision || null, snapshot:capture()})); }
      catch { /* Only the selected durable store may report a save success. */ }
    }
    function keepDraft() {
      unassigned = capture();
      try { sessionStorage.setItem(draftKey, JSON.stringify(unassigned)); } catch {}
    }
    function refresh() {
      title.textContent = active ? active.name : 'Kaydedilmemiş çalışma';
      saveButton.textContent = active ? 'Şimdi kaydet' : 'Müşteriye kaydet';
      saveAsButton.hidden = !active;
    }
    function saved() {
      const count = capture().modelContent.customRooms.length;
      status.textContent = count + (choice.mode === 'shared' ? ' oda · Ortak alana kaydedildi' : choice.mode === 'cloud' ? ' oda · Buluta kaydedildi' : ' oda · Bu tarayıcıya kaydedildi'); delete status.dataset.error;
      refresh(); session();
    }
    function changed() {
      if (switching) return;
      if (!initialized) { editedBeforeReady = true; return; }
      session();
      if (!active) { keepDraft(); return; }
      pending = capture();
      if (blocked) return;
      status.textContent = choice.mode==='shared' ? 'Ortak alana kaydediliyor…' : 'Kaydediliyor…'; delete status.dataset.error;
      clearTimeout(timer); timer = setTimeout(() => flush().catch(report), 300);
    }
    async function flush() {
      await ready;
      clearTimeout(timer);
      if (blocked) { const error = new Error('Kayıt başka bir sekmede değişti. Önce farklı müşteriye kaydedin.'); error.code = 'conflict'; throw error; }
      if (saving) { await saving; if (pending) return flush(); return; }
      if (!active) return;
      // Explicit save also captures changes which do not move a furniture item.
      if (!pending) pending = capture();
      if (JSON.stringify(pending) === JSON.stringify(active.snapshot)) { pending = null; saved(); return; }
      saving = (async () => {
        while (pending) {
          const value = pending, id = active.id, revision = active.revision;
          pending = null;
          try {
            const record = await store.update({id, snapshot:value, expectedRevision:revision});
            if (active?.id === id) active = record;
          } catch (error) {
            if (!pending) pending = value;
            if (error.code === 'conflict') blocked = true;
            throw error;
          }
        }
        saved();
      })();
      try { await saving; } finally { saving = null; }
    }
    async function openRecord(record, roomId) {
      // Validate in the controller before changing the active customer's identity.
      const value = clone(record.snapshot);
      if (roomId) value.modelContent.room = roomId;
      switching = true;
      try {
        loadSnapshot(value);
        active = record; pending = null; blocked = false;
        saved(); dialog.close();
      } finally { switching = false; }
    }
    async function openCustomer(id, roomId) {
      if (navigating) return;
      navigating = true; body.setAttribute('aria-busy', 'true');
      for (const node of body.querySelectorAll('button')) node.disabled = true;
      try {
        if (active) await flush(); else keepDraft();
        const record = await store.get(id);
        if (!record || record.archivedAt) throw new Error('Müşteri kaydı bulunamadı.');
        await openRecord(record, roomId);
      } catch (error) { report(error); }
      finally { navigating = false; body.removeAttribute('aria-busy'); for (const node of body.querySelectorAll('button')) node.disabled = false; }
    }
    function show() { if (!dialog.open) dialog.showModal(); }
    async function showLibrary() {
      libraryOpen = true; heading.textContent = 'Müşteriler'; notice.textContent = '';
      body.replaceChildren();
      const toolbar = element('div', 'sp-customer-library-tools');
      const search = element('input'); search.type = 'search'; search.placeholder = 'Müşteri veya oda ara';
      search.setAttribute('aria-label', 'Müşteri veya oda ara'); search.value = query;
      toolbar.append(search, button('Yeni müşteri', () => showSave(false), 'sp-customer-primary'));
      const list = element('div', 'sp-customer-list');
      body.append(toolbar, list); show(); search.focus();
      if (active) {
        toolbar.append(button('Kaydedilmemiş çalışma', async () => {
          try {
            await flush(); switching = true;
            try { loadSnapshot(unassigned); active = null; pending = null; blocked = false; refresh(); session(); status.textContent = 'Bu çalışma henüz bir müşteriye kaydedilmedi.'; dialog.close(); }
            finally { switching = false; }
          } catch (error) { report(error); }
        }));
      }
      async function drawList() {
        try {
          await ready;
          const records = await store.list();
          if (!libraryOpen || !list.isConnected) return;
          const needle = fold(query);
          const matches = records.filter(record => !needle || fold(record.name).includes(needle) || record.rooms.some(room => fold(room.name).includes(needle)));
          libraryButton.textContent = records.length ? 'Müşteriler (' + records.length + ')' : 'Müşteriler';
          list.replaceChildren();
          if (!records.length) list.append(element('p', 'sp-customer-empty', 'Henüz kayıtlı müşteri yok. Yeni müşteri oluşturabilir veya açık çalışmanızı müşteri adıyla kaydedebilirsiniz.'));
          else if (!matches.length) list.append(element('p', 'sp-customer-empty', 'Aramanızla eşleşen müşteri veya oda bulunamadı.'));
          for (const record of matches) {
            const card = element('article', 'sp-customer-card');
            const row = element('div', 'sp-customer-card-head');
            const label = element('div');
            label.append(element('h3', '', record.name), element('p', '', record.roomCount + ' oda · ' + new Date(record.updatedAt).toLocaleDateString('tr-TR')));
            row.append(label, button(active?.id === record.id ? 'Açık müşteri' : 'Müşteriyi aç', () => openCustomer(record.id)));
            const rooms = element('div', 'sp-customer-room-list');
            for (const room of record.rooms) rooms.append(button(room.name, () => openCustomer(record.id, room.id)));
            card.append(row, rooms); list.append(card);
          }
        } catch (error) { report(error); }
      }
      search.addEventListener('input', () => { query = search.value; drawList(); });
      drawList();
    }
    function showSave(useCurrent) {
      libraryOpen = false; heading.textContent = useCurrent ? 'Çalışmayı müşteriye kaydet' : 'Yeni müşteri'; notice.textContent = '';
      const form = element('form', 'sp-customer-save-form');
      const label = element('label', '', 'Müşteri adı'); label.htmlFor = 'sp-customer-name';
      const input = element('input'); input.id = 'sp-customer-name'; input.name = 'customerName';
      input.required = true; input.maxLength = 100; input.autocomplete = 'off'; input.placeholder = 'Örn. Ayşe Yılmaz';
      const note = element('p', '', useCurrent ? 'Açık çalışmadaki tüm odalar, ürün yerleşimleri ve oda yüzeyleri bu müşteri altında saklanacak.' : 'Bu müşteri için boş bir oda açılır. İstediğiniz kadar müşteriyi aynı listeden yönetebilirsiniz.');
      const submit = element('button', 'sp-customer-primary', useCurrent ? 'Müşteriye kaydet' : 'Müşteriyi oluştur'); submit.type = 'submit';
      form.append(label, input, note, submit); body.replaceChildren(form); show(); input.focus();
      form.addEventListener('submit', async event => {
        event.preventDefault(); submit.disabled = true; notice.textContent = '';
        try {
          await ready;
          const name = input.value.trim().normalize('NFC');
          if (!name) throw new Error('Müşteri adını yazın.');
          const records = await store.list();
          if (records.some(record => fold(record.name) === fold(name))) throw new Error('Bu isimde bir müşteri var. Müşteriler listesinden açıp yeni oda ekleyebilirsiniz.');
          if (active && blocked && !useCurrent) throw new Error('Önce açık değişiklikleri Farklı müşteriye kaydet ile koruyun. Ardından boş bir müşteri oluşturabilirsiniz.');
          if (active && !blocked) await flush();
          const value = useCurrent ? capture() : emptySnapshot();
          const record = await store.create({name, snapshot:value});
          if (!active) keepDraft();
          await openRecord(record);
          libraryButton.textContent = 'Müşteriler (' + (records.length + 1) + ')';
        } catch (error) { report(error); } finally { submit.disabled = false; }
      });
    }
    // These names are intentionally private to each tab; a different customer
    // opened in another tab must never reassign this tab's pending edits.
    const ready = (async () => {
      try {
        if (typeof storeFactory === 'function') choice = await storeFactory();
        else if (sharedMode) {
          if (!global.SomassSharedCustomerWorkspace?.available()) throw Object.assign(new Error('Ortak müşteri alanı bağlantısı hazırlanamadı. Sayfayı yenileyip tekrar deneyin.'),{code:'unavailable'});
          choice = await global.SomassSharedCustomerWorkspace.prepare();
        }
        else if (global.SomassCloudCustomerAuth?.available()) choice = await global.SomassCloudCustomerAuth.prepare();
        else choice = {store:await global.SomassCustomerStore.create(),mode:'local',scope:''};
        store = choice.store;
        if (!store) throw new Error('Müşteri kayıt bağlantısı hazırlanamadı.');
        if (choice.scope) {
          key = baseKey + '.' + choice.scope;
          draftKey = baseDraftKey + '.' + choice.scope;
          restoredSession = undefined;
          try { restoredSession = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch {}
        }
        if (choice.isolate) {
          // Shared widget state is never evidence of this cloud account's
          // ownership. Only this project's/user's scoped session may restore it.
          if (choice.mode === 'cloud' && choice.previousMode !== 'cloud' && choice.localBackupKey) {
            try { sessionStorage.setItem(choice.localBackupKey,JSON.stringify(capture())); } catch {}
          }
          let reset = emptySnapshot();
          if (choice.mode === 'local' && choice.localBackupKey) {
            try { const local = JSON.parse(sessionStorage.getItem(choice.localBackupKey) || 'null'); if(local) reset=global.SomassCustomerStore.sanitizeSnapshot(local); } catch {}
          }
          switching = true;
          try { loadSnapshot(reset); unassigned=capture(); } finally { switching=false; }
          // Startup edits, if any, are quarantined with their preceding local
          // draft above; they cannot be attached to an unverified account.
          editedBeforeReady=false;
        }
        if (choice.scope) {
          unassigned=capture();
          try { const draft=JSON.parse(sessionStorage.getItem(draftKey) || 'null');if(draft)unassigned=global.SomassCustomerStore.sanitizeSnapshot(draft); } catch {}
        }
        status.dataset.storage = choice.mode;
        foot.textContent = choice.mode === 'shared'
          ? 'Bağlantıya erişen mimarlar aynı müşteri ve odaları görebilir ve düzenleyebilir.'
          : choice.mode === 'cloud'
          ? 'Kayıtlar bu bulut hesabına özeldir. Aynı hesapla farklı cihazlardan açabilirsiniz.'
          : 'Kayıtlar bu tarayıcıda saklanır. Başka cihazlara otomatik aktarılmaz.';
        const restored = editedBeforeReady ? null : restoredSession;
        let resumePending = false;
        if (restored?.customerId) {
          const record = await store.get(restored.customerId);
          if (record && !record.archivedAt && !editedBeforeReady) {
            const sameRevision = restored.revision === record.revision;
            const localDraft = restored.snapshot && global.SomassCustomerStore.sanitizeSnapshot(restored.snapshot);
            if (!sameRevision && localDraft && JSON.stringify(localDraft) !== JSON.stringify(record.snapshot)) {
              switching = true;
              try { loadSnapshot(localDraft); active = {...record, revision:restored.revision, snapshot:localDraft}; pending = localDraft; blocked = true; refresh(); session(); }
              finally { switching = false; }
              const error = new Error(); error.code = 'conflict'; report(error);
            } else {
              await openRecord(record);
            }
            if (sameRevision && localDraft) {
              switching = true;
              try { loadSnapshot(localDraft); } finally { switching = false; }
              if (JSON.stringify(capture()) !== JSON.stringify(record.snapshot)) { pending = capture(); resumePending = true; }
            }
          }
        } else if (restored?.snapshot) {
          const value = global.SomassCustomerStore.sanitizeSnapshot(restored.snapshot);
          switching = true;
          try { loadSnapshot(value); keepDraft(); session(); } finally { switching = false; }
        }
        initialized = true;
        if (editedBeforeReady) { keepDraft(); session(); status.textContent = (choice.mode==='shared'?'Ortak alan · ':'')+'Açık değişiklikleriniz korunuyor. Müşteri adıyla kaydedebilirsiniz.'; }
        if (resumePending) { session(); status.textContent = choice.mode==='shared'?'Ortak alana kaydediliyor…':'Kaydediliyor…'; timer = setTimeout(() => flush().catch(report), 300); }
        if (choice.mode==='shared' && !active && !editedBeforeReady && !resumePending) {
          status.textContent='Ortak alan · Çalışmanı müşteri adıyla kaydederek paylaşabilirsin.';
          session();
        }
        const records = await store.list();
        libraryButton.textContent = records.length ? 'Müşteriler (' + records.length + ')' : 'Müşteriler';
        store.subscribe(() => { if(choice.mode==='shared')api.refreshLibrary();else if (libraryOpen) showLibrary(); });
        if (choice.mode==='shared') global.SomassSharedCustomerWorkspace?.mount?.({root,actions,api,choice,capture,loadSnapshot,emptySnapshot,report});
        else if(!sharedMode)global.SomassCloudCustomerAuth?.mount?.({root,actions,api,choice,capture,loadSnapshot,emptySnapshot,report});
      } catch (error) { initialized = true; report(error); throw error; }
    })();
    // Surface initialization failure without an unhandled promise rejection.
    ready.catch(() => {});
    const api = {changed, refresh, flush, ready,
      preserveSession(){session();if(!active)keepDraft();},
      resetWorkspace(value){switching=true;try{loadSnapshot(value || emptySnapshot());}finally{switching=false;}},
      refreshLibrary(){
        if(libraryOpen)showLibrary();
        store?.list().then(records=>{libraryButton.textContent=records.length?'Müşteriler ('+records.length+')':'Müşteriler';}).catch(report);
      }
    };
    return api;
  }
  global.SomassCustomerWorkspaces = {create};
})(typeof window !== 'undefined' ? window : globalThis);



(()=>{
  'use strict';
  const root=document.getElementById('somass-planner-v2');
  const D=JSON.parse(document.getElementById('sp-data').textContent),P=D.products,R=Object.fromEntries(D.rooms.map(r=>[r.id,r]));
  const G=SomassGeometry.createGeometry(P,R),$=s=>root.querySelector(s),heads=['N','E','S','W'];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const copy=v=>JSON.parse(JSON.stringify(v)),num=n=>Number(n).toLocaleString('tr-TR',{maximumFractionDigits:1}),round=n=>Math.round(n*100)/100;
  const DrawerUI=window.SomassWatkinsDrawerUI;if(!DrawerUI)throw new Error('Çekmece seçenekleri yüklenemedi.');DrawerUI.preparePresets(D);
  const inspectorFamily=window.SomassInspectorFamily.create({catalog:D.catalog,products:P});
  const defaultLayouts=Object.fromEntries(D.rooms.map(r=>[r.id,copy(D.variants[r.id].find(v=>v.id===D.defaultVariant[r.id]).items)]));
  let S={customRooms:[],roomStyles:{},room:'Z1',layouts:copy(defaultLayouts),variants:{...D.defaultVariant},selected:null,dims:true,labels:true,openings:false,raw:false,zoom:1,camera:null,wardBudget:true};
  let viewer3d=null,view3d=true,fullCatalog=null;
  let roomEditor=null,customerWorkspace=null;
  let undo=[],redo=[],drag=null,paint=0,catalog=false,ownSnapshots=new Set(),saveQueue=Promise.resolve(),saveTimer=0;
  const room=()=>({...R[S.room],appearance:SomassRoomFinishes.normalize(S.roomStyles[S.room]||R[S.room].appearance)}),items=()=>S.layouts[S.room],selected=()=>items().find(i=>i.key===S.selected);
  const photo=p=>D.photos[p.photoId],priceLabel=p=>p.priceTRY==null?'Fiyat teklifi':money(p.priceTRY),sizeText=p=>p.bundle?'Masa 120×48 cm · puf dahil':num(p.w)+' × '+num(p.d)+' cm',front=it=>({N:'S',E:'W',S:'N',W:'E'}[it.head]);
  const money=n=>Number(n).toLocaleString('tr-TR',{maximumFractionDigits:0})+' TL';
  const cost=(list,wards=S.wardBudget)=>list.reduce((sum,i)=>sum+(P[i.p].optional&&!wards?0:(P[i.p].priceTRY||0))+DrawerUI.accessoryCost(i,P[i.p],D),0);
  const wardrobeCost=list=>list.reduce((sum,i)=>sum+(P[i.p].optional?(P[i.p].priceTRY||0):0),0);
  function footBench(r,list){let bed=list.find(i=>P[i.p].cat==='bed');if(!bed)return false;let b=G.box(bed),side=front(bed);return list.some(i=>{if(P[i.p].cat!=='bench')return false;let q=G.box(i),horizontal=['N','S'].includes(side),overlap=horizontal?Math.min(b.x+b.w,q.x+q.w)-Math.max(b.x,q.x):Math.min(b.y+b.h,q.y+q.h)-Math.max(b.y,q.y),d=side==='N'?q.y-b.y-b.h:side==='S'?b.y-q.y-q.h:side==='E'?q.x-b.x-b.w:b.x-q.x-q.w;return overlap>=Math.min(horizontal?q.w:q.h,130)*.7&&d>=-.05&&d<=40;});}
  function conditional(r,list){return G.validate(r,list).details.some(d=>d.code==='window-height'&&d.keys.some(key=>list.some(i=>i.key===key&&P[i.p].cat==='bed')));}
  const quoteNeeded=list=>S.wardBudget&&list.some(i=>P[i.p].cat==='wardrobe'&&P[i.p].priceTRY==null);
  function renderBudget(){let bankRooms=D.rooms.filter(r=>footBench(r,S.layouts[r.id])),all=D.rooms.flatMap(r=>S.layouts[r.id]);$('#sp-room-total').textContent='Bu oda: '+money(cost(items()))+(quoteNeeded(items())?' + gardırop teklifi':'');$('#sp-all-total').textContent='Odalarım: '+money(D.rooms.reduce((n,r)=>n+cost(S.layouts[r.id]),0))+(quoteNeeded(all)?' + gardırop teklifleri':'');$('#sp-bench-target').textContent='Yatak önü Modesto bank: '+bankRooms.length+' oda';$('#sp-ward-budget').checked=S.wardBudget;}

  const builtinRooms=D.rooms.slice(),builtinIds=new Set(builtinRooms.map(r=>r.id));
  let customRoomSignature='';
  function syncCustomRooms(){
    // Retain the supplied layouts in S/R for recovery, but start the planner in
    // a personal, empty room rather than an invisible supplied client room.
    if(!S.customRooms.length){
      const d=SomassCustomRooms.normalize({id:'custom_my_room',name:'Odam',width:400,depth:350,height:270,openings:[]});
      S.customRooms=[d];S.layouts[d.id]=[];S.variants[d.id]='room_empty';
    }
    if(!S.customRooms.some(d=>d.id===S.room)){S.room=S.customRooms[0].id;S.selected=null;resetCamera();}
    const signature=JSON.stringify(S.customRooms||[]);if(signature===customRoomSignature)return;
    const generated=(S.customRooms||[]).map(d=>SomassCustomRooms.build(d));
    for(const id of Object.keys(R))if(!builtinIds.has(id)){delete R[id];delete D.variants[id];delete D.defaultVariant[id];delete defaultLayouts[id];}
    D.rooms.splice(0,D.rooms.length,...generated);
    for(const r of generated){
      R[r.id]=r;D.variants[r.id]=[{id:'room_empty',label:'Kendi yerleşimim',items:[],designNote:''}];
      D.defaultVariant[r.id]='room_empty';defaultLayouts[r.id]=[];
    }
    customRoomSignature=signature;
  }
  function validateSnapshot(snapshot){
    const m=snapshot?.modelContent||snapshot,u=snapshot?.privateContent||{};
    if(![4,5,6,7,8,9,10,11,12,13,14,15].includes(m?.version)||!m.layouts||!m.variants)throw new Error('Watkins 18 alternatif için kaydedilmiş güncel düzen dosyasını seçin.');
    const customRooms=m.version>=12?(m.customRooms||[]):[];
    if(!Array.isArray(customRooms)||customRooms.length>8)throw new Error('En fazla 8 özel oda kaydedilebilir.');
    const definitions=customRooms.map(d=>SomassCustomRooms.normalize(d)),allRooms=Object.fromEntries(builtinRooms.map(r=>[r.id,r]));
    for(const d of definitions){if(builtinIds.has(d.id)||Object.hasOwn(allRooms,d.id))throw new Error('Oda kimliği yineleniyor.');allRooms[d.id]=SomassCustomRooms.build(d);}
    const layouts={},variants={};
    for(const id of Object.keys(allRooms)){
      if(m.version<10){
        layouts[id]=copy(defaultLayouts[id]);variants[id]=D.defaultVariant[id];continue;
      }
      let list=m.layouts[id];if(m.version===4&&Array.isArray(list)){list=list.filter(i=>i?.p!=='PUF55').map(i=>{let n={...i};delete n.linkedTo;if(n.p==='V120'){if(n.head==='N')n.y-=22;if(n.head==='E')n.x-=22;}return n;});}if(!Array.isArray(list)||list.length>35)throw new Error(id+': ürün listesi geçersiz.');
      const keys=new Set();layouts[id]=list.map(it=>{
        if(!it||typeof it.key!=='string'||!it.key.length||it.key.length>80||keys.has(it.key)||!Object.hasOwn(P,it.p)||!heads.includes(it.head)||![it.x,it.y].every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=10000))throw new Error(id+': ürün veya koordinat geçersiz.');
        keys.add(it.key);const n={key:it.key,p:it.p,x:it.x,y:it.y,head:it.head};if(P[it.p].cat==='vanity')n.useDepth=it.useDepth===60?60:75;if(P[it.p].cat==='bed'&&['linen-white','stone-folded','sage-relaxed','hotel-tailored','warm-layered'].includes(it.beddingStyle))n.beddingStyle=it.beddingStyle;if(DrawerUI.canHandle(P[it.p]))n.drawerConfiguration=DrawerUI.normalizeChoice(it.drawerConfiguration,{legacy:m.version<15});return n;
      });
      const v=m.variants[id];if(typeof v!=='string'||!(v==='custom'||(builtinIds.has(id)?D.variants[id].some(a=>a.id===v):v==='room_empty')))throw new Error(id+': yerleşim seçeneği geçersiz.');variants[id]=v;
    }
    const zoom=Number.isFinite(u.zoom)?Math.max(.65,Math.min(2.5,u.zoom)):1;
    return DrawerUI.migrateSnapshot({customRooms:definitions,roomStyles:Object.fromEntries(Object.entries(m.roomStyles||{}).filter(([id])=>Object.hasOwn(allRooms,id)).map(([id,a])=>[id,SomassRoomFinishes.normalize(a)])),layouts,variants,room:Object.hasOwn(allRooms,m.room)?m.room:'Z1',dims:true,labels:true,openings:false,raw:false,zoom,wardBudget:m.version===4?true:u.wardBudget!==false,camera:null,selected:null},P,{legacy:m.version<15});
  }
  try{if(window.openai?.widgetState)Object.assign(S,validateSnapshot(window.openai.widgetState));}catch{}
  syncCustomRooms();
  function snapshot(){return {modelContent:{version:15,roomStyles:S.roomStyles,finish:'Natürel Meşe',room:S.room,layouts:S.layouts,variants:S.variants,customRooms:S.customRooms},privateContent:{dims:S.dims,labels:S.labels,openings:S.openings,raw:S.raw,zoom:S.zoom,wardBudget:S.wardBudget}};}
  function customerSnapshot(){
    const value=copy(snapshot()),m=value.modelContent,ids=new Set(S.customRooms.map(r=>r.id));
    for(const field of ['layouts','variants','roomStyles'])m[field]=Object.fromEntries(Object.entries(m[field]||{}).filter(([id])=>ids.has(id)));
    return value;
  }
  function restoreCustomerSnapshot(value){
    const candidate=copy(value),m=candidate.modelContent;
    if(!m||m.version!==15||!Array.isArray(m.customRooms)||!m.customRooms.length)throw new Error('Müşterinin oda kaydı geçersiz.');
    const builtinLayouts={},builtinVariants={};
    for(const r of builtinRooms){builtinLayouts[r.id]=copy(defaultLayouts[r.id]);builtinVariants[r.id]=D.defaultVariant[r.id];}
    m.layouts={...builtinLayouts,...m.layouts};m.variants={...builtinVariants,...m.variants};
    const restored=validateSnapshot(candidate);
    if(drag)throw new Error('Önce ürün taşımayı tamamlayın.');
    Object.assign(S,restored);undo=[];redo=[];customRoomSignature='';resetCamera();render();persist();
  }
  function emptyCustomerSnapshot(){
    const id='custom_'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8));
    const definition=SomassCustomRooms.normalize({id,name:'Odam',width:400,depth:350,height:270,openings:[]});
    return {modelContent:{version:15,finish:'Natürel Meşe',room:id,customRooms:[definition],layouts:{[id]:[]},variants:{[id]:'room_empty'},roomStyles:{}},privateContent:{dims:true,labels:true,openings:false,raw:false,zoom:1,wardBudget:true}};
  }
  function persist(){
    customerWorkspace?.changed();
    const value=copy(snapshot()),signature=JSON.stringify(value);ownSnapshots.add(signature);if(ownSnapshots.size>100)ownSnapshots.delete(ownSnapshots.values().next().value);

    saveQueue=saveQueue.catch(()=>{}).then(async()=>{try{if(window.openai?.setWidgetState)await window.openai.setWidgetState(value);}catch{}});
  }
  function editSnapshot(){return copy({room:S.room,layouts:S.layouts,variants:S.variants,customRooms:S.customRooms,roomStyles:S.roomStyles,selected:S.selected});}
  function remember(before){undo.push(before);if(undo.length>60)undo.shift();redo=[];}
  function mutate(fn){const before=editSnapshot();fn();if(JSON.stringify(before)===JSON.stringify(editSnapshot()))return;remember(before);S.variants[S.room]='custom';render();persist();}
  function message(text){const el=$('#sp-save-state');if(el)el.textContent=text;}
  function select(key){S.selected=key;renderInspector();renderList();draw();}
  function resetCamera(){S.zoom=1;S.camera=null;}
  function moveRoom(id){if(!R[id])return;S.room=id;S.selected=null;resetCamera();render();persist();}
  function transform(it,r){let p=P[it.p];if(it.head==='N')return `translate(${it.x} ${r.h-it.y-p.d})`;if(it.head==='S')return `translate(${it.x+p.w} ${r.h-it.y}) rotate(180)`;if(it.head==='E')return `translate(${it.x+p.d} ${r.h-it.y-p.w}) rotate(90)`;return `translate(${it.x} ${r.h-it.y}) rotate(-90)`;}
  function dimensionLine(x1,y1,x2,y2,label,fs,cls='sp-room-dimension'){
    const vertical=Math.abs(x1-x2)<.01,mx=(x1+x2)/2,my=(y1+y2)/2,t=3*fs/12;
    return `<g class="${cls}"><path d="M${x1} ${y1}L${x2} ${y2}M${x1-(vertical?t:0)} ${y1-(vertical?0:t)}l${vertical?2*t:0} ${vertical?0:2*t}M${x2-(vertical?t:0)} ${y2-(vertical?0:t)}l${vertical?2*t:0} ${vertical?0:2*t}"/><text x="${mx}" y="${my-4*fs/12}" ${vertical?`transform="rotate(-90 ${mx} ${my})"`:''} text-anchor="middle" font-size="${fs}">${esc(label)}</text></g>`;
  }
  function roomDimensions(r,unit){
    const fs=12*unit,o=30*unit;let out='';
    if(r.poly.length===4){out+=dimensionLine(0,r.h+o,r.w,r.h+o,num(r.w)+' cm',fs);out+=dimensionLine(-o,r.h,-o,0,num(r.h)+' cm',fs);return out;}
    for(let i=0;i<r.poly.length;i++){
      let a=r.poly[i],b=r.poly[(i+1)%r.poly.length],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),off=o;
      if(len<65)off=o+12*unit;
      const ox=dy/len*off,oy=-dx/len*off;
      out+=dimensionLine(a[0]+ox,r.h-a[1]-oy,b[0]+ox,r.h-b[1]-oy,num(len)+' cm',fs);
    }return out;
  }
  function productDims(it,r,unit){let b=G.box(it),y=r.h-b.y-b.h,o=6*unit,fs=11.5*unit;return dimensionLine(b.x,y+b.h+o,b.x+b.w,y+b.h+o,num(b.w),fs,'sp-dimension')+dimensionLine(b.x-o,y+b.h,b.x-o,y,num(b.h),fs,'sp-dimension');}
  function label(it,r,unit,narrow){
    let p=P[it.p],b=G.box(it);if(narrow&&p.cat==='night')return '';
    let rotated=['dresser','vanity','wardrobe','bench'].includes(p.cat)&&b.h>b.w*1.25,space=(rotated?b.h:b.w)/unit;
    let lines=p.cat==='bed'?[(p.series||'Watkins')+' · '+(p.mattress?.[0]||num(p.w))]:p.cat==='night'?[space>=48?p.series:p.id,space>=48?'Komodin':num(p.w)+'×'+num(p.d)]:p.cat==='vanity'?['Modesto','Makyaj seti']:p.cat==='dresser'?[p.series,'Şifonyer · '+num(p.w)]:p.cat==='bench'?['Modesto','Bank · 130']:p.cat==='wardrobe'?[(p.series||'Noah')+' gardırop',num(p.w)+'×'+num(p.d)]:[p.series||'',p.typeLabel||p.name];
    let x=b.x+b.w/2,y=r.h-b.y-b.h/2,fs=11.5*unit,gap=13*unit;
    return `<g class="sp-product-label" pointer-events="none" ${rotated?`transform="rotate(-90 ${x} ${y})"`:''}>${lines.map((t,j)=>`<text x="${x}" y="${y+(j-(lines.length-1)/2)*gap}" dominant-baseline="middle" text-anchor="middle" font-size="${fs}">${esc(t)}</text>`).join('')}</g>`;
  }
  function clearanceLines(it,r,list,unit){let b=G.box(it),c=G.clearances(r,list,it),sides=P[it.p].cat==='bed'?heads.filter(s=>s!==it.head):[front(it)],out='';for(let side of sides){let v=c[side];if(v<5||!Number.isFinite(v))continue;let x=b.x+b.w/2,y=r.h-b.y-b.h/2,x2=x,y2=y;if(side==='W'){x=b.x;x2=x-v;}if(side==='E'){x=b.x+b.w;x2=x+v;}if(side==='N'){y=r.h-b.y-b.h;y2=y-v;}if(side==='S'){y=r.h-b.y;y2=y+v;}out+=dimensionLine(x,y,x2,y2,num(v)+' cm',12*unit,'sp-clearance');}return out;}
  function planMarkup(r,list,opt={}){
    const width=opt.width||700,height=opt.height||650,zoom=opt.zoom||1,bw=r.w+155,bh=r.h+155,w=bw/zoom,h=bh/zoom,center=opt.camera||{x:r.w/2,y:r.h/2},view=[center.x-w/2,center.y-h/2,w,h],unit=Math.max(w/width,h/height),checks=G.validate(r,list);
    let html=`<title>${esc((r.custom?r.name:r.id)+' · '+r.sizeLabel)}</title><desc>Ölçüler santimetre. Ürünleri sürükleyerek taşıyabilir ve döndürebilirsiniz.</desc><g class="sp-arch" pointer-events="none">${r.arch}</g>`;
    if(opt.openings)for(const reserve of checks.reserves||[]){const b=reserve.box;html+=`<rect class="sp-opening ${reserve.blockedBy?.length||reserve.outside?'sp-reserve-blocked':''}" x="${b.x}" y="${r.h-b.y-b.h}" width="${b.w}" height="${b.h}"/>`;}
    for(let it of list){let b=G.box(it),y=r.h-b.y-b.h;html+=`<g class="sp-item" data-key="${esc(it.key)}"><g class="sp-asset" transform="${transform(it,r)}" pointer-events="none">${P[it.p].asset}</g><rect class="sp-hit" x="${b.x}" y="${y}" width="${b.w}" height="${b.h}"/>${checks.bad.has(it.key)?`<rect class="sp-bad-outline" x="${b.x}" y="${y}" width="${b.w}" height="${b.h}"/>`:''}${opt.selected===it.key?`<rect class="sp-select-outline" x="${b.x-1}" y="${y-1}" width="${b.w+2}" height="${b.h+2}"/>`:''}</g>`;}
    html+=roomDimensions(r,unit);
    if(opt.labels!==false)for(let it of list)html+=label(it,r,unit,width<420);
    if(opt.dims!==false)for(let it of list)if(width>=420||P[it.p].cat==='bed'||it.key===opt.selected)html+=productDims(it,r,unit);
    let sel=list.find(i=>i.key===opt.selected);if(sel)html+=clearanceLines(sel,r,list,unit);
    return {html,view,checks};
  }
  function draw(){const c=$('#sp-canvas'),b=c.getBoundingClientRect(),out=planMarkup(room(),items(),{width:b.width||700,height:b.height||650,zoom:S.zoom,camera:S.camera,selected:S.selected,dims:S.dims,labels:S.labels,openings:S.openings});c.setAttribute('viewBox',out.view.join(' '));c.innerHTML=out.html;c.classList.toggle('sp-raw',S.raw);$('#sp-scale').textContent='Dış ölçüler cm · '+Math.round(S.zoom*100)+'%';renderChecks(out.checks);if(viewer3d)viewer3d.sync(room(),items(),S.selected);}
  function bedDetails(){let lines=[];for(let bed of items().filter(i=>P[i.p].cat==='bed')){let b=G.box(bed),side=front(bed),gap=G.clearances(room(),items(),bed)[side],bench=items().find(it=>{if(P[it.p].cat!=='bench')return false;let q=G.box(it),aligned=['W','E'].includes(side)?Math.min(b.y+b.h,q.y+q.h)>Math.max(b.y,q.y):Math.min(b.x+b.w,q.x+q.w)>Math.max(b.x,q.x),d=side==='W'?b.x-q.x-q.w:side==='E'?q.x-b.x-b.w:side==='S'?b.y-q.y-q.h:q.y-b.y-b.h;return aligned&&Math.abs(d-gap)<.2;});if(bench){let a=G.clearances(room(),items(),bench)[side];lines.push({text:'Yatak–bank '+num(gap)+' cm · Bank önü '+num(a)+' cm',warning:a<60?'Bank önünde '+num(a)+' cm ile dar geçiş var.':null});}else lines.push({text:'Yatak önü '+num(gap)+' cm',warning:gap<60?'Yatak önünde '+num(gap)+' cm ile dar geçiş var.':null});}return lines;}
  function renderChecks(ch){
    const e=$('#sp-checks'),n=items().filter(i=>P[i.p].cat==='night').length,g=items().reduce((n,i)=>n+(P[i.p].modules||0),0);
    const details=bedDetails(),all=[...ch.errors,...ch.warnings,...details.filter(d=>d.warning).map(d=>d.warning)];e.classList.toggle('sp-warning',all.length>0);e.classList.toggle('sp-has-errors',ch.errors.length>0);
    e.innerHTML=`<div>${n} komodin · ${g} gardırop modülü · ${ch.errors.length?'Yerleşimde '+ch.errors.length+' çakışma / duvar sorunu':'Fiziksel çakışma yok'}</div><div>${esc(details.map(d=>d.text).join(' · '))}</div>`+(all.length?'<ul class="sp-errors">'+all.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul>':'');
    $('#sp-notes').textContent=S.variants[S.room]==='custom'?'Düzenlediğiniz yerleşim · Kapak/çekmece ve puf kullanım alanları yaklaşık rezerv olarak kontrol edilir.':D.designNotes[S.variants[S.room]]||'';
  }
  function renderBedDrawerRows(){return items().map(it=>DrawerUI.accessoryRowHTML(it,P[it.p],D,esc,money)).join('');}
  function renderList(){let counts={};$('#sp-items').innerHTML=items().map(it=>{let p=P[it.p],n=counts[it.p]=(counts[it.p]||0)+1,more=items().filter(a=>a.p===it.p).length>1;return `<div class="sp-product-row"><button type="button" class="sp-row cursor-interaction" data-select="${esc(it.key)}" aria-pressed="${it.key===S.selected}"><img src="${photo(p)}" alt="${esc(p.name)}"><span><span class="sp-name">${esc(DrawerUI.displayName(it,p))}${more?' · '+n:''}</span><span class="sp-size">${esc(sizeText(p))} · ${esc(p.finish||'Natürel Meşe')}</span><span class="sp-price">${priceLabel(p)}</span></span></button><button type="button" class="sp-remove" data-remove="${esc(it.key)}" aria-label="${esc(p.name)} kaldır">×</button></div>`;}).join('')+renderBedDrawerRows();}

  const beddingChoices=[
    {id:'linen-white',label:'Kırık beyaz keten',base:'#f4f0e7',sheet:'#ece6d9',back:'#e7dfd0',pillow:'#faf7f0',accent:'#ded3be'},
    {id:'stone-folded',label:'Taş ve yulaf',base:'#ded5c6',sheet:'#eee8dc',back:'#cfc0a8',pillow:'#f4efe5',accent:'#a9977e'},
    {id:'sage-relaxed',label:'Soluk zeytin keten',base:'#b4b79e',sheet:'#eee6d6',back:'#c6c7ae',pillow:'#f0eadd',accent:'#d8c9ad',noThrow:true,asymmetric:true},
    {id:'hotel-tailored',label:'Sıcak çikolata pamuk',base:'#978574',sheet:'#e8dfcf',back:'#b9a58c',pillow:'#f4eddf',accent:'#d3c09d',noBack:true},
    {id:'warm-layered',label:'İnce çizgili keten',base:'#e8ddca',sheet:'#e5d8c2',back:'#c7b395',pillow:'#f5eddf',accent:'#a69073',striped:true}
  ].map(v=>({...v,label:window.SomassBedTextiles?.styles?.find(s=>s.id===v.id)?.label||v.label}));
  function beddingIllustration(v){
    const pattern='sp-bed-stripe-'+v.id,outline='M12 9Q40 7 72 10L72 64Q43 67 12 64Z';
    return '<svg viewBox="0 0 84 76" aria-hidden="true" focusable="false">'+(v.striped?'<defs><pattern id="'+pattern+'" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M2 0V5" stroke="#746555" stroke-width=".45" opacity=".55"/></pattern></defs>':'')+'<rect x="9" y="5" width="66" height="66" rx="3" fill="#80735f" opacity=".09"/><rect x="10" y="4" width="64" height="65" rx="3" fill="'+v.sheet+'"/><path d="'+outline+'" fill="'+v.base+'"/>'+(v.striped?'<path d="'+outline+'" fill="url(#'+pattern+')"/>':'')+(v.noBack?'':'<rect x="15" y="8" width="23" height="16" rx="3" fill="'+v.back+'"/><rect x="46" y="8" width="23" height="16" rx="3" fill="'+v.back+'"/>')+'<rect x="14" y="'+(v.noBack?12:27)+'" width="25" height="12" rx="4" fill="'+v.pillow+'"/><rect x="44" y="'+(v.noBack?13:v.asymmetric?30:28)+'" width="25" height="12" rx="4" fill="'+v.pillow+'"/>'+(v.noThrow?'':'<path d="M12 50Q43 53 72 49L71 63Q42 65 13 63Z" fill="'+v.accent+'"/><path d="M15 53Q42 55 68 52" fill="none" stroke="#fffdf9" stroke-width=".7" opacity=".6"/>')+'</svg>';
  }
  function bedStyleControls(it,p){
    if(p.cat!=='bed')return'';const chosen=it.beddingStyle||'linen-white',fabrics=window.SomassHeadboardFabrics?.optionsFor(p)||[];
    const fabricHTML=fabrics.length&&!inspectorFamily.hasFabricControl(p.id)?'<div class="sp-bed-setting"><h4>Başlık kumaşı</h4><div class="sp-headboard-options" role="group" aria-label="Başlık kumaşı">'+fabrics.map(v=>'<button type="button" data-headboard-pid="'+esc(v.pid)+'" aria-pressed="'+String(v.selected||v.pid===p.id)+'"><i style="background:'+esc(v.color||'#d8cdb8')+'"></i><span>'+esc(v.label)+'</span></button>').join('')+'</div></div>':'';
    return fabricHTML+'<div class="sp-bed-setting"><h4>Yatak tekstili <small>5 serim</small></h4><div class="sp-bedding-options" role="group" aria-label="Yatak tekstili">'+beddingChoices.map(v=>'<button type="button" data-bedding-style="'+v.id+'" aria-pressed="'+String(v.id===chosen)+'" aria-label="'+esc(v.label)+'" title="'+esc(v.label)+'">'+beddingIllustration(v)+'<span>'+esc(v.label)+'</span></button>').join('')+'</div></div>';
  }

  function renderInspector(){let it=selected(),el=$('#sp-inspector');if(!it){if(room().custom&&!items().length){el.innerHTML='<h3>Odan hazır</h3><div class="sp-sub">Fotoğraflı katalogdan ürün ekle; 2D veya 3D görünümde yerini ve yönünü düzenle.</div>';return;}el.innerHTML='<h3>Ürünü seçerek düzenleyin</h3><div class="sp-sub">Ürüne tıklayın; modelini değiştirin veya döndürün. 3D görünümde Ürün taşı ile yerini değiştirebilirsiniz.</div>';return;}let p=P[it.p];el.innerHTML=`<div class="sp-selected-top"><img src="${photo(p)}" alt="${esc(p.name)}"><div><div class="sp-selected-title">${esc(p.name)}</div><div class="sp-sub">${esc(sizeText(p))}</div><div class="sp-sub">${esc(p.finish||'Natürel Meşe')} · ${priceLabel(p)}</div></div></div>${inspectorFamily.controlsHTML(p.id)}${DrawerUI.roomControlsHTML(it,p,esc)}${bedStyleControls(it,p)}<div class="sp-editbuttons"><button type="button" data-action="rotate">90° döndür</button><button type="button" data-action="delete">Kaldır</button></div>${p.note?'<div class="sp-sub">'+esc(p.note)+'</div>':''}${p.source?.url?'<a class="sp-sub" href="'+esc(p.source.url)+'" target="_blank" rel="noopener noreferrer">Resmî ürün sayfası ↗</a>':''}`;}
  function render(){
    syncCustomRooms();
    $('#sp-rooms').innerHTML=D.rooms.map(r=>`<button type="button" class="cursor-interaction" data-room="${esc(r.id)}" aria-pressed="${r.id===S.room}" title="${esc(r.name)}">${esc(r.custom?r.name:r.id)}</button>`).join('');
    let vs=D.variants[S.room];$('#sp-variant').hidden=vs.length===1&&S.variants[S.room]!=='custom';$('#sp-single-variant').hidden=!$('#sp-variant').hidden;$('#sp-single-variant').textContent=vs[0].label;
    $('#sp-variant').innerHTML=vs.map(v=>`<option value="${v.id}" ${S.variants[S.room]===v.id?'selected':''}>${esc(v.label)}</option>`).join('')+(S.variants[S.room]==='custom'?'<option value="custom" selected>Düzenlediğiniz yerleşim</option>':'');
    $('#sp-roomname').textContent=room().custom?room().name:room().id+' · '+room().name;$('#sp-area').textContent=room().area+(room().custom?'':' · kaynak etiketi');$('#sp-roomsize').textContent=room().sizeLabel;
    $('#sp-room-edit').hidden=!room().custom;$('#sp-default').textContent=room().custom?'Odayı boşalt':'Oda önerisine dön';
    root.querySelector('.sp-comparison').hidden=!!room().custom;
    for(const [id,k] of [['sp-dims','dims'],['sp-labels','labels'],['sp-openings','openings'],['sp-raw','raw']])$('#'+id).checked=S[k];
    $('#sp-undo').disabled=!undo.length;$('#sp-redo').disabled=!redo.length;renderList();renderInspector();renderBudget();renderComparison();if(catalog)renderCatalog();draw();
  }
  function renderComparison(){$('#sp-compare').innerHTML=D.variants[S.room].map(v=>{let list=v.items,has=cat=>list.some(i=>P[i.p].cat===cat),g=list.reduce((n,i)=>n+(P[i.p].modules||0),0);return `<div class="sp-compare-row"><strong>${esc(v.label)}</strong><span>${footBench(room(),list)?'Ayak ucunda bank':has('bench')?'Bank girişte':'Bank yok'} · ${has('dresser')?'Şifonyer':'Şifonyer yok'} · ${has('vanity')?'Makyaj seti':'Makyaj seti yok'}${g?' · '+g+' bitişik gardırop':''}</span><small>${esc(v.designNote)}</small></div>`;}).join('');}
  function rotate(it){let b=G.box(it),cx=b.x+b.w/2,cy=b.y+b.h/2;it.head=heads[(heads.indexOf(it.head)+1)%4];let q=G.box(it);it.x=round(cx-q.w/2);it.y=round(cy-q.h/2);}
  function spaceNights(bed,old){const q=G.box(bed),gap=room().minimumNightGap??5;for(let it of items()){
    if(P[it.p].cat!=='night'||it.head!==bed.head)continue;let n=G.box(it),horizontal=['N','S'].includes(bed.head),backDistance=horizontal?Math.abs((bed.head==='N'?n.y+n.h:n.y)-(bed.head==='N'?old.y+old.h:old.y)):Math.abs((bed.head==='E'?n.x+n.w:n.x)-(bed.head==='E'?old.x+old.w:old.x));if(backDistance>60)continue;
    if(horizontal){if(Math.abs(n.x+n.w-old.x)<=30)it.x=round(q.x-gap-n.w);else if(Math.abs(n.x-old.x-old.w)<=30)it.x=round(q.x+q.w+gap);}else{if(Math.abs(n.y+n.h-old.y)<=30)it.y=round(q.y-gap-n.h);else if(Math.abs(n.y-old.y-old.h)<=30)it.y=round(q.y+q.h+gap);}
  }}
  function replace(it,pid){const gap=room().minimumNightGap??5;let old=G.box(it),anchor=it.head==='N'?[old.x+old.w/2,old.y+old.h]:it.head==='S'?[old.x+old.w/2,old.y]:it.head==='E'?[old.x+old.w,old.y+old.h/2]:[old.x,old.y+old.h/2];it.p=pid;let q=G.box(it);if(it.head==='N'){it.x=anchor[0]-q.w/2;it.y=anchor[1]-q.h;}if(it.head==='S'){it.x=anchor[0]-q.w/2;it.y=anchor[1];}if(it.head==='E'){it.x=anchor[0]-q.w;it.y=anchor[1]-q.h/2;}if(it.head==='W'){it.x=anchor[0];it.y=anchor[1]-q.h/2;}it.x=round(it.x);it.y=round(it.y);if(P[it.p].cat==='bed')spaceNights(it,old);else if(P[it.p].cat==='night'){const bed=items().find(b=>P[b.p].cat==='bed');if(bed){const b=G.box(bed),n=G.box(it),horizontal=['N','S'].includes(bed.head);if(horizontal){if(old.x+old.w<=b.x+.05)it.x=round(b.x-gap-n.w);else if(old.x>=b.x+b.w-.05)it.x=round(b.x+b.w+gap);}else{if(old.y+old.h<=b.y+.05)it.y=round(b.y-gap-n.h);else if(old.y>=b.y+b.h-.05)it.y=round(b.y+b.h+gap);}}}}
  function freePosition(pid){
    let candidates=[],p=P[pid],orientations=heads;
    for(let head of orientations){let proto={p:pid,head,x:0,y:0,key:'probe'},b=G.box(proto),xs=[0,room().w-b.w],ys=[0,room().h-b.h];for(let x=5;x<room().w-b.w;x+=10)xs.push(x);for(let y=5;y<room().h-b.h;y+=10)ys.push(y);for(let [x,y] of room().poly){xs.push(x,x-b.w);ys.push(y,y-b.h);}
      for(let x of new Set(xs))for(let y of new Set(ys)){let it={...proto,x:round(x),y:round(y)},bb=G.box(it);if(!G.rectInside(room(),bb))continue;if(p.cat==='wardrobe'&&!G.backSupport(room(),it).supported)continue;if(items().some(o=>{let q=G.box(o);return Math.min(bb.x+bb.w,q.x+q.w)-Math.max(bb.x,q.x)>.05&&Math.min(bb.y+bb.h,q.y+q.h)-Math.max(bb.y,q.y)>.05;}))continue;let distance=Math.hypot(x+b.w/2-room().w/2,y+b.h/2-room().h/2)+(['dresser','night','vanity','bed'].includes(p.cat)&&!G.backSupport(room(),it).supported?500:0);candidates.push({it,distance});}
    }
    candidates.sort((a,b)=>a.distance-b.distance);let best=null,baseline=G.validate(room(),items()).warnings.length,tested=0;
    for(const c of candidates){
      const offsets=[0];
      for(const offset of offsets){const candidate={...c.it,poufOffset:offset},additions=[candidate];if(G.validate(room(),additions).errors.length)continue;if(additions.some(i=>items().some(o=>G.overlap(G.box(i),G.box(o)))))continue;const warnings=G.validate(room(),[...items(),...additions]).warnings.length,score=c.distance+warnings*10000+Math.abs(offset)*.01;if(!best||score<best.score)best={it:candidate,score,warnings};}
      if(best&&best.warnings<=baseline)break;
      if(++tested>=100)break;
    }
    return best?.it;
  }

  function canAdd(p){return items().length+1<=35&&!(['bed','wardrobe','vanity'].includes(p.cat)&&items().some(i=>P[i.p].cat===p.cat));}
  function removeItem(key){mutate(()=>{S.layouts[S.room]=items().filter(i=>i.key!==key&&i.linkedTo!==key);if(!items().some(i=>i.key===S.selected))S.selected=null;});}
  function renderCatalog(){fullCatalog?.refresh();}

  root.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b||b.type==='submit')return;
    if(b.dataset.drawerConfiguration&&selected()&&DrawerUI.canHandle(P[selected().p])){
      const mode=b.dataset.drawerConfiguration;if(!['none','four'].includes(mode))return;if(DrawerUI.configuration(selected())!==mode)mutate(()=>{selected().drawerConfiguration=mode;});root.querySelector('[data-drawer-configuration="'+mode+'"]')?.focus({preventScroll:true});return;
    }
    if(b.dataset.beddingStyle&&selected()&&P[selected().p].cat==='bed'){
      const id=b.dataset.beddingStyle;if(!beddingChoices.some(v=>v.id===id))return;if((selected().beddingStyle||'linen-white')!==id)mutate(()=>{selected().beddingStyle=id;});root.querySelector('[data-bedding-style="'+id+'"]')?.focus({preventScroll:true});return;
    }
    if(b.dataset.headboardPid&&selected()){
      const pid=b.dataset.headboardPid,opts=window.SomassHeadboardFabrics?.optionsFor(P[selected().p])||[];
      if(opts.some(v=>v.pid===pid)&&selected().p!==pid)mutate(()=>{selected().p=pid;});root.querySelector('[data-headboard-pid="'+pid+'"]')?.focus({preventScroll:true});return;
    }
    if(b.dataset.room){moveRoom(b.dataset.room);return;}if(b.dataset.select){select(b.dataset.select);return;}
    if(b.dataset.remove){removeItem(b.dataset.remove);return;}
    if(b.dataset.add){let p=P[b.dataset.add];if(!p||p.hidden||!canAdd(p)){message('Bu türden mevcut ürünü seçip modelini değiştirebilirsiniz.');return;}const pos=freePosition(b.dataset.add);if(!pos){message('Bu ürün ve kullanım bileşenleri için odanın içinde boş, geçerli bir konum bulunamadı.');return;}mutate(()=>{pos.key='new_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6);delete pos.poufOffset;DrawerUI.initializeItem(pos,p,'none');items().push(pos);S.selected=pos.key;});return;}
    if(b.dataset.nudge&&selected()){const direction=b.dataset.nudge;mutate(()=>{let it=selected();it.x=round(it.x+({W:-1,E:1}[direction]||0));it.y=round(it.y+({N:1,S:-1}[direction]||0));});return;}
    if(b.dataset.action==='delete'&&selected()){removeItem(selected().key);return;}
    if(b.dataset.action&&selected()){mutate(()=>{let it=selected();if(b.dataset.action==='rotate')rotate(it);if(b.dataset.action==='duplicate'){if(items().length>=35||['bed','wardrobe','vanity','pouf'].includes(P[it.p].cat))return;let n={...it,key:'copy_'+Date.now().toString(36),x:it.x+15,y:it.y+15};items().push(n);S.selected=n.key;}});}
  });
  root.addEventListener('change',e=>{const it=selected();if(!it)return;const pid=inspectorFamily.targetFromEvent(it.p,e.target);if(pid&&pid!==it.p)mutate(()=>replace(selected(),pid));});
  $('#sp-variant').addEventListener('change',e=>{let v=D.variants[S.room].find(a=>a.id===e.target.value);if(!v)return;remember(editSnapshot());S.layouts[S.room]=copy(v.items);S.variants[S.room]=v.id;S.selected=null;resetCamera();render();persist();});
  $('#sp-ward-budget').addEventListener('change',e=>{S.wardBudget=e.target.checked;renderBudget();renderComparison();persist();});
  $('#sp-default').addEventListener('click',()=>{remember(editSnapshot());S.layouts[S.room]=copy(defaultLayouts[S.room]);S.variants[S.room]=D.defaultVariant[S.room];S.selected=null;resetCamera();render();persist();});
  $('#sp-undo').addEventListener('click',()=>{if(!undo.length)return;redo.push(editSnapshot());Object.assign(S,undo.pop());resetCamera();render();persist();});
  $('#sp-redo').addEventListener('click',()=>{if(!redo.length)return;undo.push(editSnapshot());Object.assign(S,redo.pop());resetCamera();render();persist();});
  for(const [id,k] of [['sp-dims','dims'],['sp-labels','labels'],['sp-openings','openings'],['sp-raw','raw']])$('#'+id).addEventListener('change',e=>{S[k]=e.target.checked;draw();persist();});
  for(const [id,f] of [['sp-zoomin',1.25],['sp-zoomout',.8]])$('#'+id).addEventListener('click',()=>{if(view3d&&viewer3d){viewer3d.zoom(f);return;}if(!S.camera&&selected()){let b=G.box(selected());S.camera={x:b.x+b.w/2,y:room().h-b.y-b.h/2};}S.zoom=Math.max(.65,Math.min(2.5,S.zoom*f));draw();persist();});
  $('#sp-fit').addEventListener('click',()=>{if(view3d&&viewer3d){viewer3d.fit();return;}resetCamera();draw();persist();});
  $('#sp-catalog-toggle').addEventListener('click',()=>fullCatalog?.toggle());

  const canvas=$('#sp-canvas');
  function point(e){let p=canvas.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(canvas.getScreenCTM().inverse());}
  canvas.addEventListener('pointerdown',e=>{if(drag||e.button!==0||e.isPrimary===false)return;let g=e.target.closest('[data-key]');if(!g)return;let it=items().find(i=>i.key===g.dataset.key);if(!it)return;e.preventDefault();select(it.key);let p=point(e);drag={id:e.pointerId,key:it.key,clientX:e.clientX,clientY:e.clientY,start:p,x:it.x,y:it.y,before:editSnapshot(),moved:false};$('#sp-checks').setAttribute('aria-live','off');canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;if(!drag.moved&&Math.hypot(e.clientX-drag.clientX,e.clientY-drag.clientY)<4)return;let it=items().find(i=>i.key===drag.key);if(!it)return;let p=point(e);it.x=round(drag.x+p.x-drag.start.x);it.y=round(drag.y-p.y+drag.start.y);drag.moved=true;if($('#sp-x'))$('#sp-x').value=it.x;if($('#sp-y'))$('#sp-y').value=it.y;if(!paint)paint=requestAnimationFrame(()=>{paint=0;draw();});});
  function finish(e,cancel){if(!drag||e.pointerId!==drag.id)return;let old=drag,it=items().find(i=>i.key===old.key);drag=null;if(paint){cancelAnimationFrame(paint);paint=0;}if(cancel&&it){it.x=old.x;it.y=old.y;}else if(old.moved&&it&&(it.x!==old.x||it.y!==old.y)){remember(old.before);S.variants[S.room]='custom';persist();}if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);$('#sp-checks').setAttribute('aria-live','polite');render();}
  canvas.addEventListener('pointerup',e=>finish(e,false));canvas.addEventListener('pointercancel',e=>finish(e,true));canvas.addEventListener('lostpointercapture',e=>finish(e,true));
  root.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag)finish({pointerId:drag.id},true);});
  function download(name,type,content){let url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;root.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  $('#sp-save')?.addEventListener('click',()=>{download('SO-MASS_Watkins_Yerlesim.json','application/json',JSON.stringify(snapshot(),null,2));message('Altı odanın düzeni indirildi. Düzen aç ile geri yükleyebilirsiniz.');});
  $('#sp-import')?.addEventListener('change',async e=>{let file=e.target.files?.[0];if(!file)return;try{if(file.size>100000)throw new Error('Düzen dosyası çok büyük.');let restored=validateSnapshot(JSON.parse(await file.text()));remember(editSnapshot());Object.assign(S,restored);render();persist();message('Altı odanın düzeni yüklendi.');}catch(err){message('Düzen açılmadı: '+err.message);}finally{e.target.value='';}});
  function printPages(){return D.rooms.map(r=>{let list=S.layouts[r.id],out=planMarkup(r,list,{width:1000,height:800,labels:true,dims:true}),v=S.variants[r.id];return `<section class="sp-print-page"><h2>${r.custom?'':esc(r.id)+' · '}${esc(r.name)}</h2><div>${esc(r.sizeLabel)} · Natürel Meşe · 19.10.2026</div><div class="sp-print-grid"><svg viewBox="${out.view.join(' ')}">${out.html}</svg><div>${list.map(it=>{let p=P[it.p];return `<div class="sp-print-product"><img src="${photo(p)}" alt="${esc(p.name)}"><span>${esc(p.name)}<small>${num(p.w)} × ${num(p.d)} cm · ${priceLabel(p)}</small></span></div>`;}).join('')}</div></div><p>${esc(v==='custom'?'Düzenlediğiniz yerleşim':D.designNotes[v])}</p>${[...out.checks.errors,...out.checks.warnings].length?'<p>'+esc([...out.checks.errors,...out.checks.warnings].join(' · '))+'</p>':''}</section>`;}).join('')+`<section class="sp-print-catalog"><h2>Kullanılan ürünler · fotoğraflı katalog</h2><div>${Object.values(P).filter(p=>D.rooms.some(r=>S.layouts[r.id].some(i=>i.p===p.id))).map(p=>`<div class="sp-print-product"><img src="${photo(p)}" alt="${esc(p.name)}"><span>${esc(p.name)}<small>${num(p.w)} × ${num(p.d)} cm · ${priceLabel(p)}</small></span></div>`).join('')}</div></section>`;}
  $('#sp-print').addEventListener('click',async()=>{$('#sp-print-pages').innerHTML=printPages();await Promise.all([...$('#sp-print-pages').querySelectorAll('img')].map(i=>i.decode().catch(()=>{})));window.print();});
  window.addEventListener('openai:set_globals',e=>{let v=e.detail?.globals?.widgetState;if(!v)return;let signature=JSON.stringify(v);if(ownSnapshots.has(signature)){ownSnapshots.delete(signature);return;}if(signature===JSON.stringify(snapshot())||drag)return;try{Object.assign(S,validateSnapshot(v));undo=[];redo=[];render();}catch{}});
  
  function addCatalogueBundle(ids,entry){
    if(!Array.isArray(ids)||!ids.length||ids.some(id=>!P[id]))return{ok:false,message:'Takımın parça eşlemesi eksik.'};
    if(items().length+ids.length>35)return{ok:false,message:'Bu takım için odada yer açmak üzere birkaç ürünü kaldır.'};
    const r=room(),created=[],series=String(entry.series||entry.name||'').toLocaleLowerCase('tr'),dining=entry.type==='Yemek Masası Takımı',bedroom=entry.type==='Yatak Odası Takımı',hall=entry.type==='Antre Takımı';
    const counts={};let main=null,consoleItem=null;
    mutate(()=>{for(const pid of ids){const p=P[pid],index=counts[p.cat]||0;counts[p.cat]=index+1;let x=0,y=0,head='N',pos;
      if(dining&&p.cat==='table'){x=(r.w-p.w)/2;y=(r.h-p.d)/2;main={p,x,y};}
      else if(dining&&p.cat==='chair'&&main){const table=main,number=ids.filter(id=>P[id].cat==='chair').length,hasBench=ids.some(id=>P[id].cat==='bench'),sideCount=hasBench?Math.max(1,number-2):Math.max(1,Math.ceil((number-2)/2));if(index<number-2){const north=hasBench||index<sideCount,k=north?index:index-sideCount;x=table.x+(k+.5)*table.p.w/sideCount-p.w/2;y=north?table.y+table.p.d+4:table.y-p.d-4;head=north?'N':'S';}else{x=index===number-2?table.x-p.d-4:table.x+table.p.w+4;y=table.y+table.p.d/2-p.w/2;head=index===number-2?'W':'E';}}
      else if(dining&&p.cat==='bench'&&main){x=main.x+(main.p.w-p.w)/2;y=main.y-p.d-4;head='S';}
      else if(bedroom&&p.cat==='bed'){x=(r.w-p.w)/2;y=r.h-p.d;main={p,x,y};}
      else if(bedroom&&p.cat==='night'&&main){x=index===0?main.x-p.w:main.x+main.p.w;y=r.h-p.d;}
      else if(bedroom&&p.cat==='wardrobe'){head='W';x=0;y=Math.max(0,(r.h-p.w)/2);}
      else if(bedroom&&p.cat==='bench'&&main){x=main.x+(main.p.w-p.w)/2;y=Math.max(0,main.y-p.d-12);head='S';}
      else if(bedroom&&p.cat==='dresser'){head='S';x=index===0?(r.w-p.w)/2:Math.max(0,r.w-p.w);y=0;consoleItem={p,x,y,head};}
      else if(hall&&p.cat==='console'){x=(r.w-p.w)/2;y=r.h-p.d;consoleItem={p,x,y,head};}
      else if(p.cat==='mirror'&&consoleItem){x=consoleItem.x+(consoleItem.p.w-p.w)/2;y=consoleItem.head==='S'?0:r.h-p.d;head=consoleItem.head;}
      else{pos=freePosition(pid);if(pos){x=pos.x;y=pos.y;head=pos.head;}else{x=Math.max(0,(r.w-p.w)/2);y=Math.max(0,(r.h-p.d)/2);}}
      const it={p:pid,x:round(x),y:round(y),head,key:'set_'+Date.now().toString(36)+'_'+created.length+'_'+Math.random().toString(36).slice(2,5)};DrawerUI.initializeItem(it,p,'four');items().push(it);created.push(it);S.selected=it.key;
    }});return{ok:true,count:created.length};
  }

  function setView(three){
    view3d=three&&viewer3d&&viewer3d.isAvailable();
    root.classList.toggle('sp-is-3d',!!view3d);canvas.toggleAttribute('hidden',!!view3d);
    $('#sp-three').hidden=!view3d;$('#sp3-tools').hidden=!view3d;$('#sp3-info').hidden=!view3d;
    $('#sp-view3d').setAttribute('aria-pressed',String(!!view3d));$('#sp-view2d').setAttribute('aria-pressed',String(!view3d));
    viewer3d?.setActive(!!view3d);draw();
  }
  $('#sp3-expand').addEventListener('click',()=>{const panel=root.querySelector('.sp-plan-wrap'),expanded=panel.classList.toggle('sp3-expanded');$('#sp3-expand').textContent=expanded?'Küçült':'Büyüt';$('#sp3-expand').setAttribute('aria-pressed',String(expanded));viewer3d?.fit();});
  root.addEventListener('keydown',e=>{if(e.key==='Escape'&&root.querySelector('.sp3-expanded'))$('#sp3-expand').click();});
  viewer3d=Somass3DViewer.create({element:$('#sp-three'),root,data:D,geometry:G,
    getState:()=>({room:room(),items:items(),selected:S.selected}),onSelect:select,onMoveStart:editSnapshot,
    onMovePreview:(key,x,y)=>{const it=items().find(i=>i.key===key);if(it){it.x=round(x);it.y=round(y);}},
    onMoveEnd:(before,cancel)=>{if(cancel){Object.assign(S,before);}else if(JSON.stringify(before)!==JSON.stringify(editSnapshot())){remember(before);S.variants[S.room]='custom';persist();}render();}
  });
  function catalogAction(p){return ['bed','wardrobe','vanity'].includes(p.cat)&&items().some(i=>P[i.p].cat===p.cat)?'Odadaki modeli değiştir':'Odaya ekle';}
  fullCatalog=SomassFullCatalog.create({root,catalog:D.catalog,products:P,photos:D.photos,actionLabel:catalogAction,onAddBundle:addCatalogueBundle,
    onAdd:(pid,choice={})=>{const p=P[pid];if(!p)return{ok:false,message:'Ürün ölçüsü bulunamadı.'};
      const existing=['bed','wardrobe','vanity'].includes(p.cat)?items().find(i=>P[i.p].cat===p.cat):null;
      if(existing){mutate(()=>{if(existing.p!==pid)replace(existing,pid);DrawerUI.initializeItem(existing,p,choice.drawerConfiguration??'none');});return{ok:true};}
      if(items().length>=35)return{ok:false,message:'Bu odada en fazla 35 ürün tutulabilir; önce bir ürün kaldırın.'};
      let pos=p.cat==='rug'?{p:pid,x:(room().w-p.w)/2,y:(room().h-p.d)/2,head:'N'}:freePosition(pid);
      if(!pos)pos={p:pid,x:Math.max(0,(room().w-p.w)/2),y:Math.max(0,(room().h-p.d)/2),head:'N'};
      mutate(()=>{pos.key='catalog_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6);delete pos.poufOffset;DrawerUI.initializeItem(pos,p,choice.drawerConfiguration??'none');items().push(pos);S.selected=pos.key;});return{ok:true};}
  });
  roomEditor=SomassRoomEditor.create({root,geometry:SomassCustomRooms,
    onSave:definition=>{
      let d;try{d=SomassCustomRooms.normalize(definition);SomassCustomRooms.build(d);}catch(e){return{ok:false,message:e.message};}
      const index=S.customRooms.findIndex(r=>r.id===d.id);
      if(index<0&&S.customRooms.length>=8)return{ok:false,message:'En fazla 8 kendi odanı oluşturabilirsin.'};
      if(builtinIds.has(d.id))return{ok:false,message:'Bu oda adı kullanılamıyor.'};
      const before=editSnapshot();
      if(index<0){S.customRooms.push(d);S.layouts[d.id]=[];S.variants[d.id]='room_empty';}
      else S.customRooms[index]=d;
      S.roomStyles[d.id]=SomassRoomFinishes.normalize(d.appearance);
      S.room=d.id;S.selected=null;remember(before);resetCamera();render();persist();return{ok:true};
    },
    onDelete:id=>{
      if(!S.customRooms.some(r=>r.id===id))return{ok:false,message:'Oda bulunamadı.'};
      const before=editSnapshot();S.customRooms=S.customRooms.filter(r=>r.id!==id);delete S.layouts[id];delete S.variants[id];delete S.roomStyles[id];
      S.room=S.customRooms[0]?.id||'';S.selected=null;remember(before);resetCamera();render();persist();return{ok:true};
    }
  });
  SomassConfiguratorUI.create({root,getRoom:room,openCatalog:()=>fullCatalog.open(),editRoom:()=>{const d=S.customRooms.find(r=>r.id===S.room);roomEditor.open(d?{...copy(d),appearance:room().appearance}:null);},onAppearance:appearance=>{const before=editSnapshot();S.roomStyles[S.room]=SomassRoomFinishes.normalize(appearance);remember(before);render();persist();}});
  $('#sp-room-create').addEventListener('click',()=>roomEditor.open(null));
  $('#sp-room-edit').addEventListener('click',()=>{const d=S.customRooms.find(r=>r.id===S.room);if(d)roomEditor.open({...copy(d),appearance:room().appearance});});
  $('#sp3-catalog-open').addEventListener('click',()=>fullCatalog.open());
  $('#sp-view3d').addEventListener('click',()=>setView(true));$('#sp-view2d').addEventListener('click',()=>setView(false));
  customerWorkspace=SomassCustomerWorkspaces.create({root,getSnapshot:customerSnapshot,loadSnapshot:restoreCustomerSnapshot,emptySnapshot:emptyCustomerSnapshot});
  new ResizeObserver(()=>{if(!drag)draw();}).observe(canvas);render();setView(true);

})();
