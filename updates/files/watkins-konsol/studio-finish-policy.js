/* One colour authority for the shared generated oak material bank.
 * Photograph lighting is reference evidence, never a per-product albedo gain.
 * Grain selection, UV scale, end grain and protected non-oak finishes remain
 * the responsibility of the exact product adapter. Explicit editor changes
 * are retained, and applied once to both long grain and end grain.
 */
(function(g){
 'use strict';
 const id='shared-native-oak-v1';
 function gain(control=[1,1,1]){
  if(!Array.isArray(control)||control.length!==3||!control.every(value=>Number.isFinite(value)&&value>0&&value<4))throw Error('Shared oak colour requires three finite positive linear multipliers below4.');
  return control.slice();
 }
 function defaultGain(){return [1,1,1];}
 g.SomassStudioFinishPolicy=Object.freeze({id,version:'2026-11-13-v1',gain,defaultGain,authority:'Native shared BaseColor maps; no SKU, photo, tabletop or role colour normalisation',manufacturerMeasuredPBR:false});
})(typeof window!=='undefined'?window:globalThis);
