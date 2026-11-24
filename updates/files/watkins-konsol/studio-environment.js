/* Neutral generated studio IBL. No manufacturer HDR/room reflection is claimed. */
(function(g){'use strict';
 const live=new WeakMap();
 function attach(T,renderer,scene){
  if(live.has(scene))return live.get(scene);
  const studio=new T.Scene(),geometries=new Set(),materials=new Set();
  studio.background=new T.Color().setScalar(.12);
  function box(size,position,radiance,inside){
   const geometry=new T.BoxGeometry(...size),material=new T.MeshBasicMaterial({color:new T.Color().setScalar(radiance),side:inside?T.BackSide:T.FrontSide});
   const mesh=new T.Mesh(geometry,material);mesh.position.set(...position);studio.add(mesh);geometries.add(geometry);materials.add(material);return mesh;
  }
  box([30,20,30],[0,5,0],.12,true);
  box([9,.06,13],[-2,14.9,0],2.1,false);
  box([.06,9,5],[-14.9,6,4],2.6,false);
  box([.06,7,7],[14.9,5,-3],1.15,false);
  box([5,6,.06],[2,5,14.9],.8,false);
  box([30,.05,30],[0,-4.9,0],.035,false);
  const pmrem=new T.PMREMGenerator(renderer),prior=scene.environment;
  let target;
  try{target=pmrem.fromScene(studio,.025,.1,100);scene.environment=target.texture;}
  finally{pmrem.dispose();geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());}
  scene.userData.somassEnvironment={kind:'generated-neutral-studio',revision:'studio-ibl-v1',manufacturerHDR:false,actualRoomProbe:false};
  let disposed=false;
  const api={texture:target.texture,dispose(){if(disposed)return;disposed=true;if(scene.environment===target.texture)scene.environment=prior;target.dispose();live.delete(scene);}};
  live.set(scene,api);return api;
 }
 g.SomassStudioEnvironment={attach,version:'studio-ibl-v1'};
})(typeof window!=='undefined'?window:globalThis);
