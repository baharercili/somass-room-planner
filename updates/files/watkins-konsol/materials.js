/* Watkins 160 cm console concept: exact derived geometry + shared Watkins oak palette.
 * Does not register or alter any existing product/material provider.
 * Load guard-config.js before this file. Maps retain native pixels and physical repeats.
 */
(function(g){"use strict";
const CONFIG=g.SomassWatkinsConsole160GeometryConfig;
if(!CONFIG||CONFIG.key!=='WATKINS_CONSOLE160_DERIVED'||!CONFIG.parts||!CONFIG.finishes||Object.keys(CONFIG.parts).length!==27)throw Error('Load the exact Watkins console160 geometry guard before its studio adapter.');
const PRODUCT_FINISHES={WATKINS_CONSOLE160_NATURAL:'light',WATKINS_CONSOLE160_DARK:'dark'};
if(Object.keys(CONFIG.productFinishes||{}).length!==2||Object.entries(PRODUCT_FINISHES).some(([id,finish])=>CONFIG.productFinishes[id]!==finish))throw Error('Console160 guard must contain exactly the two local concept finishes.');
/* STUDIO_RUNTIME */
const VERSION='watkins-console160-studio-pbr-v1',states=new WeakMap(),texturePool=new Map();
const exact=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
function finishFor(product){
 const finish=PRODUCT_FINISHES[String(product?.id)],size=CONFIG.canonicalSizeCm;
 if(!Array.isArray(size)||size.length!==3)return null;
 return finish&&product.series==='Watkins'&&product.cat==='sideboard'&&
  Math.abs(+product.w-size[0])<.001&&Math.abs(+product.h-size[1])<.001&&Math.abs(+product.d-size[2])<.001&&
  product.finish===(finish==='dark'?'Koyu Meşe':'Natürel Meşe')?finish:null;
}
function canHandle(product){return !!finishFor(product);}
function fnv(array){let hash=2166136261;for(const byte of new Uint8Array(array.buffer,array.byteOffset,array.byteLength)){hash^=byte;hash=Math.imul(hash,16777619)>>>0;}return hash.toString(16).padStart(8,'0');}
function inventory(group){const meshes=[];group.traverse(mesh=>{if(mesh.isMesh&&mesh.userData.derivedFromOriginalSource===true&&mesh.userData.derivedPartId)meshes.push(mesh);});return meshes;}
function partsFor(){return CONFIG.parts;}
function partFor(mesh){return CONFIG.parts[mesh.userData.derivedPartId];}
function numberFor(part){const match=/^(?:derived160_)?part_(\d+)_/.exec(part.id);return match?Number(match[1]):NaN;}
function validate(group,product){
 if(!canHandle(product))throw Error('Unknown console160 product or dimensions.');
 const evidence=group.userData.modelEvidence,revision=CONFIG.derivedAssetSHA256||CONFIG.revision;
 if(group.userData.modelRevision!=='WATKINS_CONSOLE160_DERIVED-'+revision||evidence?.derivedAssetSHA256!==revision||evidence?.sourceAssetSHA256!==CONFIG.nativePackedSha256||evidence?.sourceGeometryIsOriginalCAD!==false||evidence?.derivedFromOriginalSource!==true)throw Error('Console160 studio materials require the exact guarded derived asset.');
 const meshes=inventory(group),seen=new Set();if(meshes.length!==27)throw Error('Exact 27 console160 derived source parts required.');
 for(const mesh of meshes){const part=partFor(mesh),geometry=mesh.geometry;
  if(!part||seen.has(part.id)||mesh.userData.sourceObjectId!==part.sourceObjectId||mesh.userData.sourcePartId!==(part.derivedFromPartId||part.sourcePartId)||mesh.userData.derivedPartId!==part.id)throw Error('Unknown or repeated console160 derived source part.');
  seen.add(part.id);
  for(const [attribute,key]of [['position','position'],['normal','normal'],['index','index']]){const array=(attribute==='index'?geometry.index:geometry.attributes[attribute])?.array;if(!array||fnv(array)!==part.hashes[key])throw Error('Console160 '+attribute+' bytes differ from the guarded derivation: '+part.id);}
 }
 return meshes;
}
function baseURL(options){const value=options.assetBaseURL||g.SomassWatkinsConsole160StudioMaterialAssetBase||CONFIG.assetDirectory;return new URL(String(value).endsWith('/')?value:value+'/',g.location?.href||'http://localhost/').href;}
function acquireMap(T,url,channel,width,height){
 const key=channel+' '+url;let entry=texturePool.get(key);if(entry&&!entry.error){entry.refs++;return entry;}if(entry&&texturePool.get(key)===entry)texturePool.delete(key);
 const texture=new T.Texture();texture.name='Watkins console160 studio '+channel+' '+url.split('/').slice(-2).join('/');texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.flipY=true;texture.colorSpace=channel==='color'?T.SRGBColorSpace:(T.NoColorSpace||'');texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.anisotropy=8;
 g.SomassStudioTextureSourceCache?.share(T,texture,url);
 entry={key,url,channel,texture,refs:1,error:null,loaded:false,ready:null,cancel:null};texturePool.set(key,entry);
 if(typeof g.Image!=='function'){entry.imageProcessingExcluded=true;entry.loaded=true;entry.ready=Promise.resolve(true);return entry;}
 entry.ready=new Promise(resolve=>{let done=false;const image=new g.Image();const settle=value=>{if(done)return;done=true;entry.loaded=value===true;image.onload=image.onerror=null;resolve(entry.loaded);};entry.cancel=()=>settle(false);const fail=error=>{entry.error=String(error?.message||error);settle(false);};image.onload=()=>{const accept=()=>{if(entry.refs<=0)return settle(false);if(image.naturalWidth!==width||image.naturalHeight!==height)return fail(Error('Studio map native dimensions differ.'));texture.image=image;texture.needsUpdate=true;settle(true);};if(typeof image.decode==='function')image.decode().then(accept,fail);else accept();};image.onerror=()=>fail(Error('Local Watkins console160 studio map failed: '+url));image.src=url;});return entry;
}
function release(entry){if(--entry.refs>0)return;entry.cancel?.();entry.texture.dispose();if(texturePool.get(entry.key)===entry)texturePool.delete(entry.key);}
function acquireFinish(T,finish,options){
 const records=CONFIG.finishes[finish],entries=[],maps={},byMaterial=new Map(),base=baseURL(options);let disposed=false;
 function ensure(ids){
  if(disposed)return Promise.resolve(false);
  const selected=[];
  for(const id of new Set(ids)){
   if(!exact(records.materials,id))throw Error('Unknown Watkins studio material: '+id);
   if(byMaterial.get(id)?.some(entry=>entry.error)){for(const entry of byMaterial.get(id)){entries.splice(entries.indexOf(entry),1);release(entry);}byMaterial.delete(id);delete maps[id];}
   if(!byMaterial.has(id)){const record=records.materials[id],owned=[];maps[id]={};for(const[channel,path]of Object.entries(record.maps)){const entry=acquireMap(T,new URL(path,base).href,channel,record.width,record.height);entries.push(entry);owned.push(entry);maps[id][channel]=entry.texture;}byMaterial.set(id,owned);}
   selected.push(...byMaterial.get(id));
  }
  return Promise.all(selected.map(entry=>entry.ready)).then(values=>!disposed&&values.every(Boolean));
 }
 return{maps,entries,ensure,readyFor:ids=>!disposed&&ids.every(id=>byMaterial.has(id)&&byMaterial.get(id).every(entry=>entry.loaded)),dispose(){if(disposed)return;disposed=true;entries.forEach(release);}};
}
function toneFor(finish){return g.SomassStudioFinishPolicy.defaultGain();}
function settings(finish,options={}){const draft=options.studioDraft||options,tone=Array.isArray(draft.toneRGB)&&draft.toneRGB.length===3&&draft.toneRGB.every(v=>Number.isFinite(v)&&v>0&&v<4)?draft.toneRGB.slice():toneFor(finish);return{assignments:{...(draft.assignments||{})},roughness:Number.isFinite(draft.roughness)?Math.max(.3,Math.min(.8,draft.roughness)):.45,relief:Number.isFinite(draft.relief)?Math.max(0,Math.min(3,draft.relief)):1,toneRGB:tone};}
function stateKey(finish,state){return JSON.stringify({assignments:Array.from(assignments(finish,state).entries()),roughness:state.roughness,relief:state.relief,toneRGB:state.toneRGB});}
function assignments(finish,state){const out=new Map(),materials=CONFIG.finishes[finish].materials;for(const group of CONFIG.finishes[finish].groups){const candidate=state.assignments[group.id],id=exact(materials,candidate)?candidate:group.defaultMaterial;for(const number of group.parts)out.set(number,{group:group.id,id});}return out;}
const commonVaryings='varying vec2 vStudioUv;varying vec2 vStudioEndUv;varying vec3 vStudioObjectNormal;';
function vertexMapping(part){
 const decimal=value=>Number.isInteger(value)?value.toFixed(1):String(value),minimum=part.boundsCm.min.map(decimal),offset=part.offset.map(decimal);
 const fixed='vStudioObjectNormal=normal;vStudioEndUv=(position.xy-vec2('+minimum[0]+','+minimum[1]+'))/10.0+vec2('+offset[0]+','+offset[1]+');';
 if(part.corner){const corner=part.corner;return fixed+'vec2 studioOutward=(position.xy-vec2('+decimal(corner.arcCenterCm[0])+','+decimal(corner.arcCenterCm[1])+'))*vec2('+decimal(corner.outwardSignsXY[0])+','+decimal(corner.outwardSignsXY[1])+');vStudioUv=vec2(atan(studioOutward.y,studioOutward.x)*'+decimal(corner.externalRadiusCm)+'/60.0,(position.z-('+minimum[2]+'))/60.0)+vec2('+offset[0]+','+offset[1]+');';}
 const axis={X:0,Y:1,Z:2}[part.axis],xyz=['x','y','z'],expressions=[];for(let face=0;face<3;face++){const remaining=[0,1,2].filter(value=>value!==face),v=remaining.includes(axis)?axis:remaining[1],u=remaining.find(value=>value!==v);expressions.push('vec2((position.'+xyz[u]+'-('+minimum[u]+'))/60.0,(position.'+xyz[v]+'-('+minimum[v]+'))/60.0)+vec2('+offset[0]+','+offset[1]+')');}
 return fixed+'vec3 studioAbs=abs(normal);if(studioAbs.x>=studioAbs.y&&studioAbs.x>=studioAbs.z){vStudioUv='+expressions[0]+';}else if(studioAbs.y>=studioAbs.z){vStudioUv='+expressions[1]+';}else{vStudioUv='+expressions[2]+';}';
}
function makeMaterial(T,part,assigned,bundle,finish,state){
 const maps=bundle.maps[assigned.id],end=bundle.maps[CONFIG.finishes[finish].endgrain];
 const material=new T.MeshPhysicalMaterial({name:'Watkins console160 studio '+assigned.id+' / '+part.id,color:0xffffff,map:maps.color,normalMap:maps.normal,roughnessMap:maps.roughness,roughness:state.roughness/.45,metalness:0,clearcoat:0,reflectivity:.5,normalScale:new T.Vector2(state.relief,state.relief),side:T.FrontSide});
 material.color.setRGB(...state.toneRGB);
 material.userData={materialClass:'wood',noGenericFinishGrading:true,skipGenericFinishGrading:true,studioMaterials:{colourAuthority:g.SomassStudioFinishPolicy.id,version:VERSION,finish,materialId:assigned.id,partGroup:assigned.group,sourcePartId:part.id,repeatCm:60,grainAxis:part.axis,fixedUVOffset:part.offset,rotationDegrees:0,mirrored:false,endgrainMaterialId:part.corner?CONFIG.finishes[finish].endgrain:null,endgrainRepeatCm:part.corner?10:null,nativeUVAttributeUnchanged:true,normalDirection:'OpenGL +Y',toneRGBLinear:state.toneRGB.slice(),roughnessControl:state.roughness,reliefControl:state.relief,displacementApplied:false,manufacturerPBR:false}};
 material.customProgramCacheKey=()=>VERSION+'/'+finish+'/'+(part.mappingRevision||'derived160')+'/'+part.id;
 material.onBeforeCompile=shader=>{
  for(const [name,channel]of [['studioEndColor','color'],['studioEndNormal','normal'],['studioEndRoughness','roughness']])shader.uniforms[name]={value:end[channel]};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+commonVaryings).replace('#include <begin_vertex>','#include <begin_vertex>\n'+vertexMapping(part));
  const selector=part.corner?'abs(vStudioObjectNormal.z)>0.0000001':'false';
  const declarations=commonVaryings+'uniform sampler2D studioEndColor;uniform sampler2D studioEndNormal;uniform sampler2D studioEndRoughness;bool studioIsEnd(){return '+selector+';}vec2 studioUV(){return studioIsEnd()?vStudioEndUv:vStudioUv;}';
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+declarations);
  const replacements={map_fragment:T.ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )','(studioIsEnd()?texture2D(studioEndColor,vStudioEndUv):texture2D(map,vStudioUv))'),roughnessmap_fragment:T.ShaderChunk.roughnessmap_fragment.replace('texture2D( roughnessMap, vRoughnessMapUv )','(studioIsEnd()?texture2D(studioEndRoughness,vStudioEndUv):texture2D(roughnessMap,vStudioUv))'),normal_fragment_begin:T.ShaderChunk.normal_fragment_begin.replace(/\bvNormalMapUv\b/g,'studioUV()'),normal_fragment_maps:T.ShaderChunk.normal_fragment_maps.replace(/texture2D\( normalMap, vNormalMapUv \)/g,'(studioIsEnd()?texture2D(studioEndNormal,vStudioEndUv):texture2D(normalMap,vStudioUv))')};
  for(const [chunk,text]of Object.entries(replacements)){const token='#include <'+chunk+'>';if(!shader.fragmentShader.includes(token))throw Error('Studio PBR shader contract changed: '+chunk);shader.fragmentShader=shader.fragmentShader.replace(token,text);}
 };
 return material;
}
function notify(options){try{if(typeof options==='function')options();else options.onReady?.();}catch(error){g.console?.error(error);}}
function apply(T,group,product,options={}){
 const finish=finishFor(product);if(!finish)return null;const previous=states.get(group);if(previous?.evidence.finish===finish)return previous;
 const bundle=acquireFinish(T,finish,typeof options==='object'?options:{}),owned=new Set(),materialsByPart=new Map(),priorReady=group.userData.materialReady||Promise.resolve(true),priorDispose=group.userData.disposeProduct;let alive=true,disposed=false,originalDisposed=false,nativeReady=false,generation=0;
 const evidence={colourAuthority:g.SomassStudioFinishPolicy.id,version:VERSION,productId:product.id,finish,modelWidthCm:Number(product.w),geometryProvenance:'Local console160 concept derived from native TV210 CAD; not an official unchanged console CAD',sourceParts:27,woodParts:25,hardwareParts:2,sourceMeshSha256:CONFIG.sourceMeshSha256,sourceGeometryAndUVUnchanged:false,currentGeometryBuffersUnchangedByMaterials:true,sourceGroupsUnchanged:true,physicalRepeatCm:60,endgrainRepeatCm:10,mapChannels:['BaseColor','NormalGL','Roughness'],normalScale:1,roughnessMultiplier:1,metalness:0,displacementApplied:false,manufacturerPBR:false,sourcePalette:finish==='dark'?'dark10-oak-v9':'light-oak-v7'};
 group.userData.studioMaterials=evidence;
 let current=settings(finish,typeof options==='object'?options:{}),appliedStateKey=null,requestedStateKey=null;
 const sourceReady=Promise.resolve(priorReady).then(value=>{nativeReady=value!==false;return nativeReady;});
 function materialIds(state){return [...new Set([CONFIG.finishes[finish].endgrain,...Array.from(assignments(finish,state).values(),entry=>entry.id)])];}
 function commit(state,key,request){
  if(!alive||request!==generation)return false;
  if(!nativeReady||group.userData.geometryLoadStatus!=='ready')throw Error('Watkins console160 geometry failed before studio materials.');
  const meshes=validate(group,product),assigned=assignments(finish,state),definitions=partsFor(product),prepared=[];
  try{for(const mesh of meshes){const part=partFor(mesh),assignment=assigned.get(numberFor(part));if(assignment)prepared.push({mesh,part,material:makeMaterial(T,part,assignment,bundle,finish,state)});}if(prepared.length!==25)throw Error('Exactly 25 derived wood parts must receive studio materials.');}
  catch(error){for(const entry of prepared)entry.material.dispose();throw error;}
  for(const{mesh,part,material}of prepared){const old=materialsByPart.get(part.id);owned.add(material);materialsByPart.set(part.id,material);mesh.material=material;mesh.userData.studioMaterial=material.userData.studioMaterials;if(old&&owned.delete(old))old.dispose();}
  previous?.dispose();appliedStateKey=key;evidence.toneRGBLinear=state.toneRGB.slice();evidence.roughnessControl=state.roughness;evidence.reliefControl=state.relief;evidence.assignmentLoading=false;delete evidence.assignmentError;
  group.userData.materialStatus='ready';group.userData.studioMaterialStatus='ready';delete group.userData.studioMaterialError;group.userData.modelEvidence={...group.userData.modelEvidence,studioMaterialTransfer:evidence};notify(options);return true;
 }
 function failed(error,request){
  if(!alive||request!==generation)return false;
  evidence.assignmentLoading=false;evidence.assignmentError=String(error?.message||error);
  // An optional swatch must never blank the currently visible, valid material.
  if(appliedStateKey===null){group.userData.materialStatus='error';group.userData.studioMaterialStatus='error';group.userData.studioMaterialError=evidence.assignmentError;}
  notify(options);return false;
 }
 function requestState(state,key){
  const request=++generation,ids=materialIds(state);requestedStateKey=key;
  if(appliedStateKey===key){evidence.assignmentLoading=false;delete evidence.assignmentError;return Promise.resolve(true);}
  if(nativeReady&&bundle.readyFor(ids)){try{return Promise.resolve(commit(state,key,request));}catch(error){return Promise.resolve(failed(error,request));}}
  evidence.assignmentLoading=true;
  return Promise.all([sourceReady,bundle.ensure(ids)]).then(([sourceOK,mapsOK])=>{if(!alive||request!==generation)return false;if(!sourceOK)throw Error('Watkins console160 base materials failed.');if(!mapsOK)throw Error(bundle.entries.find(entry=>entry.error)?.error||'Watkins studio maps not ready.');return commit(state,key,request);}).catch(error=>failed(error,request));
 }
 const controller={evidence,ready:null,update(next={}){
  if(!alive)return false;const state=settings(finish,next),key=stateKey(finish,state);
  if(key===requestedStateKey&&(evidence.assignmentLoading||key===appliedStateKey))return false;
  current=state;controller.ready=requestState(current,key);group.userData.materialReady=controller.ready.then(ok=>ok||(alive&&appliedStateKey!==null));return true;
 },dispose(){if(disposed)return;disposed=true;alive=false;generation++;bundle.dispose();for(const material of owned)material.dispose();owned.clear();materialsByPart.clear();if(states.get(group)===controller)states.delete(group);}};states.set(group,controller);
 group.userData.disposeProduct=function(){if(originalDisposed)return;originalDisposed=true;controller.dispose();priorDispose?.call(group.userData);};
 controller.ready=requestState(current,stateKey(finish,current));
 group.userData.materialReady=controller.ready;return controller;
}
const api={version:VERSION,canHandle,apply,toneFor,controllerFor:group=>states.get(group)||null,config:CONFIG,cacheInfo:()=>Array.from(texturePool.values(),entry=>({url:entry.url,channel:entry.channel,refs:entry.refs,error:entry.error,imageProcessingExcluded:!!entry.imageProcessingExcluded}))};
g.SomassWatkinsConsole160StudioMaterials=api;
})(typeof window!=='undefined'?window:globalThis);
